import os
import re
import time

import httpx
from fastapi import HTTPException
from openai import OpenAI, OpenAIError
from dotenv import load_dotenv

from app.models.question import Question
from app.metrics import AI_GENERATION_DURATION, AI_GENERATION_ERRORS

DEFAULT_MODEL = "gpt-5.5"
DEFAULT_OLLAMA_MODEL = "llama3.2:1b"
DEFAULT_OLLAMA_TIMEOUT = 15

load_dotenv()


def build_interview_prompt(question: Question | None, user_answer: str, history: list):
    question_text = question.question_text if question else "No question was provided."
    expected_answer = (question.expected_answer if question else "No expected answer was provided.")[:900]
    difficulty = question.difficulty if question else "unknown"
    field = question.field if question else "general"

    formatted_history = "\n".join(
        f"{message.role}: {message.text}"
        for message in history[-8:]
    )

    return f"""
You are an AI interview coach.

Your job:
- Reply like a helpful interviewer.
- Evaluate the candidate's answer.
- Use the expected answer as private guidance, not as text to copy.
- Give concise feedback in 80 words maximum.
- Ask at most one useful follow-up question.
- If the candidate's answer is very short, ask them to expand using STAR: Situation, Task, Action, Result.

Interview context:
Field: {field}
Difficulty: {difficulty}

Question:
{question_text}

Expected answer guide:
{expected_answer}

Recent chat:
{formatted_history}

Candidate answer:
{user_answer}
""".strip()


def estimate_score(question: Question | None, user_answer: str):
    answer = user_answer.strip()
    normalized_answer = answer.lower()

    weak_answers = {
        "hi",
        "hello",
        "hey",
        "test",
        "ok",
        "okay",
        "idk",
        "i don't know",
        "i dont know",
        "i do not know",
        "je ne sais pas",
        "jsp",
        "no idea",
        "not sure",
        "aucune idee",
        "aucune idée",
    }

    if normalized_answer in weak_answers:
        return 0

    if len(answer) < 15:
        return 0

    if len(answer) < 30:
        return 30

    expected_answer = (question.expected_answer if question else "").lower()
    expected_words = {
        word
        for word in re.findall(r"[a-zA-Z]{5,}", expected_answer)
        if word not in {"about", "their", "there", "which", "would", "could", "should"}
    }
    answer_words = set(re.findall(r"[a-zA-Z]{5,}", answer.lower()))

    if not expected_words:
        overlap_score = 30
    else:
        overlap = len(expected_words & answer_words)
        overlap_score = min(45, overlap * 5)

    structure_score = 15 if len(answer.split()) >= 45 else 5
    clarity_score = 20 if "." in answer or "," in answer else 10

    return max(0, min(100, 25 + overlap_score + structure_score + clarity_score))


def build_short_answer_feedback(question: Question | None, user_answer: str, score: int):
    question_text = question.question_text if question else "the question"

    if score == 0:
        return (
            "This answer is too short to evaluate. I saved it with a score of 0. "
            "For the next question, try to give at least one clear idea or example."
        )

    return (
        f"Good start. Your answer addresses part of the question, but it needs more depth. "
        f"To improve it, explain why your point matters for: {question_text} "
        "Then add one concrete example and a short conclusion."
    )


def build_local_interview_feedback(question: Question | None, user_answer: str, score: int):
    question_text = question.question_text if question else "the interview question"

    if score == 0 or len(user_answer.split()) < 25:
        return build_short_answer_feedback(question, user_answer, score)

    if score >= 80:
        return (
            "Strong answer. You gave a clear explanation and connected it to the question. "
            "To make it even better, add one concrete example and finish with a short result or impact."
        )

    if score >= 55:
        return (
            "Good start. Your answer is relevant, but it needs more precision. "
            f"Focus directly on this question: {question_text} "
            "Then explain one example and the result in two or three sentences."
        )

    return (
        "Your answer is understandable, but it is still too general. "
        "Try to structure it with one clear idea, one example, and one conclusion."
    )


def build_final_report_prompt(answers: list):
    answer_blocks = "\n\n".join(
        f"Question: {item['question']}\nCandidate answer: {item['answer']}\nScore: {item['score']}\nFeedback: {item['feedback']}"
        for item in answers
    )

    return f"""
You are an AI interview coach.
Generate a concise final interview report.
Include:
- overall performance
- strengths
- areas to improve
- 3 concrete recommendations

Interview answers:
{answer_blocks}
""".strip()


def build_local_final_report(answers: list):
    scores = [item.get("score") or 0 for item in answers]
    average = sum(scores) / len(scores) if scores else 0

    if average >= 80:
        performance = "Overall performance was strong, with relevant and well-structured answers."
    elif average >= 55:
        performance = "Overall performance was satisfactory, but several answers need more precision and depth."
    else:
        performance = "Overall performance needs improvement, especially in answer structure and supporting examples."

    return (
        f"{performance} The average score was {average:.1f}/100. "
        "Strengths: the candidate attempted the interview questions and communicated clear ideas. "
        "Areas to improve: answer more directly, use concrete examples, and explain the result of each action. "
        "Recommendations: structure answers with STAR, review the target domain, and practise concise timed responses."
    )


def generate_openai_reply(prompt: str):
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key or api_key == "replace_with_your_openai_api_key":
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured. Add your real OpenAI API key in backend/.env and restart the backend."
        )

    client = OpenAI()

    started_at = time.perf_counter()
    try:
        response = client.responses.create(
            model=os.getenv("OPENAI_MODEL", DEFAULT_MODEL),
            input=prompt
        )
    except OpenAIError as error:
        AI_GENERATION_ERRORS.labels("openai").inc()
        raise HTTPException(
            status_code=503,
            detail=f"OpenAI API error: {error}"
        )

    finally:
        AI_GENERATION_DURATION.labels("openai").observe(time.perf_counter() - started_at)

    return response.output_text


def generate_ollama_reply(prompt: str):
    ollama_url = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)
    ollama_timeout = int(os.getenv("OLLAMA_TIMEOUT", DEFAULT_OLLAMA_TIMEOUT))

    started_at = time.perf_counter()
    try:
        response = httpx.post(
            f"{ollama_url}/api/generate",
            json={
                "model": ollama_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_predict": 60,
                    "num_ctx": 768
                }
            },
            timeout=ollama_timeout
        )
        response.raise_for_status()
    except httpx.ConnectError:
        AI_GENERATION_ERRORS.labels("ollama").inc()
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running. Install Ollama, run `ollama pull llama3.2:1b`, then start Ollama."
        )
    except httpx.HTTPStatusError as error:
        AI_GENERATION_ERRORS.labels("ollama").inc()
        raise HTTPException(
            status_code=503,
            detail=f"Ollama API error: {error.response.text}"
        )
    except httpx.HTTPError as error:
        AI_GENERATION_ERRORS.labels("ollama").inc()
        raise HTTPException(
            status_code=503,
            detail=f"Ollama connection error: {error}"
        )

    finally:
        AI_GENERATION_DURATION.labels("ollama").observe(time.perf_counter() - started_at)

    return response.json().get("response", "I could not generate a response.")


def generate_interview_reply(question: Question | None, user_answer: str, history: list):
    prompt = build_interview_prompt(
        question=question,
        user_answer=user_answer,
        history=history
    )

    provider = os.getenv("AI_PROVIDER", "ollama").lower()

    if provider == "openai":
        return generate_openai_reply(prompt)

    if provider == "ollama":
        return generate_ollama_reply(prompt)

    raise HTTPException(
        status_code=503,
        detail=f"Unsupported AI_PROVIDER: {provider}"
    )


def generate_final_report(answers: list):
    prompt = build_final_report_prompt(answers)
    provider = os.getenv("AI_PROVIDER", "ollama").lower()

    if provider == "openai":
        return generate_openai_reply(prompt)

    if provider == "ollama":
        return generate_ollama_reply(prompt)

    raise HTTPException(
        status_code=503,
        detail=f"Unsupported AI_PROVIDER: {provider}"
    )

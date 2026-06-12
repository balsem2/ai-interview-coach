import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

import { AppShell, Icon } from "../components/AppShell";
import { getQuestionFields, getRandomQuestion, sendChatMessage, startInterviewSession } from "../services/api";

function AnalysisRow({ icon, label, value, width }) {
  return (
    <div className="analysis-row">
      <div>
        <span><Icon name={icon} /> {label}</span>
        <strong>{value}</strong>
      </div>
      <div className="progress-track">
        <span style={{ width }} />
      </div>
    </div>
  );
}

const emptyFaceMetrics = {
  eyeContact: 0,
  confidence: 0,
  engagement: 0,
  stability: 0
};

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

const scoreLabel = (score) => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 35) return "Needs focus";
  return "Low";
};

const questionCountByDuration = {
  15: 5,
  30: 10,
  45: 15,
  60: 20
};

function InterviewRoom({ onNavigate }) {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const previousFaceRef = useRef(null);
  const autoAdvanceRef = useRef(false);
  const faceLandmarkerRef = useRef(null);
  const faceLandmarkerPromiseRef = useRef(null);
  const [question, setQuestion] = useState(null);
  const [questionError, setQuestionError] = useState("");
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [responseText, setResponseText] = useState("");
  const [isSendingResponse, setIsSendingResponse] = useState(false);
  const [score, setScore] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [hasAnsweredCurrentQuestion, setHasAnsweredCurrentQuestion] = useState(false);
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [interviewSessionId, setInterviewSessionId] = useState(null);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [faceStatus, setFaceStatus] = useState("Camera off");
  const [faceMetrics, setFaceMetrics] = useState(emptyFaceMetrics);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [questionElapsedSeconds, setQuestionElapsedSeconds] = useState(0);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      text: "Hello! I'm your AI interview assistant. Let's begin with your first question."
    }
  ]);

  const loadQuestion = useCallback((filters = {}) => {
    setIsLoadingQuestion(true);
    setQuestionError("");
    setScore(null);
    setHasAnsweredCurrentQuestion(false);

    getRandomQuestion(filters)
      .then((data) => {
        setQuestion(data);
        setQuestionError("");
        setMessages([
          {
            id: 1,
            role: "assistant",
            text: "Hello! I'm your AI interview assistant. Let's begin with your first question."
          },
          {
            id: 2,
            role: "assistant",
            text: data.question_text || data.question
          }
        ]);
      })
      .catch((error) => {
        console.error(error);
        setQuestionError("Unable to load a question from the dataset.");
      })
      .finally(() => {
        setIsLoadingQuestion(false);
      });
  }, []);

  const getFaceLandmarker = useCallback(async () => {
    if (faceLandmarkerRef.current) {
      return faceLandmarkerRef.current;
    }

    if (!faceLandmarkerPromiseRef.current) {
      faceLandmarkerPromiseRef.current = FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      )
        .then((vision) => FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 1
        }))
        .then((landmarker) => {
          faceLandmarkerRef.current = landmarker;
          return landmarker;
        });
    }

    return faceLandmarkerPromiseRef.current;
  }, []);

  useEffect(() => {
    getQuestionFields()
      .then((data) => setFields(data.slice(0, 40)))
      .catch((error) => console.error(error));

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      recognitionRef.current?.stop();
    };
  }, []);

  const currentQuestion = question?.question_text || question?.question || "Can you tell me about a challenging project you worked on and how you overcame obstacles?";
  const interviewTitle = question?.field ? `${question.field} Interview` : "Software Engineer Interview";
  const difficulty = question?.difficulty || question?.tier;
  const totalQuestions = questionCountByDuration[selectedDuration] || 5;
  const totalInterviewSeconds = selectedDuration * 60;
  const secondsPerQuestion = Math.floor(totalInterviewSeconds / totalQuestions);
  const remainingSeconds = Math.max(totalInterviewSeconds - elapsedSeconds, 0);
  const questionRemainingSeconds = Math.max(secondsPerQuestion - questionElapsedSeconds, 0);
  const formattedElapsedTime = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  const formattedRemainingTime = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  const formattedQuestionTime = `${String(Math.floor(questionRemainingSeconds / 60)).padStart(2, "0")}:${String(questionRemainingSeconds % 60).padStart(2, "0")}`;

  const handleSendResponse = async (e) => {
    e.preventDefault();

    const trimmedResponse = responseText.trim();

    if (!trimmedResponse) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: "user",
      text: trimmedResponse
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setResponseText("");

    try {
      setIsSendingResponse(true);
      let activeSessionId = interviewSessionId;

      if (!activeSessionId) {
        const session = await startInterviewSession({
          field: selectedField || question?.field,
          difficulty: selectedDifficulty || difficulty
        });
        activeSessionId = session.interview_session_id;
        setInterviewSessionId(activeSessionId);
      }

      const aiResponse = await sendChatMessage({
        interview_session_id: activeSessionId,
        question_id: question?.id,
        answer: trimmedResponse,
        history: messages
      });

      setScore(aiResponse.score);
      setInterviewSessionId(aiResponse.interview_session_id || activeSessionId);
      setHasAnsweredCurrentQuestion(true);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: aiResponse.reply
        }
      ]);
    } catch (error) {
      console.error(error);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: error.message || "I could not generate an AI response. Check the backend API key."
        }
      ]);
    } finally {
      setIsSendingResponse(false);
    }
  };

  const goToNextQuestion = useCallback(({ allowSkip = false } = {}) => {
    if (!allowSkip && !hasAnsweredCurrentQuestion) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now(),
          role: "assistant",
          text: "Please answer the current question first. If you do not know, you can type 'idk' and it will be saved with a score of 0."
        }
      ]);
      return;
    }

    if (allowSkip && !hasAnsweredCurrentQuestion) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now(),
          role: "assistant",
          text: "Time is up. This question was skipped and we are moving to the next one."
        }
      ]);
    }

    if (questionNumber >= totalQuestions) {
      onNavigate("report");
      return;
    }

    setQuestionNumber((currentNumber) => currentNumber + 1);
    setQuestionElapsedSeconds(0);
    setResponseText("");
    autoAdvanceRef.current = false;
    recognitionRef.current?.stop();
    loadQuestion({
      field: selectedField,
      difficulty: selectedDifficulty
    });
  }, [
    hasAnsweredCurrentQuestion,
    loadQuestion,
    onNavigate,
    questionNumber,
    selectedDifficulty,
    selectedField,
    totalQuestions
  ]);

  const handleNextQuestion = () => {
    goToNextQuestion();
  };

  useEffect(() => {
    if (!isInterviewStarted) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setElapsedSeconds((currentSeconds) => {
        const nextSeconds = currentSeconds + 1;

        if (nextSeconds >= totalInterviewSeconds) {
          window.clearInterval(timerId);
          onNavigate("report");
        }

        return nextSeconds;
      });

      setQuestionElapsedSeconds((currentSeconds) => {
        const nextSeconds = currentSeconds + 1;

        if (nextSeconds >= secondsPerQuestion && !autoAdvanceRef.current) {
          autoAdvanceRef.current = true;
          window.setTimeout(() => goToNextQuestion({ allowSkip: true }), 0);
        }

        return Math.min(nextSeconds, secondsPerQuestion);
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [goToNextQuestion, isInterviewStarted, onNavigate, secondsPerQuestion, totalInterviewSeconds]);

  const handleToggleCamera = async () => {
    if (isCameraOn) {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (overlayRef.current) {
        overlayRef.current.getContext("2d")?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      }
      previousFaceRef.current = null;
      setFaceMetrics(emptyFaceMetrics);
      setIsCameraOn(false);
      setFaceStatus("Camera off");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsCameraOn(true);
      setCameraError("");
      setFaceStatus("Camera active");
    } catch (error) {
      console.error(error);
      setCameraError("Camera permission denied or unavailable.");
      setFaceStatus("Camera unavailable");
    }
  };

  const handleToggleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    let finalTranscript = "";

    recognition.onstart = () => {
      setSpeechError("");
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;

        if (event.results[index].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const spokenText = `${finalTranscript} ${interimTranscript}`.trim();

      if (spokenText) {
        setResponseText(spokenText);
      }
    };

    recognition.onerror = (event) => {
      setSpeechError(`Voice input error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => {
    if (!isCameraOn || !videoRef.current) {
      return undefined;
    }

    let isCancelled = false;
    let lastVideoTime = -1;

    const drawFaceBox = (box, videoWidth, videoHeight) => {
      const canvas = overlayRef.current;
      if (!canvas) {
        return;
      }

      canvas.width = videoWidth;
      canvas.height = videoHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.lineWidth = 4;
      context.strokeStyle = "#7c5cf3";
      context.fillStyle = "rgba(124, 92, 243, 0.16)";
      context.beginPath();
      context.roundRect(box.x, box.y, box.width, box.height, 16);
      context.fill();
      context.stroke();
    };

    const clearFaceBox = () => {
      const canvas = overlayRef.current;
      const context = canvas?.getContext("2d");
      if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const updateMetricsFromBox = (face, videoWidth, videoHeight) => {
      const centerX = (face.x + face.width / 2) / videoWidth;
      const centerY = (face.y + face.height / 2) / videoHeight;
      const centerDistance = Math.hypot(centerX - 0.5, (centerY - 0.45) * 1.25);
      const eyeContact = clampScore(100 - centerDistance * 220);

      const faceArea = (face.width * face.height) / (videoWidth * videoHeight);
      const sizeScore = clampScore(100 - Math.abs(faceArea - 0.18) * 260);

      const previousFace = previousFaceRef.current;
      const movement = previousFace
        ? Math.hypot(
            (face.x - previousFace.x) / videoWidth,
            (face.y - previousFace.y) / videoHeight
          )
        : 0;

      const stability = clampScore(100 - movement * 420);
      const confidence = clampScore(eyeContact * 0.45 + sizeScore * 0.25 + stability * 0.3);
      const engagement = clampScore(eyeContact * 0.5 + stability * 0.3 + 20);

      previousFaceRef.current = face;
      drawFaceBox(face, videoWidth, videoHeight);
      setFaceMetrics({ eyeContact, confidence, engagement, stability });
      setFaceStatus("Face detected");
    };

    const markNoFace = () => {
      clearFaceBox();
      previousFaceRef.current = null;
      setFaceMetrics((currentMetrics) => ({
        eyeContact: clampScore(currentMetrics.eyeContact * 0.7),
        confidence: clampScore(currentMetrics.confidence * 0.7),
        engagement: clampScore(currentMetrics.engagement * 0.7),
        stability: clampScore(currentMetrics.stability * 0.7)
      }));
      setFaceStatus("No face detected");
    };

    setFaceStatus("Loading face analysis...");

    const intervalId = window.setInterval(async () => {
      if (!videoRef.current) {
        return;
      }

      const video = videoRef.current;
      const videoWidth = video.videoWidth || 0;
      const videoHeight = video.videoHeight || 0;

      if (!videoWidth || !videoHeight || video.readyState < 2 || video.currentTime === lastVideoTime) {
        return;
      }

      lastVideoTime = video.currentTime;

      try {
        const landmarker = await getFaceLandmarker();

        if (isCancelled) {
          return;
        }

        const result = landmarker.detectForVideo(video, performance.now());
        const landmarks = result.faceLandmarks?.[0];

        if (!landmarks?.length) {
          markNoFace();
          return;
        }

        const minX = Math.min(...landmarks.map((point) => point.x)) * videoWidth;
        const maxX = Math.max(...landmarks.map((point) => point.x)) * videoWidth;
        const minY = Math.min(...landmarks.map((point) => point.y)) * videoHeight;
        const maxY = Math.max(...landmarks.map((point) => point.y)) * videoHeight;
        const paddingX = (maxX - minX) * 0.14;
        const paddingY = (maxY - minY) * 0.18;

        updateMetricsFromBox(
          {
            x: Math.max(0, minX - paddingX),
            y: Math.max(0, minY - paddingY),
            width: Math.min(videoWidth, maxX + paddingX) - Math.max(0, minX - paddingX),
            height: Math.min(videoHeight, maxY + paddingY) - Math.max(0, minY - paddingY)
          },
          videoWidth,
          videoHeight
        );
      } catch (error) {
        console.error(error);
        clearFaceBox();
        setFaceStatus("Face analysis failed to load");
      }
    }, 500);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [getFaceLandmarker, isCameraOn]);

  const handleApplyFilters = () => {
    setQuestionNumber(1);
    setElapsedSeconds(0);
    setQuestionElapsedSeconds(0);
    setInterviewSessionId(null);
    autoAdvanceRef.current = false;
    setIsInterviewStarted(true);

    loadQuestion({
      field: selectedField,
      difficulty: selectedDifficulty
    });
  };

  if (!isInterviewStarted) {
    return (
      <AppShell active="interview" onNavigate={onNavigate}>
        <section className="setup-screen">
          <article className="card setup-card">
            <h1>Interview Setup</h1>
            <label>
              Domain
              <select value={selectedField} onChange={(e) => setSelectedField(e.target.value)}>
                <option value="">Any domain</option>
                {fields.map((field) => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
            </label>
            <label>
              Difficulty
              <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)}>
                <option value="">Any difficulty</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label>
              Duration
              <select value={selectedDuration} onChange={(e) => setSelectedDuration(Number(e.target.value))}>
                <option value={15}>15 minutes - 5 questions</option>
                <option value={30}>30 minutes - 10 questions</option>
                <option value={45}>45 minutes - 15 questions</option>
                <option value={60}>1 hour - 20 questions</option>
              </select>
            </label>
            <button type="button" onClick={handleApplyFilters}>Apply</button>
          </article>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell active="interview" onNavigate={onNavigate}>
      <div className="interview-topbar">
        <div>
          <h1>{interviewTitle}</h1>
          <p>Question {questionNumber} of {totalQuestions}</p>
        </div>
        <div className="interview-actions">
          {score !== null && <span className="timer">Score {score}/100</span>}
          <span className="timer"><Icon name="clock" /> {formattedElapsedTime}</span>
          <span className="timer">Left {formattedRemainingTime}</span>
          <span className="timer">Question {formattedQuestionTime}</span>
          <button type="button" onClick={handleNextQuestion}>
            {questionNumber >= totalQuestions ? "View Report" : "Next Question"}
          </button>
          <button type="button" onClick={() => onNavigate("report")}>End Interview</button>
        </div>
      </div>

      <section className="interview-layout">
        <div className="interview-left">
          <article className="card video-card">
            <div className="video-preview">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={isCameraOn ? "camera-video active" : "camera-video"}
              />
              <canvas
                ref={overlayRef}
                className={isCameraOn ? "face-overlay active" : "face-overlay"}
                aria-hidden="true"
              />
              {!isCameraOn && <Icon name="video" />}
              <span>You</span>
            </div>
            <p className="camera-status">{cameraError || faceStatus}</p>
            {speechError && <p className="camera-status speech-error">{speechError}</p>}
            <div className="media-controls">
              <button
                className={isListening ? "active-control" : ""}
                type="button"
                aria-label="Toggle microphone"
                onClick={handleToggleMic}
              >
                <Icon name="mic" />
              </button>
              <button type="button" aria-label="Toggle camera" onClick={handleToggleCamera}><Icon name="video" /></button>
            </div>
          </article>

          <article className="card live-card">
            <h2>Live Analysis</h2>
            <AnalysisRow
              icon="eye"
              label="Eye Contact"
              value={isCameraOn ? `${scoreLabel(faceMetrics.eyeContact)} (${faceMetrics.eyeContact}%)` : "Camera off"}
              width={`${faceMetrics.eyeContact}%`}
            />
            <AnalysisRow
              icon="smile"
              label="Confidence"
              value={isCameraOn ? `${scoreLabel(faceMetrics.confidence)} (${faceMetrics.confidence}%)` : "Camera off"}
              width={`${faceMetrics.confidence}%`}
            />
            <AnalysisRow
              icon="pulse"
              label="Engagement"
              value={isCameraOn ? `${scoreLabel(faceMetrics.engagement)} (${faceMetrics.engagement}%)` : "Camera off"}
              width={`${faceMetrics.engagement}%`}
            />
          </article>

          <article className="card progress-card">
            <h2>Interview Progress</h2>
            {Array.from({ length: totalQuestions }, (_, index) => index + 1).map((step) => (
              <div className="step-row" key={step}>
                <span className={step === questionNumber ? "active" : step < questionNumber ? "done" : ""}>{step}</span>
                <div>
                  <strong>Question {step}</strong>
                  {step === questionNumber && <em>In Progress</em>}
                  {step < questionNumber && <em>Completed</em>}
                </div>
              </div>
            ))}
          </article>
        </div>

        <div className="interview-main">
          <article className="card assistant-card">
            <header>
              <h2>AI Interview Assistant</h2>
            </header>
            <div className="chat-area">
              {isLoadingQuestion && <p className="message assistant">Loading question...</p>}
              {!isLoadingQuestion && messages.map((message) => (
                <p className={`message ${message.role}`} key={message.id}>
                  {message.text}
                </p>
              ))}
            </div>
            <form className="response-box" onSubmit={handleSendResponse}>
              <textarea
                placeholder={isSendingResponse ? "AI is thinking..." : "Type your response..."}
                value={responseText}
                disabled={isSendingResponse}
                onChange={(e) => setResponseText(e.target.value)}
              />
              <button
                className={isListening ? "dictate-button active-control" : "dictate-button"}
                type="button"
                onClick={handleToggleMic}
                disabled={isSendingResponse}
                aria-label={isListening ? "Stop dictation" : "Start dictation"}
              >
                <Icon name="mic" />
              </button>
              <button type="submit" aria-label="Send response" disabled={isSendingResponse}>
                <Icon name="send" />
              </button>
            </form>
          </article>

          <article className="question-card">
            <div className="question-title">
              <span><Icon name="pulse" /></span>
              <div>
                <strong>Current Question</strong>
                <p>{isLoadingQuestion ? "Loading question..." : currentQuestion}</p>
              </div>
            </div>
            <div className="tip-box">
              <strong>Tip:</strong> {difficulty ? `${difficulty} level - ` : ""}Structure your answer using the STAR method (Situation, Task, Action, Result)
            </div>
            {questionError && <p className="question-error">{questionError}</p>}
          </article>
        </div>
      </section>
    </AppShell>
  );
}

export default InterviewRoom;


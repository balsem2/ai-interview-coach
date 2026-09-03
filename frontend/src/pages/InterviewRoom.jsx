import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

import { AppShell, Icon } from "../components/AppShell";
import { EnhancedMetricsDisplay } from "../components/EnhancedMetrics";
import {
  completeInterviewSession,
  getQuestionFields,
  getRandomQuestion,
  sendChatMessage,
  skipInterviewQuestion,
  startInterviewSession
} from "../services/api";
import {
  calculateEnhancedEyeContact,
  analyzePosture,
  analyzeFacialExpression,
  assessLighting,
  generateFeedback,
  calculateOverallQualityScore
} from "../utils/facialAnalysis";

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

const questionCountByDuration = {
  15: 5,
  30: 10,
  45: 15,
  60: 20
};

const mediapipeWasmUrl = import.meta.env.VITE_MEDIAPIPE_WASM_URL
  || "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const mediapipeModelUrl = import.meta.env.VITE_MEDIAPIPE_MODEL_URL
  || "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

function InterviewRoom({ onNavigate }) {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const previousFaceRef = useRef(null);
  const autoAdvanceRef = useRef(false);
  const advanceAfterAnswerRef = useRef(false);
  const faceLandmarkerRef = useRef(null);
  const faceLandmarkerPromiseRef = useRef(null);
  const faceMetricTotalsRef = useRef({ eyeContact: 0, confidence: 0, engagement: 0, count: 0 });
  const seenQuestionIdsRef = useRef(new Set());
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
  const [speechLanguage, setSpeechLanguage] = useState("en-US");
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null);
  const isTtsEnabledRef = useRef(true);
  isTtsEnabledRef.current = isTtsEnabled;
  const [interviewSessionId, setInterviewSessionId] = useState(null);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [faceStatus, setFaceStatus] = useState("Camera off");
  const [enhancedMetrics, setEnhancedMetrics] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [qualityScore, setQualityScore] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [questionElapsedSeconds, setQuestionElapsedSeconds] = useState(0);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      text: "Hello! I'm your AI interview assistant. Here is your interview question."
    }
  ]);

  const currentAudioRef = useRef(null);
  const utteranceRef = useRef(null);

  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch (e) {
        console.warn("Audio stop warning:", e);
      }
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn("Speech cancel warning:", e);
      }
    }
    setIsSpeaking(false);
    setCurrentlySpeakingId(null);
  }, []);

  const playWebSpeechFallback = useCallback((cleanText, messageId, lang) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utteranceRef.current = utterance;
      utterance.lang = lang || "en-US";
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setCurrentlySpeakingId(messageId);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentlySpeakingId(null);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setCurrentlySpeakingId(null);
      };

      setTimeout(() => {
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      }, 50);
    } catch (e) {
      console.warn("Fallback speech failed:", e);
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    }
  }, []);

  const speakText = useCallback((text, messageId = null, lang = speechLanguage) => {
    if (!text) return;

    stopSpeaking();

    // Clean text of markdown, URLs, and code
    const cleanText = text
      .replace(/[*_#`[\]()]/g, " ")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return;

    // 1. Play high quality MP3 Audio via backend TTS
    try {
      const targetLang = (lang || "en").split("-")[0].toLowerCase();
      const audioUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&lang=${encodeURIComponent(targetLang)}`;
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        setCurrentlySpeakingId(messageId);
      };

      audio.onended = () => {
        setIsSpeaking(false);
        setCurrentlySpeakingId(null);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        console.warn("Backend TTS stream failed, attempting browser Web Speech fallback");
        currentAudioRef.current = null;
        playWebSpeechFallback(cleanText, messageId, lang);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Audio play prevented, fallback to Web Speech:", err);
          playWebSpeechFallback(cleanText, messageId, lang);
        });
      }
    } catch (err) {
      console.warn("Audio construction failed, fallback to Web Speech:", err);
      playWebSpeechFallback(cleanText, messageId, lang);
    }
  }, [playWebSpeechFallback, speechLanguage, stopSpeaking]);

  const loadQuestion = useCallback((filters = {}) => {
    setIsLoadingQuestion(true);
    setQuestionError("");
    setScore(null);
    setHasAnsweredCurrentQuestion(false);
    stopSpeaking();

    getRandomQuestion(filters)
      .then((data) => {
        if (data.id) seenQuestionIdsRef.current.add(data.id);
        setQuestion(data);
        setQuestionError("");
        const questionText = data.question_text || data.question;
        const newMessages = [
          {
            id: 1,
            role: "assistant",
            text: "Hello! I'm your AI interview assistant. Here is your interview question."
          },
          {
            id: 2,
            role: "assistant",
            text: questionText
          }
        ];
        setMessages(newMessages);

        if (isTtsEnabledRef.current && questionText) {
          window.setTimeout(() => {
            speakText(questionText, 2);
          }, 350);
        }
      })
      .catch((error) => {
        console.error(error);
        setQuestionError("Unable to load a question from the dataset.");
      })
      .finally(() => {
        setIsLoadingQuestion(false);
      });
  }, [speakText, stopSpeaking]);

  const getFaceLandmarker = useCallback(async () => {
    if (faceLandmarkerRef.current) {
      return faceLandmarkerRef.current;
    }

    if (!faceLandmarkerPromiseRef.current) {
      faceLandmarkerPromiseRef.current = FilesetResolver.forVisionTasks(
        mediapipeWasmUrl
      )
        .then((vision) => FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: mediapipeModelUrl,
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

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      recognitionRef.current?.stop();

      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const interviewTitle = question?.field ? `${question.field} Interview` : "General Interview";
  const difficulty = question?.difficulty || question?.tier;
  const totalQuestions = questionCountByDuration[selectedDuration] || 5;
  const totalInterviewSeconds = selectedDuration * 60;
  const secondsPerQuestion = Math.floor(totalInterviewSeconds / totalQuestions);
  const remainingSeconds = Math.max(totalInterviewSeconds - elapsedSeconds, 0);
  const questionRemainingSeconds = Math.max(secondsPerQuestion - questionElapsedSeconds, 0);
  const formattedElapsedTime = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  const formattedRemainingTime = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  const formattedQuestionTime = `${String(Math.floor(questionRemainingSeconds / 60)).padStart(2, "0")}:${String(questionRemainingSeconds % 60).padStart(2, "0")}`;

  const finishInterview = useCallback(async () => {
    stopSpeaking();
    if (interviewSessionId) {
      autoAdvanceRef.current = true;
      if (!hasAnsweredCurrentQuestion && question?.id) {
        try {
          await skipInterviewQuestion(interviewSessionId, question.id);
        } catch (error) {
          console.error("Unable to save final skipped question", error);
        }
      }

      const totals = faceMetricTotalsRef.current;
      const divisor = totals.count || 1;

      try {
        await completeInterviewSession(interviewSessionId, {
          eye_contact: totals.count ? Math.round(totals.eyeContact / divisor) : null,
          confidence: totals.count ? Math.round(totals.confidence / divisor) : null,
          engagement: totals.count ? Math.round(totals.engagement / divisor) : null
        });
      } catch (error) {
        console.error("Unable to complete interview session", error);
      }

      localStorage.setItem("reportSessionId", String(interviewSessionId));
    }

    onNavigate("report");
  }, [hasAnsweredCurrentQuestion, interviewSessionId, onNavigate, question?.id]);

  const handleSendResponse = async (e) => {
    e.preventDefault();

    const trimmedResponse = responseText.trim();

    if (!trimmedResponse || hasAnsweredCurrentQuestion || isSendingResponse) {
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
          difficulty: selectedDifficulty || difficulty,
          duration_minutes: selectedDuration
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
      advanceAfterAnswerRef.current = true;
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

  const goToNextQuestion = useCallback(async ({ allowSkip = false } = {}) => {
    stopSpeaking();
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
      if (interviewSessionId && question?.id) {
        try {
          await skipInterviewQuestion(interviewSessionId, question.id);
        } catch (error) {
          console.error("Unable to save skipped question", error);
        }
      }
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
      finishInterview();
      return;
    }

    setQuestionNumber((currentNumber) => currentNumber + 1);
    setQuestionElapsedSeconds(0);
    setResponseText("");
    autoAdvanceRef.current = false;
    recognitionRef.current?.stop();
    loadQuestion({
      field: selectedField,
      difficulty: selectedDifficulty,
      exclude_ids: Array.from(seenQuestionIdsRef.current)
    });
  }, [
    hasAnsweredCurrentQuestion,
    loadQuestion,
    finishInterview,
    interviewSessionId,
    questionNumber,
    question?.id,
    selectedDifficulty,
    selectedField,
    totalQuestions
  ]);

  const handleNextQuestion = () => {
    goToNextQuestion();
  };

  useEffect(() => {
    if (!hasAnsweredCurrentQuestion || !advanceAfterAnswerRef.current) {
      return;
    }

    advanceAfterAnswerRef.current = false;
    goToNextQuestion();
  }, [goToNextQuestion, hasAnsweredCurrentQuestion]);

  useEffect(() => {
    if (!isInterviewStarted) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setElapsedSeconds((currentSeconds) => {
        const nextSeconds = currentSeconds + 1;

        if (nextSeconds >= totalInterviewSeconds) {
          window.clearInterval(timerId);
          window.setTimeout(() => finishInterview(), 0);
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
  }, [finishInterview, goToNextQuestion, isInterviewStarted, secondsPerQuestion, totalInterviewSeconds]);

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
      setEnhancedMetrics(null);
      setFeedbackList([]);
      setQualityScore(null);
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
    stopSpeaking();
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
    recognition.lang = speechLanguage;
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

    const updateMetricsFromBox = (face, videoWidth, videoHeight, landmarks, videoElement) => {
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

      // Enhanced facial analysis
      let enhancedMetricsData = {
        eyeContact,
        confidence,
        engagement,
        stability
      };

      if (landmarks && landmarks.length > 0) {
        // Calculate enhanced eye contact using iris position
        const enhancedEyeContact = calculateEnhancedEyeContact(landmarks);
        enhancedMetricsData.eyeContact = (eyeContact + enhancedEyeContact) / 2;

        // Analyze posture
        const postureData = analyzePosture(landmarks);
        enhancedMetricsData.posture = postureData.posture;
        enhancedMetricsData.postureDetails = postureData;

        // Analyze facial expression
        const expressionData = analyzeFacialExpression(landmarks);
        enhancedMetricsData.expression = expressionData;

        // Assess lighting if we have video element
        if (videoElement && videoElement.readyState >= 2) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            const lightingData = assessLighting(imageData, landmarks, videoWidth, videoHeight);
            enhancedMetricsData.lighting = lightingData;
          } catch (e) {
            console.error('Error assessing lighting:', e);
          }
        }

        // Generate feedback based on metrics
        const feedback = generateFeedback(enhancedMetricsData);
        setFeedbackList(feedback);

        // Calculate overall quality score
        const qualityData = calculateOverallQualityScore(enhancedMetricsData);
        setQualityScore(qualityData);
      }

      previousFaceRef.current = face;
      drawFaceBox(face, videoWidth, videoHeight);
      setEnhancedMetrics(enhancedMetricsData);
      
      faceMetricTotalsRef.current.eyeContact += enhancedMetricsData.eyeContact;
      faceMetricTotalsRef.current.confidence += confidence;
      faceMetricTotalsRef.current.engagement += engagement;
      faceMetricTotalsRef.current.count += 1;
      setFaceStatus("Face detected");
    };

    const markNoFace = () => {
      clearFaceBox();
      previousFaceRef.current = null;
      setEnhancedMetrics(null);
      setFeedbackList([]);
      setQualityScore(null);
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
          videoHeight,
          landmarks,
          video
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

  const handleApplyFilters = async () => {
    if (isStartingInterview) return;

    // Unlock browser audio/speech on user interaction
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
      } catch (e) {
        console.warn("Speech resume warning:", e);
      }
    }

    setIsStartingInterview(true);
    setQuestionNumber(1);
    setElapsedSeconds(0);
    setQuestionElapsedSeconds(0);
    setInterviewSessionId(null);
    seenQuestionIdsRef.current = new Set();
    faceMetricTotalsRef.current = { eyeContact: 0, confidence: 0, engagement: 0, count: 0 };
    autoAdvanceRef.current = false;

    try {
      const session = await startInterviewSession({
        field: selectedField || null,
        difficulty: selectedDifficulty || null,
        duration_minutes: selectedDuration
      });
      setInterviewSessionId(session.interview_session_id);
      localStorage.setItem("reportSessionId", String(session.interview_session_id));
      setIsInterviewStarted(true);
    } catch (error) {
      console.error(error);
      setQuestionError(error.message || "Unable to start the interview.");
      setIsStartingInterview(false);
      return;
    }

    loadQuestion({
      field: selectedField,
      difficulty: selectedDifficulty
    });
    setIsStartingInterview(false);
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
            <label>
              Voice language
              <select value={speechLanguage} onChange={(e) => setSpeechLanguage(e.target.value)}>
                <option value="en-US">English</option>
                <option value="fr-FR">Français</option>
                <option value="ar-TN">العربية</option>
              </select>
            </label>
            <label className="checkbox-field" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px", cursor: "pointer", fontSize: "0.95rem" }}>
              <input
                type="checkbox"
                checked={isTtsEnabled}
                onChange={(e) => setIsTtsEnabled(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#7c5cf3", cursor: "pointer" }}
              />
              <span>Read interview questions aloud (Text-to-Speech)</span>
            </label>
            <p className="camera-status">Questions will be spoken automatically by the AI Interviewer.</p>
            <button type="button" onClick={handleApplyFilters} disabled={isStartingInterview}>
              {isStartingInterview ? "Starting..." : "Start Interview"}
            </button>
            {questionError && <p className="auth-error">{questionError}</p>}
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
          <button type="button" onClick={finishInterview}>End Interview</button>
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

          <EnhancedMetricsDisplay
            metrics={isCameraOn ? enhancedMetrics : null}
            feedback={feedbackList}
            qualityScore={qualityScore}
            isLoading={isCameraOn && !enhancedMetrics}
          />

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
            <header className="assistant-card-header">
              <div className="assistant-header-title">
                <div className="ai-avatar-badge">
                  <Icon name="sparkle" />
                </div>
                <div>
                  <h2>AI Interview Assistant</h2>
                  <div className="ai-status-indicator">
                    {isSpeaking ? (
                      <span className="speaking-badge">
                        <span className="sound-wave-bar"></span>
                        <span className="sound-wave-bar"></span>
                        <span className="sound-wave-bar"></span>
                        Speaking question...
                      </span>
                    ) : (
                      <span className="online-badge">Ready</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="assistant-header-actions">
                {isSpeaking && (
                  <button
                    type="button"
                    className="tts-btn stop-speaking-btn"
                    title="Stop voice"
                    onClick={stopSpeaking}
                  >
                    <Icon name="volumeMute" />
                    <span>Stop</span>
                  </button>
                )}
                <button
                  type="button"
                  className={`tts-btn ${isTtsEnabled ? "active-tts" : ""}`}
                  title={isTtsEnabled ? "Auto-speech is ON (click to mute)" : "Auto-speech is OFF (click to enable)"}
                  onClick={() => {
                    if (isSpeaking) stopSpeaking();
                    setIsTtsEnabled((prev) => !prev);
                  }}
                >
                  <Icon name={isTtsEnabled ? "volume" : "volumeMute"} />
                  <span>{isTtsEnabled ? "Voice ON" : "Voice OFF"}</span>
                </button>
              </div>
            </header>
            <div className="chat-area">
              {isLoadingQuestion && <p className="message assistant">Loading question...</p>}
              {!isLoadingQuestion && messages.map((message) => (
                <div key={message.id} className={`message-row ${message.role}`}>
                  <p className={`message ${message.role}`}>
                    {message.text}
                  </p>
                  {message.role === "assistant" && (
                    <button
                      type="button"
                      className={`msg-audio-btn ${currentlySpeakingId === message.id ? "active" : ""}`}
                      title={currentlySpeakingId === message.id ? "Stop voice" : "Read aloud"}
                      aria-label="Read question aloud"
                      onClick={() => {
                        if (currentlySpeakingId === message.id && isSpeaking) {
                          stopSpeaking();
                        } else {
                          speakText(message.text, message.id);
                        }
                      }}
                    >
                      <Icon name={currentlySpeakingId === message.id ? "volumeMute" : "volume"} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <form className="response-box" onSubmit={handleSendResponse}>
              <textarea
                placeholder={hasAnsweredCurrentQuestion ? "Answer submitted. Continue to the next question." : isSendingResponse ? "AI is thinking..." : "Type your response..."}
                value={responseText}
                disabled={isSendingResponse || hasAnsweredCurrentQuestion}
                onChange={(e) => setResponseText(e.target.value)}
              />
              <button
                className={isListening ? "dictate-button active-control" : "dictate-button"}
                type="button"
                onClick={handleToggleMic}
                disabled={isSendingResponse || hasAnsweredCurrentQuestion}
                aria-label={isListening ? "Stop dictation" : "Start dictation"}
              >
                <Icon name="mic" />
              </button>
              <button type="submit" aria-label="Send response" disabled={isSendingResponse || hasAnsweredCurrentQuestion}>
                <Icon name="send" />
              </button>
            </form>
          </article>

          {questionError && <p className="question-error">{questionError}</p>}
        </div>
      </section>
    </AppShell>
  );
}

export default InterviewRoom;

import { useEffect, useState } from "react";
import { AppShell, Icon } from "../components/AppShell";
import { getFinalReport } from "../services/api";
import { downloadInterviewReport } from "../utils/pdfReport";

function MiniLineChart({ answers = [] }) {
  const scores = answers.length ? answers.map((answer) => Number(answer.score) || 0) : [0];
  const points = scores.map((score, index) => {
    const x = scores.length === 1 ? 330 : 44 + index * (571 / (scores.length - 1));
    return `${x},${300 - score * 2.7}`;
  }).join(" ");

  return (
    <div className="report-line-chart">
      <svg viewBox="0 0 640 310" role="img" aria-label="Answer score timeline">
        {[0, 77, 154, 231, 308].map((y) => <line className="chart-grid" key={y} x1="44" x2="615" y1={y} y2={y} />)}
        <line className="chart-axis" x1="44" x2="615" y1="300" y2="300" />
        <line className="chart-axis" x1="44" x2="44" y1="12" y2="300" />
        <polyline className="chart-line" points={points} />
        {points.split(" ").map((point, index) => {
          const [x, y] = point.split(",").map(Number);
          return <circle className="chart-dot" key={`${point}-${index}`} cx={x} cy={y} r="5" />;
        })}
      </svg>
    </div>
  );
}

function RadarChart({ report }) {
  const values = [report?.average_score || 0, report?.confidence || 0, report?.eye_contact || 0, report?.engagement || 0, report?.average_score || 0, report?.average_score || 0];
  const radarPoints = values.map((value, index) => {
    const angle = (-90 + index * 60) * (Math.PI / 180);
    const radius = 125 * (Number(value) / 100);
    return `${180 + Math.cos(angle) * radius},${145 + Math.sin(angle) * radius}`;
  }).join(" ");

  return (
    <div className="radar-chart">
      <svg viewBox="0 0 360 290" role="img" aria-label="Skills assessment radar chart">
        <polygon className="radar-grid" points="180,20 292,82 292,206 180,270 68,206 68,82" />
        <polygon className="radar-grid" points="180,62 255,103 255,185 180,228 105,185 105,103" />
        <polygon className="radar-grid" points="180,104 218,124 218,166 180,186 142,166 142,124" />
        <line className="radar-grid" x1="180" y1="20" x2="180" y2="270" />
        <line className="radar-grid" x1="68" y1="82" x2="292" y2="206" />
        <line className="radar-grid" x1="292" y1="82" x2="68" y2="206" />
        <polygon className="radar-shape" points={radarPoints} />
        <text x="180" y="16">Response</text><text x="300" y="88">Confidence</text><text x="300" y="212">Eye Contact</text><text x="180" y="286">Engagement</text><text x="0" y="212">Technical</text><text x="4" y="88">Structure</text>
      </svg>
    </div>
  );
}

function Report({ onNavigate }) {
  const [aiReport, setAiReport] = useState(null);
  const [reportError, setReportError] = useState("");
  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const sessionId = localStorage.getItem("reportSessionId");

  useEffect(() => {
    getFinalReport(sessionId)
      .then((data) => { setAiReport(data); setReportError(""); })
      .catch((error) => setReportError(error.message || "Unable to generate report."))
      .finally(() => setIsLoadingReport(false));
  }, [sessionId]);

  const overallScore = Math.round(aiReport?.average_score || 0);
  const confidence = Math.round(aiReport?.confidence || 0);
  const eyeContact = Math.round(aiReport?.eye_contact || 0);
  const performanceLabel = overallScore >= 80 ? "Excellent Performance" : overallScore >= 55 ? "Good Progress" : "Needs Practice";
  const performanceEmoji = overallScore >= 80 ? "✅" : overallScore >= 55 ? "📈" : "⚠️";
  const confidenceEmoji = confidence >= 80 ? "😊" : confidence >= 55 ? "🙂" : "😐";
  const eyeEmoji = eyeContact >= 80 ? "👀" : eyeContact >= 55 ? "🟡" : "⚠️";

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setReportError("");
    try {
      const reportForPdf = aiReport || await getFinalReport(sessionId);
      downloadInterviewReport(reportForPdf);
    } catch (error) {
      setReportError(error.message || "Unable to download PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleShare = async () => {
    const text = `AI Interview result: ${overallScore}% (${aiReport?.total_answers || 0} answers).`;
    try {
      if (navigator.share) await navigator.share({ title: "AI Interview Report", text });
      else await navigator.clipboard.writeText(text);
    } catch (error) {
      if (error.name !== "AbortError") setReportError("Unable to share the report.");
    }
  };

  return (
    <AppShell active="report" onNavigate={onNavigate}>
      <div className="report-header">
        <div>
          <h1>📊 AI Interview Report</h1>
          <p>{aiReport?.field || "General"} · {aiReport?.difficulty || "Any level"} · {aiReport?.duration_minutes || 0} minutes</p>
        </div>
        <div className="report-actions">
          <button className="outline-button" type="button" onClick={handleShare}><Icon name="share" /> Share</button>
          <button className="primary-button" type="button" onClick={handleDownloadPdf} disabled={isDownloadingPdf}><Icon name="download" /> {isDownloadingPdf ? "Preparing..." : "Download PDF"}</button>
        </div>
      </div>

      <div className="report-status-pill">{performanceEmoji} {performanceLabel}</div>

      <section className="report-stats">
        <article className="score-card">
          <Icon name="medal" />
          <strong>{overallScore}%</strong>
          <span>Overall Score</span>
          <em>{performanceEmoji} {performanceLabel}</em>
        </article>
        <article className="card report-stat">
          <div>
            <p>{confidenceEmoji} Confidence Level</p>
            <strong>{confidence}%</strong>
            <span>Webcam estimate</span>
          </div>
          <div className="soft-icon purple"><Icon name="smile" /></div>
        </article>
        <article className="card report-stat">
          <div>
            <p>{eyeEmoji} Eye Contact</p>
            <strong>{eyeContact}%</strong>
            <span>Webcam estimate</span>
          </div>
          <div className="soft-icon purple"><Icon name="eye" /></div>
        </article>
      </section>

      <section className="report-grid">
        <article className="card">
          <h2>🧠 Skills Assessment</h2>
          <RadarChart report={aiReport} />
        </article>
        <article className="card">
          <h2>📈 Answer Scores</h2>
          <MiniLineChart answers={aiReport?.answers} />
        </article>
      </section>

      <section className="card feedback-card">
        <h2>💬 AI Feedback &amp; Recommendations</h2>
        {isLoadingReport && <p className="report-summary">Generating your AI report...</p>}
        {reportError && <p className="auth-error">{reportError}</p>}
        {aiReport && <p className="report-summary">{aiReport.summary}</p>}
      </section>

      <section className="card breakdown-card">
        <h2>🧾 Question-by-Question Breakdown</h2>
        {!aiReport?.answers?.length && <p>No answers saved for this interview.</p>}
        {aiReport?.answers?.map((answer, index) => (
          <div className="breakdown-row" key={`${answer.question}-${index}`}>
            <span>{index + 1}</span>
            <div>
              <strong>{answer.question}</strong>
              <em>{answer.feedback}</em>
            </div>
            <strong>{answer.score || 0}%</strong>
          </div>
        ))}
      </section>

      <section className="practice-cta">
        <Icon name="sparkle" />
        <h2>🚀 Ready for More Practice?</h2>
        <p>Keep improving your interview skills with personalized AI coaching</p>
        <div>
          <button type="button" onClick={() => onNavigate("interview")}>Start New Interview</button>
          <button type="button" onClick={() => onNavigate("dashboard")}>Back to Dashboard</button>
        </div>
      </section>
    </AppShell>
  );
}

export default Report;

import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";

import { AppShell, Icon } from "../components/AppShell";
import { getFinalReport } from "../services/api";

function MiniLineChart() {
  return (
    <div className="report-line-chart">
      <svg viewBox="0 0 640 310" role="img" aria-label="Performance timeline">
        {[0, 77, 154, 231, 308].map((y) => (
          <line className="chart-grid" key={y} x1="44" x2="615" y1={y + 12} y2={y + 12} />
        ))}
        {[0, 143, 286, 429, 572].map((x) => (
          <line className="chart-grid" key={x} x1={x + 44} x2={x + 44} y1="12" y2="320" />
        ))}
        <line className="chart-axis" x1="44" x2="615" y1="320" y2="320" />
        <line className="chart-axis" x1="44" x2="44" y1="12" y2="320" />
        <polyline className="chart-line" points="44,145 187,120 330,95 473,82 615,66" />
        <polyline className="chart-line secondary" points="44,128 187,106 330,72 473,58 615,48" />
      </svg>
    </div>
  );
}

function RadarChart() {
  return (
    <div className="radar-chart">
      <svg viewBox="0 0 360 290" role="img" aria-label="Skills assessment radar chart">
        <polygon className="radar-grid" points="180,20 292,82 292,206 180,270 68,206 68,82" />
        <polygon className="radar-grid" points="180,62 255,103 255,185 180,228 105,185 105,103" />
        <polygon className="radar-grid" points="180,104 218,124 218,166 180,186 142,166 142,124" />
        <line className="radar-grid" x1="180" y1="20" x2="180" y2="270" />
        <line className="radar-grid" x1="68" y1="82" x2="292" y2="206" />
        <line className="radar-grid" x1="292" y1="82" x2="68" y2="206" />
        <polygon className="radar-shape" points="180,62 250,106 262,194 180,226 88,198 90,92" />
        <text x="180" y="16">Communication</text>
        <text x="300" y="88">Confidence</text>
        <text x="300" y="212">Eye Contact</text>
        <text x="180" y="286">Body Language</text>
        <text x="0" y="212">Technical Skills</text>
        <text x="4" y="88">Problem Solving</text>
      </svg>
    </div>
  );
}

function Report({ onNavigate }) {
  const [aiReport, setAiReport] = useState(null);
  const [reportError, setReportError] = useState("");
  const [isLoadingReport, setIsLoadingReport] = useState(true);

  useEffect(() => {
    getFinalReport()
      .then((data) => {
        setAiReport(data);
        setReportError("");
      })
      .catch((error) => {
        console.error(error);
        setReportError(error.message || "Unable to generate report.");
      })
      .finally(() => {
        setIsLoadingReport(false);
      });
  }, []);

  const overallScore = aiReport?.average_score ? Math.round(aiReport.average_score) : 88;

  const handleDownloadPdf = async () => {
    let reportForPdf = aiReport;

    if (!reportForPdf) {
      try {
        reportForPdf = await getFinalReport();
        setAiReport(reportForPdf);
        setReportError("");
      } catch (error) {
        console.error(error);
        setReportError(error.message || "Unable to generate report.");
        reportForPdf = {
          average_score: null,
          total_answers: 0,
          summary: "The AI report could not be generated yet. Please answer at least one question and try again."
        };
      }
    }

    const pdfScore = reportForPdf?.average_score ? Math.round(reportForPdf.average_score) : 0;
    const pdfTotalAnswers = reportForPdf?.total_answers ?? 0;
    const pdfReportText = reportForPdf?.summary || "No saved interview answers found yet. Answer at least one question before downloading the report.";

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const margin = 18;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const maxLineWidth = pageWidth - margin * 2;
    let y = 22;

    const addTextBlock = (text, fontSize = 11, lineHeight = 7) => {
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, maxLineWidth);

      lines.forEach((line) => {
        if (y > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }

        pdf.text(line, margin, y);
        y += lineHeight;
      });
    };

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("AI Interview Report", margin, y);
    y += 12;

    pdf.setFont("helvetica", "normal");
    addTextBlock(`Overall Score: ${pdfScore}%`, 12, 8);
    addTextBlock(`Total Answers: ${pdfTotalAnswers}`, 12, 8);
    y += 4;

    pdf.setFont("helvetica", "bold");
    addTextBlock("AI Feedback & Recommendations", 14, 8);
    pdf.setFont("helvetica", "normal");
    addTextBlock(pdfReportText, 11, 7);

    pdf.save("interview-report.pdf");
  };

  return (
    <AppShell active="report" onNavigate={onNavigate}>
      <div className="report-header">
        <div>
          <h1>Interview Report</h1>
          <p>Software Engineer · May 27, 2026 · 32 minutes</p>
        </div>
        <div className="report-actions">
          <button className="outline-button" type="button"><Icon name="share" /> Share</button>
          <button className="primary-button" type="button" onClick={handleDownloadPdf}><Icon name="download" /> Download PDF</button>
        </div>
      </div>

      <section className="report-stats">
        <article className="score-card">
          <Icon name="medal" />
          <strong>{overallScore}%</strong>
          <span>Overall Score</span>
          <em>Excellent Performance</em>
        </article>
        <article className="card report-stat">
          <div>
            <p>Confidence Level</p>
            <strong>85%</strong>
            <span>Above Average</span>
          </div>
          <div className="soft-icon purple"><Icon name="smile" /></div>
        </article>
        <article className="card report-stat">
          <div>
            <p>Eye Contact</p>
            <strong>82%</strong>
            <span>Strong</span>
          </div>
          <div className="soft-icon purple"><Icon name="eye" /></div>
        </article>
      </section>

      <section className="report-grid">
        <article className="card">
          <h2>Skills Assessment</h2>
          <RadarChart />
        </article>
        <article className="card">
          <h2>Performance Timeline</h2>
          <MiniLineChart />
        </article>
      </section>

      <section className="card feedback-card">
        <h2>AI Feedback &amp; Recommendations</h2>
        {isLoadingReport && <p className="report-summary">Generating your AI report...</p>}
        {reportError && <p className="auth-error">{reportError}</p>}
        {aiReport && (
          <p className="report-summary">
            {aiReport.summary}
          </p>
        )}
      </section>

      <section className="card breakdown-card">
        <h2>Question-by-Question Breakdown</h2>
        {[
          ["Tell me about yourself", "Excellent", "85%"],
          ["Describe a challenging project", "Outstanding", "90%"],
          ["How do you handle conflicts?", "Very Good", "82%"],
          ["Technical problem-solving", "Outstanding", "92%"],
          ["Why do you want this role?", "Excellent", "88%"]
        ].map(([question, grade, score], index) => (
          <div className="breakdown-row" key={question}>
            <span>{index + 1}</span>
            <div>
              <strong>{question}</strong>
              <em>{grade}</em>
            </div>
            <strong>{score}</strong>
          </div>
        ))}
      </section>

      <section className="practice-cta">
        <Icon name="sparkle" />
        <h2>Ready for More Practice?</h2>
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

import { jsPDF } from "jspdf";

const COLORS = {
  ink: [30, 35, 59], muted: [103, 112, 137], purple: [103, 80, 232],
  purpleDark: [76, 58, 190], purpleSoft: [241, 238, 255], blue: [60, 130, 246],
  green: [26, 166, 112], amber: [245, 158, 11], red: [239, 68, 68],
  page: [247, 248, 252], white: [255, 255, 255], border: [224, 228, 238]
};
const PAGE = { width: 210, height: 297, margin: 14, footer: 12 };
const emojiCache = new Map();

const cleanText = (value) => String(value ?? "")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2013\u2014]/g, "-")
  .replace(/\u2026/g, "...")
  .replace(/[^\x20-\x7E\n]/g, " ")
  .replace(/[ \t]+/g, " ")
  .trim();

const scoreColor = (score) => score >= 80 ? COLORS.green : score >= 55 ? COLORS.blue : score >= 35 ? COLORS.amber : COLORS.red;
const scoreLabel = (score) => score >= 80 ? "Excellent" : score >= 55 ? "Good progress" : score >= 35 ? "Keep improving" : "Needs practice";

function createEmojiImage(emoji) {
  if (emojiCache.has(emoji)) return emojiCache.get(emoji);
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = '112px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(emoji, 80, 86);
  const image = canvas.toDataURL("image/png");
  emojiCache.set(emoji, image);
  return image;
}

function addEmoji(pdf, emoji, x, y, size = 8) {
  const image = createEmojiImage(emoji);
  if (image) pdf.addImage(image, "PNG", x, y, size, size, undefined, "FAST");
}

function fillPage(pdf) {
  pdf.setFillColor(...COLORS.page);
  pdf.rect(0, 0, PAGE.width, PAGE.height, "F");
}

function card(pdf, x, y, width, height, fill = COLORS.white, radius = 4) {
  pdf.setFillColor(...fill);
  pdf.setDrawColor(...COLORS.border);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(x, y, width, height, radius, radius, "FD");
}

function setText(pdf, size, color = COLORS.ink, style = "normal") {
  pdf.setFont("helvetica", style);
  pdf.setFontSize(size);
  pdf.setTextColor(...color);
}

function drawSectionTitle(pdf, emoji, title, x, y) {
  addEmoji(pdf, emoji, x, y - 5.8, 7);
  setText(pdf, 13, COLORS.ink, "bold");
  pdf.text(title, x + 10, y);
}

function drawProgress(pdf, label, score, x, y, width) {
  const value = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  setText(pdf, 9, COLORS.ink, "bold");
  pdf.text(label, x, y);
  setText(pdf, 9, scoreColor(value), "bold");
  pdf.text(`${value}%`, x + width, y, { align: "right" });
  pdf.setFillColor(232, 235, 243);
  pdf.roundedRect(x, y + 3, width, 3.2, 1.6, 1.6, "F");
  if (value > 0) {
    pdf.setFillColor(...scoreColor(value));
    pdf.roundedRect(x, y + 3, Math.max(3.2, width * value / 100), 3.2, 1.6, 1.6, "F");
  }
}

function addContinuationPage(pdf, title) {
  pdf.addPage();
  fillPage(pdf);
  pdf.setFillColor(...COLORS.purple);
  pdf.rect(0, 0, PAGE.width, 20, "F");
  addEmoji(pdf, "📄", PAGE.margin, 5.5, 8);
  setText(pdf, 13, COLORS.white, "bold");
  pdf.text(title, PAGE.margin + 11, 12.3);
  return 29;
}

function drawTextAcrossPages(pdf, text, x, y, width, options = {}) {
  const { fontSize = 9.5, lineHeight = 5, color = COLORS.ink, style = "normal", continuationTitle = "Interview Report - continued" } = options;
  setText(pdf, fontSize, color, style);
  const lines = pdf.splitTextToSize(cleanText(text) || "Not available.", width);
  lines.forEach((line) => {
    if (y > PAGE.height - PAGE.footer - 5) {
      y = addContinuationPage(pdf, continuationTitle);
      setText(pdf, fontSize, color, style);
    }
    pdf.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

function drawMetricCard(pdf, metric, x, y, width) {
  const score = Math.round(Number(metric.value) || 0);
  card(pdf, x, y, width, 31);
  pdf.setFillColor(...scoreColor(score));
  pdf.circle(x + 9, y + 9, 5.5, "F");
  addEmoji(pdf, metric.emoji, x + 5.5, y + 5.5, 7);
  setText(pdf, 8, COLORS.muted, "bold");
  pdf.text(metric.label.toUpperCase(), x + 4, y + 21);
  setText(pdf, 16, COLORS.ink, "bold");
  pdf.text(`${score}%`, x + width - 4, y + 12, { align: "right" });
  setText(pdf, 7.5, scoreColor(score), "bold");
  pdf.text(scoreLabel(score), x + 4, y + 27);
}

function drawSummary(pdf, report, startY) {
  const summary = cleanText(report.summary) || "No AI summary is available for this interview.";
  const lines = pdf.splitTextToSize(summary, PAGE.width - PAGE.margin * 2 - 12);
  const capacity = Math.max(4, Math.floor((PAGE.height - PAGE.footer - startY - 19) / 5));
  const shownLines = lines.slice(0, capacity);
  card(pdf, PAGE.margin, startY, PAGE.width - PAGE.margin * 2, 17 + shownLines.length * 5);
  drawSectionTitle(pdf, "💬", "AI Feedback & Recommendations", PAGE.margin + 6, startY + 10);
  setText(pdf, 9.5, COLORS.muted);
  shownLines.forEach((line, index) => pdf.text(line, PAGE.margin + 6, startY + 18 + index * 5));
  if (shownLines.length < lines.length) {
    let y = addContinuationPage(pdf, "AI Feedback & Recommendations");
    lines.slice(shownLines.length).forEach((line) => {
      if (y > PAGE.height - PAGE.footer - 5) y = addContinuationPage(pdf, "AI Feedback - continued");
      setText(pdf, 9.5, COLORS.muted);
      pdf.text(line, PAGE.margin, y);
      y += 5;
    });
  }
}

function drawOverviewPage(pdf, report) {
  fillPage(pdf);
  pdf.setFillColor(...COLORS.purple);
  pdf.rect(0, 0, PAGE.width, 49, "F");
  pdf.setFillColor(...COLORS.purpleDark);
  pdf.circle(181, 4, 36, "F");
  pdf.circle(202, 41, 25, "F");
  addEmoji(pdf, "🎯", PAGE.margin, 10, 14);
  setText(pdf, 22, COLORS.white, "bold");
  pdf.text("AI Interview Report", PAGE.margin + 19, 20);
  setText(pdf, 10, [230, 226, 255]);
  pdf.text(`${cleanText(report.field) || "General"}  |  ${cleanText(report.difficulty) || "Any level"}  |  ${Number(report.duration_minutes) || 0} min`, PAGE.margin + 19, 29);
  setText(pdf, 8.5, COLORS.white);
  const created = report.created_at ? new Date(report.created_at).toLocaleDateString() : new Date().toLocaleDateString();
  pdf.text(`Session #${report.interview_session_id || "latest"}  |  ${created}`, PAGE.margin + 19, 37);

  const overall = Math.round(Number(report.average_score) || 0);
  card(pdf, PAGE.margin, 57, PAGE.width - PAGE.margin * 2, 23, COLORS.purpleSoft);
  addEmoji(pdf, overall >= 80 ? "🏆" : overall >= 55 ? "📈" : "💪", PAGE.margin + 6, 62, 10);
  setText(pdf, 13, COLORS.purpleDark, "bold");
  pdf.text(scoreLabel(overall), PAGE.margin + 20, 68);
  setText(pdf, 9, COLORS.muted);
  pdf.text(`${Number(report.total_answers) || 0} answers evaluated`, PAGE.margin + 20, 74);
  setText(pdf, 19, COLORS.purpleDark, "bold");
  pdf.text(`${overall}%`, PAGE.width - PAGE.margin - 7, 71, { align: "right" });

  const gap = 4;
  const metricWidth = (PAGE.width - PAGE.margin * 2 - gap * 3) / 4;
  [
    { emoji: "⭐", label: "Overall", value: overall },
    { emoji: "😊", label: "Confidence", value: report.confidence },
    { emoji: "👀", label: "Eye contact", value: report.eye_contact },
    { emoji: "⚡", label: "Engagement", value: report.engagement }
  ].forEach((metric, index) => drawMetricCard(pdf, metric, PAGE.margin + index * (metricWidth + gap), 87, metricWidth));

  card(pdf, PAGE.margin, 125, PAGE.width - PAGE.margin * 2, 56);
  drawSectionTitle(pdf, "📊", "Performance Overview", PAGE.margin + 6, 136);
  drawProgress(pdf, "Answer quality", overall, PAGE.margin + 7, 148, 76);
  drawProgress(pdf, "Confidence", report.confidence, 111, 148, 78);
  drawProgress(pdf, "Eye contact", report.eye_contact, PAGE.margin + 7, 165, 76);
  drawProgress(pdf, "Engagement", report.engagement, 111, 165, 78);
  drawSummary(pdf, report, 188);
}

function drawQuestionPageHeader(pdf, report) {
  fillPage(pdf);
  pdf.setFillColor(...COLORS.purple);
  pdf.rect(0, 0, PAGE.width, 28, "F");
  addEmoji(pdf, "🧾", PAGE.margin, 7, 10);
  setText(pdf, 16, COLORS.white, "bold");
  pdf.text("Question-by-Question Breakdown", PAGE.margin + 13, 15);
  setText(pdf, 8.5, [230, 226, 255]);
  pdf.text(`${cleanText(report.field) || "General"} interview - detailed coaching review`, PAGE.margin + 13, 22);
}

function drawQuestions(pdf, report) {
  const answers = Array.isArray(report.answers) ? report.answers : [];
  if (!answers.length) return;
  pdf.addPage();
  drawQuestionPageHeader(pdf, report);
  let y = 38;
  answers.forEach((answer, index) => {
    const score = Math.round(Number(answer.score) || 0);
    const questionLines = pdf.splitTextToSize(cleanText(answer.question) || "Question not available", 151);
    const answerLines = pdf.splitTextToSize(cleanText(answer.answer) || "No answer submitted.", 164);
    const feedbackLines = pdf.splitTextToSize(cleanText(answer.feedback) || "No feedback available.", 164);
    const estimatedHeight = 23 + questionLines.length * 4.5 + Math.min(answerLines.length, 12) * 4.3 + Math.min(feedbackLines.length, 9) * 4.3;
    if (y + Math.min(estimatedHeight, 105) > PAGE.height - PAGE.footer) {
      pdf.addPage();
      drawQuestionPageHeader(pdf, report);
      y = 38;
    }
    card(pdf, PAGE.margin, y, PAGE.width - PAGE.margin * 2, 13, COLORS.purpleSoft);
    pdf.setFillColor(...COLORS.purple);
    pdf.circle(PAGE.margin + 8, y + 6.5, 4.5, "F");
    setText(pdf, 9, COLORS.white, "bold");
    pdf.text(String(index + 1), PAGE.margin + 8, y + 8, { align: "center" });
    setText(pdf, 10, COLORS.ink, "bold");
    pdf.text(`Question ${index + 1}`, PAGE.margin + 16, y + 8);
    setText(pdf, 11, scoreColor(score), "bold");
    pdf.text(`${score}%`, PAGE.width - PAGE.margin - 6, y + 8, { align: "right" });
    y += 20;

    questionLines.forEach((line) => {
      if (y > PAGE.height - PAGE.footer - 8) y = addContinuationPage(pdf, `Question ${index + 1} - continued`);
      setText(pdf, 9.5, COLORS.ink, "bold");
      pdf.text(line, PAGE.margin + 3, y);
      y += 4.5;
    });
    y += 3;
    setText(pdf, 8, COLORS.purpleDark, "bold");
    pdf.text("YOUR ANSWER", PAGE.margin + 3, y);
    y += 5;
    y = drawTextAcrossPages(pdf, answer.answer || "No answer submitted.", PAGE.margin + 3, y, PAGE.width - PAGE.margin * 2 - 6, {
      fontSize: 9, lineHeight: 4.3, color: COLORS.muted, continuationTitle: `Question ${index + 1} - answer continued`
    });
    y += 3;
    setText(pdf, 8, COLORS.green, "bold");
    pdf.text("AI COACH FEEDBACK", PAGE.margin + 3, y);
    y += 5;
    y = drawTextAcrossPages(pdf, answer.feedback || "No feedback available.", PAGE.margin + 3, y, PAGE.width - PAGE.margin * 2 - 6, {
      fontSize: 9, lineHeight: 4.3, color: COLORS.ink, continuationTitle: `Question ${index + 1} - feedback continued`
    });
    y += 9;
  });
}

function addFooters(pdf) {
  const totalPages = pdf.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    pdf.setPage(pageNumber);
    pdf.setDrawColor(...COLORS.border);
    pdf.line(PAGE.margin, PAGE.height - 9, PAGE.width - PAGE.margin, PAGE.height - 9);
    setText(pdf, 7.5, COLORS.muted);
    pdf.text("AI Interview Coach - Personalized Performance Report", PAGE.margin, PAGE.height - 5);
    pdf.text(`Page ${pageNumber} of ${totalPages}`, PAGE.width - PAGE.margin, PAGE.height - 5, { align: "right" });
  }
}

export function createInterviewReportPdf(report) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  pdf.setProperties({
    title: "AI Interview Performance Report",
    subject: "Detailed interview evaluation and coaching recommendations",
    author: "AI Interview Coach",
    creator: "AI Interview Coach"
  });
  drawOverviewPage(pdf, report || {});
  drawQuestions(pdf, report || {});
  addFooters(pdf);
  return pdf;
}

export function downloadInterviewReport(report) {
  const pdf = createInterviewReportPdf(report);
  pdf.save(`interview-report-${report?.interview_session_id || "latest"}.pdf`);
}

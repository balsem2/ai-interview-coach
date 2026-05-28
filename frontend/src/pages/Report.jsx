import { AppShell, Icon } from "../components/AppShell";

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
  return (
    <AppShell active="report" onNavigate={onNavigate}>
      <div className="report-header">
        <div>
          <h1>Interview Report</h1>
          <p>Software Engineer · May 27, 2026 · 32 minutes</p>
        </div>
        <div className="report-actions">
          <button className="outline-button" type="button"><Icon name="share" /> Share</button>
          <button className="primary-button" type="button"><Icon name="download" /> Download PDF</button>
        </div>
      </div>

      <section className="report-stats">
        <article className="score-card">
          <Icon name="medal" />
          <strong>88%</strong>
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
        <div className="feedback-grid">
          <div className="feedback good"><strong>Excellent Technical Knowledge</strong><span>You demonstrated strong understanding of core concepts and provided detailed, accurate responses.</span></div>
          <div className="feedback good"><strong>Clear Communication</strong><span>Your answers were well-structured and easy to follow, using the STAR method effectively.</span></div>
          <div className="feedback warn"><strong>Eye Contact Consistency</strong><span>Maintain eye contact throughout your response. You looked away during the middle section of some answers.</span></div>
          <div className="feedback warn"><strong>Response Pacing</strong><span>Consider pausing briefly before answering to gather your thoughts and deliver more measured responses.</span></div>
        </div>
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

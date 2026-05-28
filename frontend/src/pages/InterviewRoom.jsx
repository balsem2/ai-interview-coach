import { AppShell, Icon } from "../components/AppShell";

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

function InterviewRoom({ onNavigate }) {
  return (
    <AppShell active="interview" onNavigate={onNavigate}>
      <div className="interview-topbar">
        <div>
          <h1>Software Engineer Interview</h1>
          <p>Question 1 of 5</p>
        </div>
        <div className="interview-actions">
          <span className="timer"><Icon name="clock" /> 00:05</span>
          <button type="button" onClick={() => onNavigate("report")}>End Interview</button>
        </div>
      </div>

      <section className="interview-layout">
        <div className="interview-left">
          <article className="card video-card">
            <div className="video-preview">
              <Icon name="video" />
              <span>You</span>
            </div>
            <div className="media-controls">
              <button type="button" aria-label="Toggle microphone"><Icon name="mic" /></button>
              <button type="button" aria-label="Toggle camera"><Icon name="video" /></button>
            </div>
          </article>

          <article className="card live-card">
            <h2>Live Analysis</h2>
            <AnalysisRow icon="eye" label="Eye Contact" value="Good" width="75%" />
            <AnalysisRow icon="smile" label="Confidence" value="Excellent" width="85%" />
            <AnalysisRow icon="pulse" label="Engagement" value="High" width="88%" />
          </article>

          <article className="card progress-card">
            <h2>Interview Progress</h2>
            {[1, 2, 3, 4, 5].map((step) => (
              <div className="step-row" key={step}>
                <span className={step === 1 ? "active" : ""}>{step}</span>
                <div>
                  <strong>Question {step}</strong>
                  {step === 1 && <em>In Progress</em>}
                </div>
              </div>
            ))}
          </article>
        </div>

        <div className="interview-main">
          <article className="question-card">
            <div className="question-title">
              <span><Icon name="pulse" /></span>
              <div>
                <strong>Current Question</strong>
                <p>Can you tell me about a challenging project you worked on and how you overcame obstacles?</p>
              </div>
            </div>
            <div className="tip-box">
              <strong>Tip:</strong> Structure your answer using the STAR method (Situation, Task, Action, Result)
            </div>
          </article>

          <article className="card assistant-card">
            <header>
              <h2>AI Interview Assistant</h2>
            </header>
            <div className="chat-area">
              <p className="message assistant">Hello! I&apos;m your AI interview assistant. Let&apos;s begin with your first question.</p>
              <p className="message assistant">Can you tell me about a challenging project you worked on and how you overcame obstacles?</p>
              <p className="message user">In my previous role, I led the development of a real-time analytics dashboard...</p>
            </div>
            <form className="response-box">
              <input placeholder="Type your response..." />
              <button type="button"><Icon name="send" /></button>
            </form>
          </article>
        </div>
      </section>
    </AppShell>
  );
}

export default InterviewRoom;

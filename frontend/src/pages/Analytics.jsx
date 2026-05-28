import { AppShell, Icon } from "../components/AppShell";

function AnalyticsLineChart() {
  const primary = "44,170 180,148 316,154 452,120 588,96 724,105 860,82";
  const secondary = "44,198 180,176 316,166 452,145 588,132 724,118 860,104";

  return (
    <div className="analytics-chart">
      <svg viewBox="0 0 910 290" role="img" aria-label="Weekly analytics trend">
        {[24, 86, 148, 210, 272].map((y) => (
          <line className="chart-grid" key={`h-${y}`} x1="44" x2="880" y1={y} y2={y} />
        ))}
        {[44, 180, 316, 452, 588, 724, 860].map((x) => (
          <line className="chart-grid" key={`v-${x}`} x1={x} x2={x} y1="24" y2="272" />
        ))}
        <line className="chart-axis" x1="44" x2="880" y1="272" y2="272" />
        <line className="chart-axis" x1="44" x2="44" y1="24" y2="272" />
        <polyline className="chart-line" points={primary} />
        <polyline className="chart-line secondary" points={secondary} />
        {primary.split(" ").map((point) => {
          const [x, y] = point.split(",").map(Number);
          return <circle className="chart-dot" key={point} cx={x} cy={y} r="6" />;
        })}
      </svg>
      <div className="chart-x-labels">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}
      </div>
    </div>
  );
}

function SkillCard({ icon, title, value, note }) {
  return (
    <article className="card analytics-skill">
      <div className="soft-icon">
        <Icon name={icon} />
      </div>
      <div>
        <p>{title}</p>
        <strong>{value}%</strong>
        <span>{note}</span>
      </div>
    </article>
  );
}

function Analytics({ onNavigate, user }) {
  const firstName = user?.fullname?.split(" ")[0] || "Alex";

  return (
    <AppShell active="analytics" onNavigate={onNavigate}>
      <div className="page-header">
        <h1>Analytics</h1>
        <p>{firstName}, here is your interview performance breakdown.</p>
      </div>

      <section className="analytics-summary">
        <SkillCard icon="eye" title="Eye Contact" value={82} note="Strong consistency" />
        <SkillCard icon="smile" title="Confidence" value={78} note="Improving steadily" />
        <SkillCard icon="pulse" title="Engagement" value={88} note="High energy" />
        <SkillCard icon="chart" title="Response Quality" value={85} note="Excellent structure" />
      </section>

      <section className="analytics-main">
        <article className="card analytics-wide">
          <div className="section-title">
            <h2>Performance Analytics</h2>
            <span className="range-pill">Last 7 days</span>
          </div>
          <AnalyticsLineChart />
        </article>

        <article className="card analytics-insights">
          <h2>Top Insights</h2>
          <div className="insight-row good">
            <strong>Best skill</strong>
            <span>Engagement is your strongest area at 88%.</span>
          </div>
          <div className="insight-row">
            <strong>Focus area</strong>
            <span>Confidence can improve with shorter, more direct answers.</span>
          </div>
          <div className="insight-row">
            <strong>Next action</strong>
            <span>Practice one technical interview this week.</span>
          </div>
          <button type="button" onClick={() => onNavigate("interview")}>
            Start Practice
          </button>
        </article>
      </section>

      <section className="card analytics-table">
        <h2>Skill History</h2>
        {[
          ["Communication", "86%", "+6%", "Excellent"],
          ["Technical Skills", "81%", "+4%", "Strong"],
          ["Body Language", "79%", "+8%", "Improving"],
          ["Problem Solving", "84%", "+5%", "Strong"]
        ].map(([skill, score, change, status]) => (
          <div className="analytics-row" key={skill}>
            <strong>{skill}</strong>
            <span>{score}</span>
            <em>{change}</em>
            <small>{status}</small>
          </div>
        ))}
      </section>
    </AppShell>
  );
}

export default Analytics;

import { AppShell, Icon } from "../components/AppShell";

function LineChart() {
  const points = "0,72 140,62 280,68 420,52 560,42 700,46 840,36";

  return (
    <div className="line-chart" aria-label="Performance trend chart">
      <svg viewBox="0 0 900 260" role="img">
        {[0, 65, 130, 195, 260].map((y) => (
          <line className="chart-grid" key={`h-${y}`} x1="42" x2="880" y1={y + 8} y2={y + 8} />
        ))}
        {[0, 140, 280, 420, 560, 700, 840].map((x) => (
          <line className="chart-grid" key={`v-${x}`} x1={x + 42} x2={x + 42} y1="8" y2="236" />
        ))}
        <line className="chart-axis" x1="42" x2="880" y1="236" y2="236" />
        <line className="chart-axis" x1="42" x2="42" y1="8" y2="236" />
        <polyline className="chart-line" points={points.split(" ").map((point) => {
          const [x, y] = point.split(",").map(Number);
          return `${x + 42},${y + 8}`;
        }).join(" ")} />
        {points.split(" ").map((point) => {
          const [x, y] = point.split(",").map(Number);
          return <circle className="chart-dot" key={point} cx={x + 42} cy={y + 8} r="6" />;
        })}
      </svg>
      <div className="chart-y-labels">
        <span>100</span>
        <span>75</span>
        <span>50</span>
        <span>25</span>
        <span>0</span>
      </div>
      <div className="chart-x-labels">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}
      </div>
    </div>
  );
}

function MetricBar({ icon, label, value }) {
  return (
    <div className="metric-bar">
      <div className="metric-top">
        <span><Icon name={icon} /> {label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Dashboard({ onNavigate, user }) {
  const firstName = user?.fullname?.split(" ")[0] || "Alex";

  return (
    <AppShell active="dashboard" onNavigate={onNavigate}>
      <div className="page-header">
        <h1>Welcome back, {firstName}</h1>
        <p>Ready to ace your next interview?</p>
      </div>

      <section className="stats-grid">
        <article className="card stat-card stat-wide">
          <div>
            <p>Overall Performance</p>
            <strong>85%</strong>
            <span className="trend-up">↑ 12% <em>from last week</em></span>
          </div>
          <div className="soft-icon"><Icon name="arrow" /></div>
        </article>
        <article className="card stat-card">
          <div>
            <p>Total Interviews</p>
            <strong>24</strong>
            <span className="trend-up">↑ 3 <em>this week</em></span>
          </div>
          <div className="soft-icon purple"><Icon name="video" /></div>
        </article>
        <article className="card stat-card">
          <div>
            <p>Avg Duration</p>
            <strong>31m</strong>
            <span>consistent</span>
          </div>
          <div className="soft-icon blue"><Icon name="clock" /></div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="card chart-card">
          <h2>Performance Trend</h2>
          <LineChart />
        </article>

        <article className="card metrics-card">
          <h2>Key Metrics</h2>
          <MetricBar icon="eye" label="Eye Contact" value={82} />
          <MetricBar icon="smile" label="Confidence" value={78} />
          <MetricBar icon="pulse" label="Response Quality" value={85} />
        </article>

        <article className="card recent-card">
          <div className="section-title">
            <h2>Recent Interviews</h2>
            <button type="button" onClick={() => onNavigate("report")}>View all</button>
          </div>
          {[
            ["Software Engineer", "2026-05-25", "32 min", "88%"],
            ["Product Manager", "2026-05-23", "28 min", "82%"],
            ["Data Scientist", "2026-05-20", "35 min", "85%"]
          ].map(([role, date, duration, score]) => (
            <div className="interview-row" key={role}>
              <div className="row-icon"><Icon name="video" /></div>
              <div>
                <strong>{role}</strong>
                <span>{date} · {duration}</span>
              </div>
              <div className="score">
                <strong>{score}</strong>
                <span>Excellent</span>
              </div>
            </div>
          ))}
        </article>

        <article className="start-panel">
          <div className="play-mark"><Icon name="play" /></div>
          <h2>Start New Interview</h2>
          <p>Practice with AI-powered interview simulation</p>
          <button type="button" onClick={() => onNavigate("interview")}>Begin Interview</button>
        </article>
      </section>
    </AppShell>
  );
}

export default Dashboard;

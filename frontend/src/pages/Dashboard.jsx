import { useEffect, useState } from "react";

import { AppShell, Icon } from "../components/AppShell";
import { getAnalyticsSummary } from "../services/api";

function LineChart({ trend = [] }) {
  const chartData = trend.length ? trend : [{ label: "No data", score: 0 }];
  const points = chartData.map((item, index) => {
    const x = chartData.length === 1 ? 420 : index * (840 / (chartData.length - 1));
    const y = 228 - (Number(item.score) || 0) * 2.2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="line-chart" aria-label="Performance trend chart">
      <svg viewBox="0 0 900 260" role="img">
        {[0, 65, 130, 195, 260].map((y) => (
          <line className="chart-grid" key={`h-${y}`} x1="42" x2="880" y1={y + 8} y2={y + 8} />
        ))}
        <line className="chart-axis" x1="42" x2="880" y1="236" y2="236" />
        <line className="chart-axis" x1="42" x2="42" y1="8" y2="236" />
        <polyline className="chart-line" points={points.split(" ").map((point) => {
          const [x, y] = point.split(",").map(Number);
          return `${x + 42},${y + 8}`;
        }).join(" ")} />
        {points.split(" ").map((point, index) => {
          const [x, y] = point.split(",").map(Number);
          return <circle className="chart-dot" key={`${point}-${index}`} cx={x + 42} cy={y + 8} r="6" />;
        })}
      </svg>
      <div className="chart-y-labels"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
      <div className="chart-x-labels">
        {chartData.map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}
      </div>
    </div>
  );
}

function MetricBar({ icon, label, value }) {
  return (
    <div className="metric-bar">
      <div className="metric-top"><span><Icon name={icon} /> {label}</span><strong>{value}%</strong></div>
      <div className="progress-track"><span style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function Dashboard({ onNavigate, user }) {
  const firstName = user?.fullname?.split(" ")[0] || "Candidate";
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState("");

  useEffect(() => {
    getAnalyticsSummary()
      .then(setAnalytics)
      .catch((error) => setAnalyticsError(error.message || "Unable to load analytics."));
  }, []);

  const overallPerformance = Math.round(analytics?.overall_performance || 0);
  const totalInterviews = analytics?.total_interviews || 0;
  const averageDuration = Math.round(analytics?.average_duration_minutes || 0);

  return (
    <AppShell active="dashboard" onNavigate={onNavigate}>
      <div className="page-header"><h1>Welcome back, {firstName}</h1><p>Ready to ace your next interview?</p></div>

      <section className="stats-grid">
        <article className="card stat-card stat-wide"><div><p>Overall Performance</p><strong>{overallPerformance}%</strong><span>Average saved score</span></div><div className="soft-icon"><Icon name="arrow" /></div></article>
        <article className="card stat-card"><div><p>Total Interviews</p><strong>{totalInterviews}</strong><span>Saved sessions</span></div><div className="soft-icon purple"><Icon name="video" /></div></article>
        <article className="card stat-card"><div><p>Avg Duration</p><strong>{averageDuration}m</strong><span>Completed sessions</span></div><div className="soft-icon blue"><Icon name="clock" /></div></article>
      </section>

      <section className="dashboard-grid">
        <article className="card chart-card"><h2>Performance Trend</h2><LineChart trend={analytics?.performance_trend} /></article>
        <article className="card metrics-card">
          <h2>Key Metrics</h2>
          <MetricBar icon="eye" label="Eye Contact" value={Math.round(analytics?.eye_contact || 0)} />
          <MetricBar icon="smile" label="Confidence" value={Math.round(analytics?.confidence || 0)} />
          <MetricBar icon="pulse" label="Response Quality" value={Math.round(analytics?.response_quality || 0)} />
        </article>

        <article className="card recent-card">
          <div className="section-title"><h2>Recent Interviews</h2><button type="button" onClick={() => onNavigate("history")}>View all</button></div>
          {!analytics?.recent_interviews?.length && <p>No interviews saved yet.</p>}
          {analytics?.recent_interviews?.map((interview) => (
            <div className="interview-row" key={interview.session_id}>
              <div className="row-icon"><Icon name="video" /></div>
              <div><strong>{interview.field || "General Interview"}</strong><span>{interview.date} · {interview.duration_minutes || 0} min</span></div>
              <div className="score"><strong>{Math.round(interview.average_score || 0)}%</strong><span>{interview.status}</span></div>
            </div>
          ))}
          {analyticsError && <p className="auth-error">{analyticsError}</p>}
        </article>

        <article className="start-panel"><div className="play-mark"><Icon name="play" /></div><h2>Start New Interview</h2><p>Practice with AI-powered interview simulation</p><button type="button" onClick={() => onNavigate("interview")}>Begin Interview</button></article>
      </section>
    </AppShell>
  );
}

export default Dashboard;

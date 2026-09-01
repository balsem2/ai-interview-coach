import { useEffect, useState } from "react";

import { AppShell, Icon } from "../components/AppShell";
import { getAnalyticsSummary } from "../services/api";

function AnalyticsLineChart({ trend = [] }) {
  const chartData = trend.length ? trend : [{ label: "No data", score: 0 }];
  const points = chartData.map((item, index) => {
    const x = chartData.length === 1 ? 452 : 44 + index * (816 / (chartData.length - 1));
    const y = 272 - (Number(item.score) || 0) * 2.48;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="analytics-chart">
      <svg viewBox="0 0 910 290" role="img" aria-label="Interview performance trend">
        {[24, 86, 148, 210, 272].map((y) => <line className="chart-grid" key={y} x1="44" x2="880" y1={y} y2={y} />)}
        <line className="chart-axis" x1="44" x2="880" y1="272" y2="272" />
        <line className="chart-axis" x1="44" x2="44" y1="24" y2="272" />
        <polyline className="chart-line" points={points} />
        {points.split(" ").map((point, index) => {
          const [x, y] = point.split(",").map(Number);
          return <circle className="chart-dot" key={`${point}-${index}`} cx={x} cy={y} r="6" />;
        })}
      </svg>
      <div className="chart-x-labels">{chartData.map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}</div>
    </div>
  );
}

function SkillCard({ icon, title, value, note }) {
  return (
    <article className="card analytics-skill">
      <div className="soft-icon"><Icon name={icon} /></div>
      <div><p>{title}</p><strong>{value}%</strong><span>{note}</span></div>
    </article>
  );
}

function Analytics({ onNavigate, user }) {
  const firstName = user?.fullname?.split(" ")[0] || "Candidate";
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnalyticsSummary()
      .then(setAnalytics)
      .catch((requestError) => setError(requestError.message || "Unable to load analytics."));
  }, []);

  const eyeContact = Math.round(analytics?.eye_contact || 0);
  const confidence = Math.round(analytics?.confidence || 0);
  const engagement = Math.round(analytics?.engagement || 0);
  const responseQuality = Math.round(analytics?.response_quality || 0);
  const skills = [
    ["Eye Contact", eyeContact],
    ["Confidence", confidence],
    ["Engagement", engagement],
    ["Response Quality", responseQuality]
  ];
  const bestSkill = skills.reduce((best, skill) => skill[1] > best[1] ? skill : best, skills[0]);
  const focusSkill = skills.reduce((lowest, skill) => skill[1] < lowest[1] ? skill : lowest, skills[0]);

  return (
    <AppShell active="analytics" onNavigate={onNavigate}>
      <div className="page-header"><h1>Analytics</h1><p>{firstName}, here is your real interview performance breakdown.</p></div>
      {error && <p className="auth-error">{error}</p>}

      <section className="analytics-summary">
        <SkillCard icon="eye" title="Eye Contact" value={eyeContact} note="Average webcam estimate" />
        <SkillCard icon="smile" title="Confidence" value={confidence} note="Average webcam estimate" />
        <SkillCard icon="pulse" title="Engagement" value={engagement} note="Average webcam estimate" />
        <SkillCard icon="chart" title="Response Quality" value={responseQuality} note="Average answer score" />
      </section>

      <section className="analytics-main">
        <article className="card analytics-wide"><div className="section-title"><h2>Performance Analytics</h2><span className="range-pill">Last 7 interviews</span></div><AnalyticsLineChart trend={analytics?.performance_trend} /></article>
        <article className="card analytics-insights">
          <h2>Top Insights</h2>
          <div className="insight-row good"><strong>Best skill</strong><span>{bestSkill[0]} is your strongest area at {bestSkill[1]}%.</span></div>
          <div className="insight-row"><strong>Focus area</strong><span>Prioritize {focusSkill[0].toLowerCase()} in your next practice.</span></div>
          <div className="insight-row"><strong>Next action</strong><span>Complete another interview to improve the trend accuracy.</span></div>
          <button type="button" onClick={() => onNavigate("interview")}>Start Practice</button>
        </article>
      </section>

      <section className="card analytics-table">
        <h2>Measured Skills</h2>
        {skills.map(([skill, score]) => (
          <div className="analytics-row" key={skill}><strong>{skill}</strong><span>{score}%</span><em>{score >= 70 ? "Strong" : "Practice"}</em><small>{analytics?.total_interviews || 0} sessions</small></div>
        ))}
      </section>
    </AppShell>
  );
}

export default Analytics;

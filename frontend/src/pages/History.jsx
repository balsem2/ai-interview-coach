import { useEffect, useState } from "react";

import { AppShell, Icon } from "../components/AppShell";
import { getInterviewSessions } from "../services/api";

function History({ onNavigate }) {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getInterviewSessions()
      .then(setSessions)
      .catch((requestError) => setError(requestError.message || "Unable to load interview history."))
      .finally(() => setIsLoading(false));
  }, []);

  const openReport = (sessionId) => {
    localStorage.setItem("reportSessionId", String(sessionId));
    onNavigate("report");
  };

  return (
    <AppShell active="history" onNavigate={onNavigate}>
      <div className="page-header"><h1>Interview History</h1><p>Review every saved session and open its individual report.</p></div>
      <section className="card breakdown-card">
        {isLoading && <p>Loading interview history...</p>}
        {error && <p className="auth-error">{error}</p>}
        {!isLoading && !sessions.length && <p>No interview sessions saved yet.</p>}
        {sessions.map((session) => (
          <div className="breakdown-row history-row" key={session.session_id}>
            <span><Icon name="video" /></span>
            <div>
              <strong>{session.field || "General Interview"}</strong>
              <em>{session.created_at ? new Date(session.created_at).toLocaleString() : "Unknown date"} · {session.difficulty || "Any level"} · {session.total_answers} answers · {session.status}</em>
            </div>
            <strong>{Math.round(session.average_score || 0)}%</strong>
            <button type="button" onClick={() => openReport(session.session_id)}>View report</button>
          </div>
        ))}
      </section>
    </AppShell>
  );
}

export default History;

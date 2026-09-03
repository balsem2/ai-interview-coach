import { Icon } from '../components/AppShell';
import '../styles/EnhancedMetrics.css';

function MetricBar({ label, value, icon, status }) {
  let computedStatus = 'critical';
  if (value >= 80) computedStatus = 'excellent';
  else if (value >= 60) computedStatus = 'good';
  else if (value >= 40) computedStatus = 'warning';
  const statusClass = status || computedStatus;

  return (
    <div className={`metric-bar ${statusClass}`}>
      <div className="metric-header">
        <span className="metric-label">
          <Icon name={icon} /> {label}
        </span>
        <span className="metric-value">{Math.round(value)}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="metric-status">{statusClass.toUpperCase()}</span>
    </div>
  );
}

/**
 * EnhancedMetricsDisplay Component
 * Shows real-time facial analysis metrics with visual feedback
 */
export function EnhancedMetricsDisplay({ 
  metrics, 
  feedback, 
  qualityScore,
  isLoading = false 
}) {
  if (isLoading) {
    return (
      <div className="metrics-container loading">
        <p>Analyzing facial metrics...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="metrics-container empty">
        <p>Enable camera to see analysis</p>
      </div>
    );
  }

  const {
    eyeContact = 0,
    confidence = 0,
    engagement = 0,
    posture = 0,
    expression = {},
    lighting = {},
    audioVisualSync = {}
  } = metrics;

  return (
    <div className="enhanced-metrics">
      {/* Primary Metrics */}
      <section className="metrics-section">
        <h3>Live Interview Analysis</h3>
        
        <div className="primary-metrics">
          <MetricBar 
            label="Eye Contact" 
            value={eyeContact} 
            icon="eye"
          />

          <MetricBar
            label="Confidence"
            value={confidence}
            icon="smile"
          />

          <MetricBar
            label="Engagement"
            value={engagement}
            icon="pulse"
          />
          
          <MetricBar 
            label="Posture" 
            value={posture} 
            icon="user"
          />
          
          <MetricBar 
            label="Expression" 
            value={expression?.intensity || 0} 
            icon="smile"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="secondary-metrics">
          {/* Lighting Quality */}
          {lighting?.quality && (
            <div className={`metric-card lighting-${lighting.quality}`}>
              <div className="card-icon">
                <Icon name="sun" />
              </div>
              <div className="card-content">
                <h4>Lighting</h4>
                <p className="quality">{lighting.quality.toUpperCase()}</p>
                <p className="brightness">Brightness: {lighting.brightness}/255</p>
                {lighting.recommendation && (
                  <p className="recommendation">{lighting.recommendation}</p>
                )}
              </div>
            </div>
          )}

          {/* Audio-Visual Sync */}
          {audioVisualSync?.status && (
            <div className={`metric-card sync-${audioVisualSync.status}`}>
              <div className="card-icon">
                <Icon name="volume-2" />
              </div>
              <div className="card-content">
                <h4>Audio-Visual</h4>
                <p className="sync-status">{audioVisualSync.status.toUpperCase()}</p>
                <p className="confidence">Confidence: {audioVisualSync.confidence}%</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Overall Quality Score */}
      {qualityScore && (
        <section className="quality-score-section">
          <div className={`quality-badge quality-${qualityScore.status}`}>
            <div className="score-circle">
              <span className="score-number">{qualityScore.overall}</span>
              <span className="score-unit">%</span>
            </div>
            <div className="score-info">
              <h3>Interview Quality</h3>
              <p className="status">{qualityScore.status.toUpperCase().replace('-', ' ')}</p>
            </div>
          </div>
        </section>
      )}

      {/* Real-time Feedback */}
      {feedback && feedback.length > 0 && (
        <section className="feedback-section">
          <h3>Real-time Feedback</h3>
          <div className="feedback-list">
            {feedback.map((item, idx) => (
              <div key={idx} className={`feedback-item severity-${item.severity}`}>
                <div className="feedback-icon">
                  {item.severity === 'critical' && <Icon name="alert-circle" />}
                  {item.severity === 'warning' && <Icon name="alert-triangle" />}
                  {item.severity === 'info' && <Icon name="info" />}
                </div>
                <div className="feedback-content">
                  <p className="message">{item.message}</p>
                  <span className="type">{item.type.replace('-', ' ').toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tips */}
      <section className="tips-section">
        <h4>Tips for Best Results:</h4>
        <ul>
          <li>📍 Look directly at the camera</li>
          <li>💡 Ensure good lighting on your face</li>
          <li>🪑 Sit upright with good posture</li>
          <li>😊 Show confidence and engagement</li>
          <li>🎤 Speak clearly when answering</li>
        </ul>
      </section>
    </div>
  );
}

/**
 * Compact Metrics Display for Interview Progress
 * Shows minimal metrics during interview
 */
export function CompactMetricsDisplay({ metrics, compact = true }) {
  if (!metrics || compact) {
    return (
      <div className="compact-metrics">
        <div className="metric-chip">
          <Icon name="eye" />
          <span>{Math.round(metrics?.eyeContact || 0)}%</span>
        </div>
        <div className="metric-chip">
          <Icon name="user" />
          <span>{Math.round(metrics?.posture || 0)}%</span>
        </div>
        <div className="metric-chip">
          <Icon name="smile" />
          <span>{Math.round(metrics?.expression?.intensity || 0)}%</span>
        </div>
      </div>
    );
  }

  return <EnhancedMetricsDisplay metrics={metrics} />;
}

export default EnhancedMetricsDisplay;

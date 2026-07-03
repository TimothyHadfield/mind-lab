// Presentational AI panel shared by the live and grid modes. It renders the
// confidence/accuracy meters, the counters, and the "leading guess" / reveal.
// All logic lives in the parent; this just displays the passed-in state.

export function Meter({ label, pct, tone }) {
  return (
    <div className="meter">
      <div className="meter-top">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="meter-track">
        <div className={`meter-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function AiPanel({
  statusText,
  predict, // { show, on, label } or null
  confidencePct,
  accuracyPct, // null to hide
  examples,
  examplesLabel,
  positives,
  positivesLabel,
  revealed, // when true, show the confirmed rule
  mapRuleText,
  revealedFooter,
  top = [],
  showGuess = true,
}) {
  return (
    <aside className="cp-ai">
      <div className="ai-head">
        <span className="ai-dot" />
        <h3>The AI</h3>
        <span className="ai-status">{statusText}</span>
      </div>

      {predict && predict.show && (
        <div className={`ai-predict ${predict.on ? 'on' : ''}`}>
          <span className="ai-predict-label">{predict.label}</span>
        </div>
      )}

      <Meter label="Confidence" pct={confidencePct} tone="violet" />
      {accuracyPct != null && (
        <Meter label="Rule fit / accuracy" pct={accuracyPct} tone="green" />
      )}

      <div className="ai-stats">
        <div>
          <strong>{examples}</strong>
          <span>{examplesLabel}</span>
        </div>
        <div>
          <strong>{positives}</strong>
          <span>{positivesLabel}</span>
        </div>
      </div>

      {showGuess &&
        (revealed ? (
          <div className="ai-guess revealed">
            <span className="ai-guess-label">Your rule is</span>
            <span className="ai-guess-rule">{mapRuleText}</span>
            {revealedFooter && <p className="ai-guess-foot">{revealedFooter}</p>}
          </div>
        ) : (
          <div className="ai-guess">
            <span className="ai-guess-label">Leading guess</span>
            <span className="ai-guess-rule">{mapRuleText || '…'}</span>
            {top.length > 1 && (
              <ul className="ai-alts">
                {top.slice(0, 3).map((t, i) => (
                  <li key={i}>
                    <span>{t.text}</span>
                    <em>{Math.round(t.probability * 100)}%</em>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
    </aside>
  )
}

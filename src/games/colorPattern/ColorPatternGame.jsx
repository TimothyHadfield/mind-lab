import { useState, useRef, useEffect, useCallback } from 'react'
import { createRuleEngine } from './ruleEngine.js'

// The palette the player and AI share. Names match the user's mental model
// (red / green / black / blue); hexes are picked to stay distinct on a light box.
const PALETTE = [
  { id: 'red', name: 'red', hex: '#e5484d' },
  { id: 'green', name: 'green', hex: '#30a46c' },
  { id: 'black', name: 'black', hex: '#1f2430' },
  { id: 'blue', name: 'blue', hex: '#3b82f6' },
]

const SPEEDS = [
  { label: 'Slow', ms: 1600 },
  { label: 'Normal', ms: 1100 },
  { label: 'Fast', ms: 750 },
]

const RECENT_LEN = 16

const EMPTY_DISPLAY = {
  examples: 0,
  positives: 0,
  confidence: 0,
  mapAccuracy: 1,
  revealReady: false,
  mapRuleText: '',
  top: [],
  aiPredictsClick: false,
  fireProbability: 0,
}

export default function ColorPatternGame() {
  const engineRef = useRef(null)
  if (!engineRef.current) {
    engineRef.current = createRuleEngine({ palette: PALETTE })
  }

  const [running, setRunning] = useState(false)
  const [speedMs, setSpeedMs] = useState(SPEEDS[1].ms)
  const [currentIdx, setCurrentIdx] = useState(null)
  const [display, setDisplay] = useState(EMPTY_DISPLAY)
  const [recent, setRecent] = useState([])
  const [pendingReveal, setPendingReveal] = useState(null)
  const [phase, setPhase] = useState('training') // 'training' | 'revealed'
  const [clickPulse, setClickPulse] = useState(0)
  const [showHelp, setShowHelp] = useState(false)

  // Refs mirror state that the interval callback needs without going stale.
  const currentRef = useRef(null) // { colorIdx, clicked, aiPredicted }
  const phaseRef = useRef('training')
  const rejectedRef = useRef(new Set())
  const pendingRef = useRef(null)

  const advance = useCallback(() => {
    const engine = engineRef.current

    // Settle the color that was on screen for the last interval.
    const prev = currentRef.current
    if (prev) {
      engine.settle(prev.clicked)
      setRecent((r) =>
        [
          ...r,
          {
            colorIdx: prev.colorIdx,
            userClicked: prev.clicked,
            aiPredicted: prev.aiPredicted,
          },
        ].slice(-RECENT_LEN)
      )
    }

    // Show a new color and get the AI's live prediction for it.
    const nextIdx = Math.floor(Math.random() * PALETTE.length)
    const pred = engine.pushColor(nextIdx)
    currentRef.current = {
      colorIdx: nextIdx,
      clicked: false,
      aiPredicted: pred.aiPredictsClick,
    }
    setCurrentIdx(nextIdx)

    const state = engine.getState()
    setDisplay({
      ...state,
      aiPredictsClick: pred.aiPredictsClick,
      fireProbability: pred.fireProbability,
    })

    // Offer a reveal once the AI is confident — but never re-offer a rule the
    // user has already rejected.
    if (
      phaseRef.current === 'training' &&
      state.revealReady &&
      !pendingRef.current &&
      !rejectedRef.current.has(state.mapRuleText)
    ) {
      const offer = { ruleText: state.mapRuleText, confidence: state.confidence }
      pendingRef.current = offer
      setPendingReveal(offer)
    }
  }, [])

  // Drive the game loop.
  useEffect(() => {
    if (!running) return undefined
    const id = setInterval(advance, speedMs)
    return () => clearInterval(id)
  }, [running, speedMs, advance])

  const registerClick = useCallback(() => {
    if (!running) return
    const cur = currentRef.current
    if (!cur) return
    cur.clicked = true
    setClickPulse((p) => p + 1)
  }, [running])

  // Spacebar = click.
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        registerClick()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [registerClick])

  const handleReset = () => {
    engineRef.current.reset()
    currentRef.current = null
    phaseRef.current = 'training'
    pendingRef.current = null
    rejectedRef.current = new Set()
    setRunning(false)
    setCurrentIdx(null)
    setDisplay(EMPTY_DISPLAY)
    setRecent([])
    setPendingReveal(null)
    setPhase('training')
  }

  const confirmReveal = (correct) => {
    if (correct) {
      phaseRef.current = 'revealed'
      setPhase('revealed')
    } else {
      rejectedRef.current.add(pendingRef.current?.ruleText)
    }
    pendingRef.current = null
    setPendingReveal(null)
  }

  const current = currentIdx == null ? null : PALETTE[currentIdx]
  const confidencePct = Math.round(display.confidence * 100)
  const accuracyPct = Math.round(display.mapAccuracy * 100)

  return (
    <div className="cp">
      <div className="cp-head">
        <div>
          <h2>Color Pattern</h2>
          <p className="cp-sub">
            Invent a secret rule about when to click. The AI will deduce it.
          </p>
        </div>
        <button className="link-btn" onClick={() => setShowHelp((s) => !s)}>
          {showHelp ? 'Hide' : 'How to play'}
        </button>
      </div>

      {showHelp && <HelpPanel />}

      <div className="cp-body">
        {/* -------- Player side -------- */}
        <section className="cp-stage">
          <div
            className={`color-box ${running ? '' : 'is-idle'}`}
            style={{ background: current ? current.hex : '#e9edf5' }}
          >
            {current ? (
              <span className="color-name">{current.name}</span>
            ) : (
              <span className="color-name muted">press Start</span>
            )}
          </div>

          <button
            key={clickPulse}
            className={`click-btn ${clickPulse ? 'pulse' : ''}`}
            onClick={registerClick}
            disabled={!running}
          >
            My rule just happened — CLICK
            <small>(or press Space)</small>
          </button>

          <RecentStrip recent={recent} palette={PALETTE} />

          <div className="cp-controls">
            {running ? (
              <button className="ctl" onClick={() => setRunning(false)}>
                ⏸ Pause
              </button>
            ) : (
              <button className="ctl ctl-primary" onClick={() => setRunning(true)}>
                ▶ Start
              </button>
            )}
            <button className="ctl" onClick={handleReset}>
              ↺ Reset
            </button>
            <div className="speed">
              {SPEEDS.map((s) => (
                <button
                  key={s.ms}
                  className={`speed-opt ${speedMs === s.ms ? 'active' : ''}`}
                  onClick={() => setSpeedMs(s.ms)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* -------- AI side -------- */}
        <aside className="cp-ai">
          <div className="ai-head">
            <span className="ai-dot" />
            <h3>The AI</h3>
            <span className="ai-status">
              {phase === 'revealed'
                ? 'testing itself'
                : running
                  ? 'watching…'
                  : 'idle'}
            </span>
          </div>

          <div
            className={`ai-predict ${display.aiPredictsClick ? 'on' : ''}`}
            title="Lights up when the AI thinks your rule just fired"
          >
            <span className="ai-predict-label">
              {display.aiPredictsClick ? 'I think you clicked!' : 'no click expected'}
            </span>
          </div>

          <Meter label="Confidence" pct={confidencePct} tone="violet" />
          {display.examples > 0 && (
            <Meter label="Rule fit / accuracy" pct={accuracyPct} tone="green" />
          )}

          <div className="ai-stats">
            <div>
              <strong>{display.examples}</strong>
              <span>colors seen</span>
            </div>
            <div>
              <strong>{display.positives}</strong>
              <span>your clicks</span>
            </div>
          </div>

          {phase === 'revealed' ? (
            <div className="ai-guess revealed">
              <span className="ai-guess-label">Your rule is</span>
              <span className="ai-guess-rule">{display.mapRuleText}</span>
              <p className="ai-guess-foot">
                Now watch — I light up my button the instant your rule fires.
              </p>
            </div>
          ) : (
            <div className="ai-guess">
              <span className="ai-guess-label">Leading guess</span>
              <span className="ai-guess-rule">
                {display.examples > 3 ? display.mapRuleText : '…'}
              </span>
              {display.top.length > 1 && (
                <ul className="ai-alts">
                  {display.top.slice(0, 3).map((t, i) => (
                    <li key={i}>
                      <span>{t.text}</span>
                      <em>{Math.round(t.probability * 100)}%</em>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>

      {pendingReveal && (
        <RevealModal reveal={pendingReveal} onAnswer={confirmReveal} />
      )}
    </div>
  )
}

function Meter({ label, pct, tone }) {
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

function RecentStrip({ recent, palette }) {
  return (
    <div className="recent">
      <span className="recent-label">recent</span>
      <div className="recent-row">
        {recent.length === 0 && <span className="recent-empty">—</span>}
        {recent.map((r, i) => (
          <div
            key={i}
            className={`swatch ${r.userClicked ? 'clicked' : ''} ${
              r.aiPredicted ? 'ai' : ''
            }`}
            style={{ background: palette[r.colorIdx].hex }}
            title={`${palette[r.colorIdx].name}${
              r.userClicked ? ' · you clicked' : ''
            }${r.aiPredicted ? ' · AI predicted click' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}

function RevealModal({ reveal, onAnswer }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <span className="modal-eyebrow">I think I've got it</span>
        <h3>Your rule is…</h3>
        <p className="modal-rule">{reveal.ruleText}</p>
        <p className="modal-conf">
          {Math.round(reveal.confidence * 100)}% sure
        </p>
        <div className="modal-actions">
          <button className="ctl ctl-primary" onClick={() => onAnswer(true)}>
            🎯 Yes, that's it!
          </button>
          <button className="ctl" onClick={() => onAnswer(false)}>
            Nope, keep trying
          </button>
        </div>
      </div>
    </div>
  )
}

function HelpPanel() {
  return (
    <div className="help">
      <ol>
        <li>
          Think of a <strong>secret rule</strong> for when to click, based on the
          most recent colors. Keep it simple at first.
        </li>
        <li>
          Press <strong>Start</strong>. Colors appear one at a time. Click your
          button (or Space) <em>every</em> time your rule is satisfied.
        </li>
        <li>
          The AI watches which colors make you click and narrows down the rule.
          When it's confident, it'll announce your rule.
        </li>
      </ol>
      <p className="help-examples">
        Example rules: <code>red</code> · <code>green or blue</code> ·{' '}
        <code>red → any → red</code> · <code>green → black → (green or black)</code>
      </p>
    </div>
  )
}

import { useState, useRef, useCallback, useEffect } from 'react'
import { createNumberRuleEngine } from './numberRuleEngine.js'
import { Meter } from '../colorPattern/AiPanel.jsx'

export default function EleusisGame() {
  const engineRef = useRef(null)
  if (!engineRef.current) engineRef.current = createNumberRuleEngine()
  const askedRef = useRef(new Set())
  const rejectedRef = useRef(new Set())

  const [current, setCurrent] = useState(null)
  const [display, setDisplay] = useState(engineRef.current.getState())
  const [history, setHistory] = useState([]) // { n, fits }
  const [reveal, setReveal] = useState(null)
  const [phase, setPhase] = useState('playing') // 'playing' | 'solved'

  const nextNumber = useCallback(() => {
    const n = engineRef.current.pickNext(askedRef.current)
    askedRef.current.add(n)
    setCurrent(n)
  }, [])

  useEffect(() => {
    nextNumber()
  }, [nextNumber])

  const answer = useCallback(
    (fits) => {
      if (current == null) return
      engineRef.current.record(current, fits)
      setHistory((h) => [...h, { n: current, fits }].slice(-40))
      const st = engineRef.current.getState()
      setDisplay(st)
      if (
        phase === 'playing' &&
        st.revealReady &&
        !rejectedRef.current.has(st.mapRuleText)
      ) {
        setReveal({ text: st.mapRuleText, confidence: st.confidence })
      }
      nextNumber()
    },
    [current, phase, nextNumber]
  )

  const confirmReveal = (correct) => {
    if (correct) setPhase('solved')
    else rejectedRef.current.add(reveal.text)
    setReveal(null)
  }

  const reset = () => {
    engineRef.current.reset()
    askedRef.current = new Set()
    rejectedRef.current = new Set()
    setHistory([])
    setReveal(null)
    setPhase('playing')
    setDisplay(engineRef.current.getState())
    nextNumber()
  }

  const confPct = Math.round(display.confidence * 100)

  return (
    <div className="game eleusis">
      <div className="game-head">
        <div>
          <h2>Guess My Rule</h2>
          <p className="game-sub">
            Think of a secret rule about numbers. I'll test numbers and figure it out.
          </p>
        </div>
        <button className="ctl" onClick={reset}>
          ↺ New rule
        </button>
      </div>

      <div className="mr-body">
        <section className="mr-stage">
          {phase === 'solved' ? (
            <div className="eleusis-solved">
              <span className="muted">Your rule was</span>
              <strong>{display.mapRuleText}</strong>
              <p className="muted">
                Solved in {display.examples} questions. Think of a new one?
              </p>
              <button className="ctl ctl-primary" onClick={reset}>
                New rule
              </button>
            </div>
          ) : (
            <>
              <div className="eleusis-q">
                <span className="muted">Does this number fit your rule?</span>
                <div className="eleusis-number">{current}</div>
              </div>
              <div className="eleusis-buttons">
                <button className="ctl ctl-primary eleusis-yes" onClick={() => answer(true)}>
                  ✓ Fits
                </button>
                <button className="ctl eleusis-no" onClick={() => answer(false)}>
                  ✕ Doesn't fit
                </button>
              </div>
            </>
          )}

          <div className="eleusis-history">
            {history.length === 0 && <span className="recent-empty">tested numbers appear here</span>}
            {history.map((h, i) => (
              <span key={i} className={`eleusis-chip ${h.fits ? 'yes' : 'no'}`}>
                {h.n}
              </span>
            ))}
          </div>
        </section>

        <aside className="cp-ai">
          <div className="ai-head">
            <span className="ai-dot" />
            <h3>The AI</h3>
            <span className="ai-status">
              {phase === 'solved' ? 'solved' : `${display.examples} tested`}
            </span>
          </div>

          <Meter label="Confidence" pct={confPct} tone="violet" />

          <div className="ai-guess">
            <span className="ai-guess-label">Leading guess</span>
            <span className="ai-guess-rule">
              {display.examples > 2 ? display.mapRuleText : '…'}
            </span>
            {display.top && display.top.length > 1 && (
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
        </aside>
      </div>

      {reveal && (
        <div className="modal-backdrop">
          <div className="modal">
            <span className="modal-eyebrow">I think I've got it</span>
            <h3>Your rule is…</h3>
            <p className="modal-rule">{reveal.text}</p>
            <p className="modal-conf">{Math.round(reveal.confidence * 100)}% sure</p>
            <div className="modal-actions">
              <button className="ctl ctl-primary" onClick={() => confirmReveal(true)}>
                🎯 Yes, that's it!
              </button>
              <button className="ctl" onClick={() => confirmReveal(false)}>
                Nope, keep trying
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

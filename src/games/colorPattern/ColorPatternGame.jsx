import { useState, useRef, useEffect, useCallback } from 'react'
import { createRuleEngine } from './ruleEngine.js'
import { PALETTE } from './palette.js'
import AiPanel from './AiPanel.jsx'
import GridMode from './GridMode.jsx'

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
  const [mode, setMode] = useState('live') // 'live' | 'grid'
  const [showHelp, setShowHelp] = useState(false)

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

      <div className="mode-switch">
        <button
          className={`mode-opt ${mode === 'live' ? 'active' : ''}`}
          onClick={() => setMode('live')}
        >
          🎬 Live stream
          <small>colors flash one at a time</small>
        </button>
        <button
          className={`mode-opt ${mode === 'grid' ? 'active' : ''}`}
          onClick={() => setMode('grid')}
        >
          ⚡ Grid blitz
          <small>paint hundreds at once</small>
        </button>
      </div>

      {showHelp && <HelpPanel mode={mode} />}

      {mode === 'live' ? <LiveMode /> : <GridMode />}
    </div>
  )
}

function LiveMode() {
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

  const currentRef = useRef(null) // { colorIdx, clicked, aiPredicted }
  const phaseRef = useRef('training')
  const rejectedRef = useRef(new Set())
  const pendingRef = useRef(null)

  const advance = useCallback(() => {
    const engine = engineRef.current

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
    <div className="cp-body">
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

      <AiPanel
        statusText={
          phase === 'revealed' ? 'testing itself' : running ? 'watching…' : 'idle'
        }
        predict={{
          show: true,
          on: display.aiPredictsClick,
          label: display.aiPredictsClick
            ? 'I think you clicked!'
            : 'no click expected',
        }}
        confidencePct={confidencePct}
        accuracyPct={display.examples > 0 ? accuracyPct : null}
        examples={display.examples}
        examplesLabel="colors seen"
        positives={display.positives}
        positivesLabel="your clicks"
        revealed={phase === 'revealed'}
        mapRuleText={display.examples > 3 ? display.mapRuleText : ''}
        revealedFooter="Now watch — I light up my button the instant your rule fires."
        top={display.top}
        showGuess
      />

      {pendingReveal && (
        <RevealModal reveal={pendingReveal} onAnswer={confirmReveal} />
      )}
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
        <p className="modal-conf">{Math.round(reveal.confidence * 100)}% sure</p>
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

function HelpPanel({ mode }) {
  return (
    <div className="help">
      <ol>
        <li>
          Think of a <strong>secret rule</strong> for when to click, based on the
          most recent colors. Keep it simple at first.
        </li>
        {mode === 'live' ? (
          <li>
            Press <strong>Start</strong>. Colors appear one at a time. Click your
            button (or Space) <em>every</em> time your rule is satisfied.
          </li>
        ) : (
          <li>
            In <strong>Grid blitz</strong>, click or drag down through the squares
            (read left→right, top→bottom) marking where your rule fires. The AI
            updates <em>live</em> with every pick — watch how fast it locks on.
          </li>
        )}
        <li>
          The AI watches which colors make you click and narrows down the rule.
          When it's confident, it announces your rule.
        </li>
      </ol>
      <p className="help-examples">
        Example rules: <code>red</code> · <code>green or blue</code> ·{' '}
        <code>red → any → red</code> · <code>green → black → (green or black)</code>
      </p>
    </div>
  )
}

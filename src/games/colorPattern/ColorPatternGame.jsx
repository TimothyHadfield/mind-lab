import { useState, useRef, useEffect, useCallback } from 'react'
import { createRuleEngine } from './ruleEngine.js'
import { ALL_COLORS, DEFAULT_PALETTE } from './palette.js'
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
  clickPrecision: 1,
  revealReady: false,
  mapRuleText: '',
  top: [],
  aiPredictsClick: false,
}

export default function ColorPatternGame() {
  const [mode, setMode] = useState('grid') // 'grid' | 'live'
  const [moreColors, setMoreColors] = useState(false)
  const palette = moreColors ? ALL_COLORS : DEFAULT_PALETTE

  return (
    <div className="cp">
      <div className="cp-head">
        <div>
          <h2>Color Pattern</h2>
          <p className="cp-sub">Pick a secret rule for when to click. The AI works it out.</p>
        </div>
      </div>

      <RuleGuide palette={palette} />

      <div className="cp-settings">
        <div className="mode-switch">
          <button
            className={`mode-opt ${mode === 'grid' ? 'active' : ''}`}
            onClick={() => setMode('grid')}
          >
            ⚡ Grid
          </button>
          <button
            className={`mode-opt ${mode === 'live' ? 'active' : ''}`}
            onClick={() => setMode('live')}
          >
            🎬 Live
          </button>
        </div>
        <div className="mode-switch">
          <button
            className={`mode-opt ${!moreColors ? 'active' : ''}`}
            onClick={() => setMoreColors(false)}
          >
            3 colors
          </button>
          <button
            className={`mode-opt ${moreColors ? 'active' : ''}`}
            onClick={() => setMoreColors(true)}
          >
            6 colors
          </button>
        </div>
      </div>

      {mode === 'grid' ? (
        <GridMode key={`grid-${palette.length}`} palette={palette} />
      ) : (
        <LiveMode key={`live-${palette.length}`} palette={palette} />
      )}
    </div>
  )
}

function RuleGuide({ palette }) {
  const names = palette.map((c) => c.name).join(', ')
  return (
    <div className="rule-guide">
      <span>
        Rules look at the <strong>last 3 squares</strong>. Each spot can be{' '}
        <strong>one color</strong>, <strong>two colors</strong> (an “or”), or{' '}
        <strong>any</strong>.
      </span>
      <span className="rule-guide-ex">
        e.g. <code>red</code> · <code>red or green</code> ·{' '}
        <code>red → any → red</code>
      </span>
      <span className="rule-guide-colors">
        <em>Colors:</em> {names}
      </span>
    </div>
  )
}

function LiveMode({ palette }) {
  const engineRef = useRef(null)
  if (!engineRef.current) {
    engineRef.current = createRuleEngine({ palette })
  }

  const [running, setRunning] = useState(false)
  const [speedMs, setSpeedMs] = useState(SPEEDS[1].ms)
  const [currentIdx, setCurrentIdx] = useState(null)
  const [display, setDisplay] = useState(EMPTY_DISPLAY)
  const [recent, setRecent] = useState([])
  const [pendingReveal, setPendingReveal] = useState(null)
  const [phase, setPhase] = useState('training')
  const [clickPulse, setClickPulse] = useState(0)

  const currentRef = useRef(null)
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

    const nextIdx = Math.floor(Math.random() * palette.length)
    const pred = engine.pushColor(nextIdx)
    currentRef.current = {
      colorIdx: nextIdx,
      clicked: false,
      aiPredicted: pred.aiPredictsClick,
    }
    setCurrentIdx(nextIdx)

    const state = engine.getState()
    setDisplay({ ...state, aiPredictsClick: pred.aiPredictsClick })

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
  }, [palette])

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

  const current = currentIdx == null ? null : palette[currentIdx]
  const confidencePct = Math.round(display.confidence * 100)
  const precisionPct = Math.round(display.clickPrecision * 100)

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

        <RecentStrip recent={recent} palette={palette} />

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
        accuracyPct={display.examples > 0 ? precisionPct : null}
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

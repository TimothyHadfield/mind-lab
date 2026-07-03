import { useState, useRef, useEffect, useCallback } from 'react'
import { createPredictor } from '../shared/predictor.js'
import { defaultExperts } from '../shared/experts.js'
import { recordRound } from '../shared/stats.js'
import { Meter } from '../colorPattern/AiPanel.jsx'

const CHOICES = [
  { id: 'left', label: 'LEFT', hint: '←' },
  { id: 'right', label: 'RIGHT', hint: '→' },
]
const RECENT = 22

export default function MindReaderGame() {
  const predictorRef = useRef(null)
  if (!predictorRef.current) {
    predictorRef.current = createPredictor({
      symbolCount: 2,
      experts: defaultExperts(4),
    })
  }
  const committedRef = useRef(null)
  const prevRef = useRef(null)

  const [committed, setCommitted] = useState(null)
  const [stats, setStats] = useState({ hits: 0, total: 0 })
  const [recent, setRecent] = useState([])
  const [flash, setFlash] = useState(null) // { move, guess, aiRight }
  const [pulse, setPulse] = useState(0)

  const commitNext = useCallback(() => {
    const c = predictorRef.current.predict()
    committedRef.current = c
    setCommitted(c)
  }, [])

  useEffect(() => {
    commitNext()
  }, [commitNext])

  const play = useCallback(
    (moveIdx) => {
      const c = committedRef.current
      if (!c) return
      const aiRight = c.prediction === moveIdx
      predictorRef.current.record(moveIdx)

      setStats((s) => ({ hits: s.hits + (aiRight ? 1 : 0), total: s.total + 1 }))
      setRecent((r) => [...r, aiRight].slice(-RECENT))
      setFlash({ move: moveIdx, guess: c.prediction, aiRight })
      setPulse((p) => p + 1)

      recordRound({
        game: 'mindReader',
        human: moveIdx,
        predicted: c.prediction,
        correct: aiRight,
        prevHuman: prevRef.current,
        outcome: null,
        symbols: 2,
      })
      prevRef.current = moveIdx
      commitNext()
    },
    [commitNext]
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        play(0)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        play(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [play])

  const reset = () => {
    predictorRef.current.reset()
    committedRef.current = null
    prevRef.current = null
    setStats({ hits: 0, total: 0 })
    setRecent([])
    setFlash(null)
    commitNext()
  }

  const acc = stats.total ? stats.hits / stats.total : 0
  const accPct = Math.round(acc * 100)
  const confPct = committed ? Math.round(committed.confidence * 100) : 50
  const verdict = getVerdict(stats.total, acc)

  return (
    <div className="game mr">
      <div className="game-head">
        <div>
          <h2>Mind Reader</h2>
          <p className="game-sub">
            Press LEFT or RIGHT as randomly as you can. I guess first.
          </p>
        </div>
        <button className="ctl" onClick={reset}>
          ↺ Reset
        </button>
      </div>

      <div className="mr-body">
        <section className="mr-stage">
          <div className={`mr-lock ${flash ? (flash.aiRight ? 'hit' : 'miss') : ''}`}>
            {flash ? (
              flash.aiRight ? (
                <>
                  <strong>Read you.</strong> I knew you'd pick{' '}
                  {CHOICES[flash.guess].label}.
                </>
              ) : (
                <>
                  <strong>Missed.</strong> I guessed {CHOICES[flash.guess].label}.
                </>
              )
            ) : (
              <>🔒 I've locked in my guess. Your move.</>
            )}
          </div>

          <div className="mr-buttons" key={pulse}>
            {CHOICES.map((c, i) => (
              <button key={c.id} className="mr-btn" onClick={() => play(i)}>
                <span className="mr-btn-label">{c.label}</span>
                <span className="mr-btn-hint">{c.hint}</span>
              </button>
            ))}
          </div>

          <div className="recent">
            <span className="recent-label">I predicted you</span>
            <div className="recent-row">
              {recent.length === 0 && <span className="recent-empty">—</span>}
              {recent.map((hit, i) => (
                <div
                  key={i}
                  className={`pip ${hit ? 'good' : 'bad'}`}
                  title={hit ? 'I predicted you' : 'you fooled me'}
                />
              ))}
            </div>
          </div>
        </section>

        <aside className="cp-ai">
          <div className="ai-head">
            <span className="ai-dot" />
            <h3>The AI</h3>
            <span className="ai-status">{stats.total ? 'reading you' : 'ready'}</span>
          </div>

          <Meter label="I predicted you" pct={accPct} tone="violet" />
          <div className="mr-baseline">
            <span>random luck = 50%</span>
            <span>{stats.hits}/{stats.total} rounds</span>
          </div>

          <Meter label="Confidence this round" pct={confPct} tone="green" />

          <div className={`ai-guess ${verdict.tone}`}>
            <span className="ai-guess-label">Verdict</span>
            <span className="ai-guess-rule">{verdict.text}</span>
            <p className="ai-guess-foot">{verdict.foot}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function getVerdict(total, acc) {
  if (total < 15)
    return { text: 'Warming up…', foot: 'Play a few more rounds.', tone: '' }
  if (acc >= 0.62)
    return {
      text: `You're predictable 🔮`,
      foot: `I've read you ${Math.round(acc * 100)}% of the time — well above 50%.`,
      tone: 'revealed',
    }
  if (acc >= 0.55)
    return {
      text: 'Slightly predictable',
      foot: 'There are patterns in you I can exploit.',
      tone: '',
    }
  return {
    text: 'Impressively random 🎲',
    foot: "I'm barely beating a coin flip. Well done.",
    tone: '',
  }
}

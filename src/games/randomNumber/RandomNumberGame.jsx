import { useState, useRef, useEffect, useCallback } from 'react'
import { createPredictor } from '../shared/predictor.js'
import { defaultExperts } from '../shared/experts.js'
import { recordRound } from '../shared/stats.js'
import { Meter } from '../colorPattern/AiPanel.jsx'

const N = 10 // digits 1..10 (index 0..9)
const RECENT = 24
const label = (i) => i + 1

export default function RandomNumberGame() {
  const predictorRef = useRef(null)
  if (!predictorRef.current) {
    predictorRef.current = createPredictor({ symbolCount: N, experts: defaultExperts(3) })
  }
  const committedRef = useRef(null)
  const prevRef = useRef(null)

  const [stats, setStats] = useState({ hits: 0, total: 0 })
  const [recent, setRecent] = useState([])
  const [flash, setFlash] = useState(null) // { guess, pick, hit }

  const commitNext = useCallback(() => {
    committedRef.current = predictorRef.current.predict()
  }, [])

  useEffect(() => {
    commitNext()
  }, [commitNext])

  const play = useCallback(
    (pick) => {
      const c = committedRef.current
      if (!c) return
      const hit = c.prediction === pick
      predictorRef.current.record(pick)
      setStats((s) => ({ hits: s.hits + (hit ? 1 : 0), total: s.total + 1 }))
      setRecent((r) => [...r, hit].slice(-RECENT))
      setFlash({ guess: c.prediction, pick, hit })
      recordRound({
        game: 'randomNumber',
        human: pick,
        predicted: c.prediction,
        correct: hit,
        prevHuman: prevRef.current,
        outcome: null,
        symbols: N,
      })
      prevRef.current = pick
      commitNext()
    },
    [commitNext]
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key >= '1' && e.key <= '9') play(Number(e.key) - 1)
      else if (e.key === '0') play(9)
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
  const verdict = getVerdict(stats.total, acc)

  return (
    <div className="game">
      <div className="game-head">
        <div>
          <h2>Pick a Random Number</h2>
          <p className="game-sub">
            Tap numbers 1–10 as randomly as you can. I guess each one first.
          </p>
        </div>
        <button className="ctl" onClick={reset}>
          ↺ Reset
        </button>
      </div>

      <div className="mr-body">
        <section className="mr-stage">
          <div className={`mr-lock ${flash ? (flash.hit ? 'hit' : 'miss') : ''}`}>
            {flash ? (
              flash.hit ? (
                <>
                  <strong>Got you.</strong> I guessed {label(flash.guess)} — you
                  picked {label(flash.pick)}.
                </>
              ) : (
                <>
                  <strong>Missed.</strong> I guessed {label(flash.guess)}, you
                  picked {label(flash.pick)}.
                </>
              )
            ) : (
              <>🔒 Guess locked in. Pick a number.</>
            )}
          </div>

          <div className="numpad">
            {Array.from({ length: N }, (_, i) => (
              <button key={i} className="numpad-btn" onClick={() => play(i)}>
                {label(i)}
              </button>
            ))}
          </div>

          <div className="recent">
            <span className="recent-label">I predicted you</span>
            <div className="recent-row">
              {recent.length === 0 && <span className="recent-empty">—</span>}
              {recent.map((hit, i) => (
                <div key={i} className={`pip ${hit ? 'good' : 'bad'}`} />
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

          <Meter label="I predicted you" pct={Math.round(acc * 100)} tone="violet" />
          <div className="mr-baseline">
            <span>{stats.hits}/{stats.total} picks</span>
            <span>pure luck = 10%</span>
          </div>

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
  if (total < 15) return { text: 'Warming up…', foot: 'Keep picking.', tone: '' }
  if (acc >= 0.22)
    return {
      text: `You're predictable 🔮`,
      foot: `${Math.round(acc * 100)}% — with 10 numbers, luck alone is 10%.`,
      tone: 'revealed',
    }
  if (acc >= 0.14)
    return { text: 'A few tells', foot: 'You lean on some numbers more than others.', tone: '' }
  return { text: 'Impressively random 🎲', foot: 'Barely above chance. Nice.', tone: '' }
}

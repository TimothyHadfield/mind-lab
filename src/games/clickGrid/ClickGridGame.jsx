import { useState, useRef, useEffect, useCallback } from 'react'
import { createPredictor } from '../shared/predictor.js'
import { defaultExperts } from '../shared/experts.js'
import { recordRound } from '../shared/stats.js'
import { Meter } from '../colorPattern/AiPanel.jsx'

const SIZE = 5
const N = SIZE * SIZE

export default function ClickGridGame() {
  const predictorRef = useRef(null)
  if (!predictorRef.current) {
    predictorRef.current = createPredictor({ symbolCount: N, experts: defaultExperts(2) })
  }
  const committedRef = useRef(null)
  const prevRef = useRef(null)

  const [stats, setStats] = useState({ hits: 0, total: 0 })
  const [flash, setFlash] = useState(null) // { guess, pick, hit }

  const commitNext = useCallback(() => {
    committedRef.current = predictorRef.current.predict()
  }, [])

  useEffect(() => {
    commitNext()
  }, [commitNext])

  const play = useCallback(
    (cell) => {
      const c = committedRef.current
      if (!c) return
      const hit = c.prediction === cell
      predictorRef.current.record(cell)
      setStats((s) => ({ hits: s.hits + (hit ? 1 : 0), total: s.total + 1 }))
      setFlash({ guess: c.prediction, pick: cell, hit })
      recordRound({
        game: 'clickGrid',
        human: cell,
        predicted: c.prediction,
        correct: hit,
        prevHuman: prevRef.current,
        outcome: null,
        symbols: N,
      })
      prevRef.current = cell
      commitNext()
    },
    [commitNext]
  )

  const reset = () => {
    predictorRef.current.reset()
    committedRef.current = null
    prevRef.current = null
    setStats({ hits: 0, total: 0 })
    setFlash(null)
    commitNext()
  }

  const acc = stats.total ? stats.hits / stats.total : 0
  const verdict = getVerdict(stats.total, acc)

  return (
    <div className="game">
      <div className="game-head">
        <div>
          <h2>Where Will You Click?</h2>
          <p className="game-sub">
            Click cells as unpredictably as you can. I guess where you'll go next.
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
                <><strong>Called it.</strong> I predicted that exact cell.</>
              ) : (
                <><strong>Missed.</strong> My guess is outlined below.</>
              )
            ) : (
              <>🔒 I've predicted your next click. Go.</>
            )}
          </div>

          <div className="clickgrid" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
            {Array.from({ length: N }, (_, i) => {
              const isGuess = flash && flash.guess === i
              const isPick = flash && flash.pick === i
              return (
                <button
                  key={i}
                  className={`cell ${isGuess ? 'guess' : ''} ${isPick ? 'pick' : ''} ${
                    isPick && flash.hit ? 'hit' : ''
                  }`}
                  onClick={() => play(i)}
                />
              )
            })}
          </div>
          <p className="clickgrid-legend">
            <span className="swatch-key pick" /> your click
            <span className="swatch-key guess" /> my guess
          </p>
        </section>

        <aside className="cp-ai">
          <div className="ai-head">
            <span className="ai-dot" />
            <h3>The AI</h3>
            <span className="ai-status">{stats.total ? 'reading you' : 'ready'}</span>
          </div>

          <Meter label="I predicted you" pct={Math.round(acc * 100)} tone="violet" />
          <div className="mr-baseline">
            <span>{stats.hits}/{stats.total} clicks</span>
            <span>pure luck = {Math.round((100 / N))}%</span>
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
  const base = 1 / N
  if (total < 20) return { text: 'Warming up…', foot: 'Keep clicking around.', tone: '' }
  if (acc >= base * 2.5)
    return {
      text: `You have spatial habits 🔮`,
      foot: `${Math.round(acc * 100)}% — random clicking would be ${Math.round(base * 100)}%.`,
      tone: 'revealed',
    }
  if (acc >= base * 1.6)
    return { text: 'Some favourite spots', foot: 'You drift toward certain areas.', tone: '' }
  return { text: 'Nicely scattered 🎲', foot: 'Hard to pin down. Well done.', tone: '' }
}

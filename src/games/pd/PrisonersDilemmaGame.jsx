import { useState, useRef, useEffect, useCallback } from 'react'
import { createPredictor } from '../shared/predictor.js'
import { recordRound } from '../shared/stats.js'
import { Meter } from '../colorPattern/AiPanel.jsx'
import { pdExperts } from './pdExperts.js'

// 0 = Cooperate, 1 = Defect. Payoffs [you][ai] from the human's perspective.
const PAY = {
  you: [
    [3, 0],
    [5, 1],
  ],
  ai: [
    [3, 5],
    [0, 1],
  ],
}
const MOVES = ['Cooperate', 'Defect']

export default function PrisonersDilemmaGame() {
  const predictorRef = useRef(null)
  if (!predictorRef.current) {
    predictorRef.current = createPredictor({ symbolCount: 2, experts: pdExperts() })
  }
  const committedRef = useRef(null)
  const prevRef = useRef(null)

  const [score, setScore] = useState({ you: 0, ai: 0 })
  const [predStats, setPredStats] = useState({ hits: 0, total: 0 })
  const [round, setRound] = useState(null) // { you, ai, predicted, correct }

  const commitNext = useCallback(() => {
    committedRef.current = predictorRef.current.predict()
  }, [])

  useEffect(() => {
    commitNext()
  }, [commitNext])

  const play = useCallback(
    (you) => {
      const c = committedRef.current
      if (!c) return
      // The AI acts on its read: it mirrors what it predicts you'll do —
      // cooperating when it expects cooperation, defending when it expects a defect.
      const ai = c.prediction
      const correct = c.prediction === you
      predictorRef.current.record(you, { ai })

      setScore((s) => ({
        you: s.you + PAY.you[you][ai],
        ai: s.ai + PAY.ai[you][ai],
      }))
      setPredStats((s) => ({ hits: s.hits + (correct ? 1 : 0), total: s.total + 1 }))
      setRound({ you, ai, predicted: c.prediction, correct })

      recordRound({
        game: 'pd',
        human: you,
        predicted: c.prediction,
        correct,
        prevHuman: prevRef.current,
        outcome: null,
        symbols: 2,
      })
      prevRef.current = you
      commitNext()
    },
    [commitNext]
  )

  const reset = () => {
    predictorRef.current.reset()
    committedRef.current = null
    prevRef.current = null
    setScore({ you: 0, ai: 0 })
    setPredStats({ hits: 0, total: 0 })
    setRound(null)
    commitNext()
  }

  const acc = predStats.total ? predStats.hits / predStats.total : 0
  const verdict = getVerdict(predStats.total, acc)

  return (
    <div className="game">
      <div className="game-head">
        <div>
          <h2>Prisoner's Dilemma</h2>
          <p className="game-sub">
            Cooperate or defect each round. I predict your move and play it back at you.
          </p>
        </div>
        <button className="ctl" onClick={reset}>
          ↺ Reset
        </button>
      </div>

      <div className="mr-body">
        <section className="mr-stage">
          <div className={`pd-result ${round ? (round.you ? 'defect' : 'coop') : ''}`}>
            {round ? (
              <>
                <div className="pd-result-row">
                  <span>You <strong>{MOVES[round.you]}</strong></span>
                  <span>AI <strong>{MOVES[round.ai]}</strong></span>
                </div>
                <div className="pd-result-pay">
                  You +{PAY.you[round.you][round.ai]} · AI +{PAY.ai[round.you][round.ai]}
                </div>
                <div className="pd-result-read">
                  {round.correct ? '🔮 I read you correctly.' : '😮 You surprised me.'}
                </div>
              </>
            ) : (
              <span className="muted">Make your move — I've already guessed it.</span>
            )}
          </div>

          <div className="pd-buttons">
            <button className="pd-btn coop" onClick={() => play(0)}>
              🤝 Cooperate
            </button>
            <button className="pd-btn defect" onClick={() => play(1)}>
              🔪 Defect
            </button>
          </div>

          <table className="pd-matrix">
            <tbody>
              <tr>
                <td className="pd-matrix-h"></td>
                <td className="pd-matrix-h">AI Coop</td>
                <td className="pd-matrix-h">AI Defect</td>
              </tr>
              <tr>
                <td className="pd-matrix-h">You Coop</td>
                <td>3 / 3</td>
                <td>0 / 5</td>
              </tr>
              <tr>
                <td className="pd-matrix-h">You Defect</td>
                <td>5 / 0</td>
                <td>1 / 1</td>
              </tr>
            </tbody>
          </table>
        </section>

        <aside className="cp-ai">
          <div className="ai-head">
            <span className="ai-dot" />
            <h3>The AI</h3>
            <span className="ai-status">{predStats.total ? 'reading you' : 'ready'}</span>
          </div>

          <div className="rps-score">
            <div className="rps-score-cell you">
              <strong>{score.you}</strong>
              <span>you</span>
            </div>
            <div className="rps-score-cell ai">
              <strong>{score.ai}</strong>
              <span>AI</span>
            </div>
          </div>

          <Meter label="I predicted you" pct={Math.round(acc * 100)} tone="violet" />
          <div className="mr-baseline">
            <span>{predStats.hits}/{predStats.total} rounds</span>
            <span>coin flip = 50%</span>
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
  if (total < 12) return { text: 'Warming up…', foot: 'Play a few rounds.', tone: '' }
  if (acc >= 0.68)
    return {
      text: `You're an open book 🔮`,
      foot: `I've read you ${Math.round(acc * 100)}% of the time — try breaking your pattern.`,
      tone: 'revealed',
    }
  if (acc >= 0.56)
    return { text: 'Somewhat readable', foot: 'You reciprocate in ways I can model.', tone: '' }
  return { text: 'Hard to read 🎲', foot: 'No reciprocity pattern I can lock onto.', tone: '' }
}

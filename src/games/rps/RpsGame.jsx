import { useState, useRef, useEffect, useCallback } from 'react'
import { createPredictor } from '../shared/predictor.js'
import { recordRound } from '../shared/stats.js'
import { Meter } from '../colorPattern/AiPanel.jsx'
import { rpsExperts, beats } from './rpsExperts.js'

const MOVES = [
  { id: 'rock', label: 'Rock', icon: '✊' },
  { id: 'paper', label: 'Paper', icon: '✋' },
  { id: 'scissors', label: 'Scissors', icon: '✌️' },
]

// Outcome from the human's perspective.
function outcomeOf(human, ai) {
  if (human === ai) return 'T'
  return human === beats(ai) ? 'W' : 'L'
}

export default function RpsGame() {
  const predictorRef = useRef(null)
  if (!predictorRef.current) {
    predictorRef.current = createPredictor({ symbolCount: 3, experts: rpsExperts() })
  }
  const committedRef = useRef(null)
  const prevRef = useRef(null)

  const [committed, setCommitted] = useState(null)
  const [score, setScore] = useState({ ai: 0, you: 0, tie: 0 })
  const [round, setRound] = useState(null) // { human, ai, outcome }
  const [pulse, setPulse] = useState(0)

  const commitNext = useCallback(() => {
    const c = predictorRef.current.predict()
    committedRef.current = { ...c, aiMove: beats(c.prediction) }
    setCommitted(committedRef.current)
  }, [])

  useEffect(() => {
    commitNext()
  }, [commitNext])

  const play = useCallback(
    (human) => {
      const c = committedRef.current
      if (!c) return
      const ai = c.aiMove
      const outcome = outcomeOf(human, ai)
      const aiRight = c.prediction === human
      predictorRef.current.record(human, { ai, outcome })

      setScore((s) => ({
        ai: s.ai + (outcome === 'L' ? 1 : 0),
        you: s.you + (outcome === 'W' ? 1 : 0),
        tie: s.tie + (outcome === 'T' ? 1 : 0),
      }))
      setRound({ human, ai, outcome })
      setPulse((p) => p + 1)

      recordRound({
        game: 'rps',
        human,
        predicted: c.prediction,
        correct: aiRight,
        prevHuman: prevRef.current,
        outcome,
        symbols: 3,
      })
      prevRef.current = human
      commitNext()
    },
    [commitNext]
  )

  useEffect(() => {
    const onKey = (e) => {
      const map = { r: 0, p: 1, s: 2 }
      if (e.key.toLowerCase() in map) play(map[e.key.toLowerCase()])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [play])

  const reset = () => {
    predictorRef.current.reset()
    committedRef.current = null
    prevRef.current = null
    setScore({ ai: 0, you: 0, tie: 0 })
    setRound(null)
    commitNext()
  }

  const total = score.ai + score.you + score.tie
  const aiWinPct = total ? Math.round((score.ai / total) * 100) : 0
  const youWinPct = total ? Math.round((score.you / total) * 100) : 0
  const verdict = getVerdict(total, total ? score.ai / total : 0)

  return (
    <div className="game rps">
      <div className="game-head">
        <div>
          <h2>Rock · Paper · Scissors</h2>
          <p className="game-sub">
            I predict your throw and counter it. Try to beat me over many rounds.
          </p>
        </div>
        <button className="ctl" onClick={reset}>
          ↺ Reset
        </button>
      </div>

      <div className="mr-body">
        <section className="mr-stage">
          <div className={`rps-arena ${round ? `out-${round.outcome}` : ''}`} key={pulse}>
            <div className="rps-hand">
              <span className="rps-emoji">{round ? MOVES[round.human].icon : '❔'}</span>
              <span className="rps-who">you</span>
            </div>
            <div className="rps-result">
              {round ? resultText(round.outcome) : 'go'}
            </div>
            <div className="rps-hand">
              <span className="rps-emoji">{round ? MOVES[round.ai].icon : '🤖'}</span>
              <span className="rps-who">AI</span>
            </div>
          </div>

          <div className="rps-buttons">
            {MOVES.map((m, i) => (
              <button key={m.id} className="rps-btn" onClick={() => play(i)}>
                <span className="rps-btn-icon">{m.icon}</span>
                <span className="rps-btn-label">{m.label}</span>
              </button>
            ))}
          </div>
          <p className="rps-keys">keys: R · P · S</p>
        </section>

        <aside className="cp-ai">
          <div className="ai-head">
            <span className="ai-dot" />
            <h3>The AI</h3>
            <span className="ai-status">{total ? 'countering you' : 'ready'}</span>
          </div>

          <div className="rps-score">
            <div className="rps-score-cell ai">
              <strong>{score.ai}</strong>
              <span>AI</span>
            </div>
            <div className="rps-score-cell">
              <strong>{score.tie}</strong>
              <span>ties</span>
            </div>
            <div className="rps-score-cell you">
              <strong>{score.you}</strong>
              <span>you</span>
            </div>
          </div>

          <Meter label="AI win rate" pct={aiWinPct} tone="violet" />
          <div className="mr-baseline">
            <span>fair game = 33%</span>
            <span>you win {youWinPct}%</span>
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

function resultText(o) {
  return o === 'W' ? 'you win' : o === 'L' ? 'AI wins' : 'tie'
}

function getVerdict(total, aiRate) {
  if (total < 15)
    return { text: 'Warming up…', foot: 'Play a few more rounds.', tone: '' }
  if (aiRate >= 0.45)
    return {
      text: `I'm reading you 🔮`,
      foot: `I win ${Math.round(aiRate * 100)}% — a fair game is 33%.`,
      tone: 'revealed',
    }
  if (aiRate >= 0.37)
    return { text: 'Edge to me', foot: 'I can see some of your habits.', tone: '' }
  return {
    text: 'Dead even 🎲',
    foot: "You're keeping me honest — no exploitable pattern.",
    tone: '',
  }
}

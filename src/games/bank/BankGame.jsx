import { useState, useRef, useCallback } from 'react'
import { recordRound } from '../shared/stats.js'
import { Meter } from '../colorPattern/AiPanel.jsx'
import { createBankPredictor } from './bankPredictor.js'
import {
  ROUNDS,
  HUMAN,
  AIS,
  PLAYERS,
  newGame,
  rollDice,
  applyRoll,
  aiShouldBank,
  aiBankStep,
  allBanked,
  advanceRound,
  contextOf,
} from './bankGame.js'

const NAMES = { human: 'You', ai1: 'Cautious Cal', ai2: 'Bold Bella' }

// After the human is out, play the round to its end for the remaining AIs. Their
// decisions come only from game state, so there's nothing to leak here.
function finishForAIs(state) {
  let s = state
  let guard = 0
  while (!allBanked(s) && guard++ < 80) {
    const dice = rollDice()
    const r = applyRoll(s, dice)
    s = {
      ...s,
      lastDice: dice,
      turnTotal: r.turnTotal,
      rollCount: r.rollCount,
      justDoubled: r.justDoubled,
    }
    if (r.busted) break
    const b = aiBankStep(s)
    s = { ...s, banked: b.banked, scores: b.scores }
  }
  return advanceRound(s)
}

export default function BankGame() {
  const predictorRef = useRef(null)
  if (!predictorRef.current) predictorRef.current = createBankPredictor()
  const gRef = useRef(newGame())
  const committedRef = useRef(null)
  const prevRef = useRef(null)

  const [g, setGState] = useState(gRef.current)
  const [reveal, setReveal] = useState(null) // { predictedBank, correct }
  const [predStats, setPredStats] = useState({ hits: 0, total: 0 })
  const [locked, setLocked] = useState(false)

  const setGame = (ns) => {
    gRef.current = ns
    setGState(ns)
  }

  // Commit a hidden prediction for the human's next real decision (pot > 0).
  const commitFor = useCallback((state) => {
    if (!state.over && !state.banked[HUMAN] && state.turnTotal > 0) {
      const ctx = contextOf(state)
      const p = predictorRef.current.predict(ctx)
      committedRef.current = { ctx, prediction: p.prediction }
      setLocked(true)
    } else {
      committedRef.current = null
      setLocked(false)
    }
  }, [])

  // Reveal + learn from the decision the human just made.
  const resolve = useCallback((label) => {
    const c = committedRef.current
    if (!c) return
    predictorRef.current.record(c.ctx, label === 1)
    const correct = c.prediction === label
    setReveal({ predictedBank: c.prediction === 1, correct })
    setPredStats((s) => ({ hits: s.hits + (correct ? 1 : 0), total: s.total + 1 }))
    recordRound({
      game: 'bank',
      human: label,
      predicted: c.prediction,
      correct,
      prevHuman: prevRef.current,
      outcome: null,
      symbols: 2,
    })
    prevRef.current = label
    committedRef.current = null
    setLocked(false)
  }, [])

  // Every decision resolves SIMULTANEOUSLY: the AIs decide at the current pot
  // from game state alone, the human decides independently, and the AI choices
  // are only revealed after the human has committed. Neither reads the other.
  const humanDecision = useCallback(
    (humanBanks) => {
      const s = gRef.current
      if (s.over || s.banked[HUMAN]) return
      if (humanBanks && s.turnTotal <= 0) return

      resolve(humanBanks ? 1 : 0)

      const banked = { ...s.banked }
      const scores = { ...s.scores }
      const aiNames = []
      for (const ai of AIS) {
        if (!banked[ai.id] && aiShouldBank(ai, s.turnTotal, s.rollCount)) {
          banked[ai.id] = true
          scores[ai.id] = s.roundStart[ai.id] + s.turnTotal
          aiNames.push(ai.name)
        }
      }
      if (humanBanks) {
        banked[HUMAN] = true
        scores[HUMAN] = s.roundStart[HUMAN] + s.turnTotal
      }
      let ns = { ...s, banked, scores }
      const youMsg = humanBanks ? `You banked ${s.turnTotal}. ` : ''
      const aiMsg = aiNames.length ? `${aiNames.join(' & ')} banked ${s.turnTotal}. ` : ''

      if (allBanked(ns)) {
        ns = advanceRound({ ...ns, lastEvent: `${youMsg}${aiMsg}Round over.` })
      } else if (banked[HUMAN]) {
        // Human is out — play the rest of the round for the AIs.
        ns = finishForAIs({ ...ns, lastEvent: `${youMsg}${aiMsg}AIs play on…` })
      } else {
        // Human continues — roll the shared dice to the next pot.
        const dice = rollDice()
        const r = applyRoll(ns, dice)
        ns = {
          ...ns,
          lastDice: dice,
          turnTotal: r.turnTotal,
          rollCount: r.rollCount,
          justDoubled: r.justDoubled,
          lastEvent: `${aiMsg}Rolled ${dice[0]} + ${dice[1]} — ${r.note}`,
        }
        if (r.busted) ns = advanceRound(ns)
      }
      setGame(ns)
      commitFor(ns)
    },
    [resolve, commitFor]
  )

  const restart = () => {
    predictorRef.current.reset()
    committedRef.current = null
    prevRef.current = null
    const ng = newGame()
    setGame(ng)
    setReveal(null)
    setPredStats({ hits: 0, total: 0 })
    setLocked(false)
  }

  const acc = predStats.total ? predStats.hits / predStats.total : 0
  const canBank = !g.over && !g.banked[HUMAN] && g.turnTotal > 0

  return (
    <div className="game bank">
      <div className="game-head">
        <div>
          <h2>Bank</h2>
          <p className="game-sub">
            Push your luck for points — but I'm learning when you'll cash out.
          </p>
        </div>
        <button className="ctl" onClick={restart}>
          ↺ New game
        </button>
      </div>

      <div className="mr-body">
        <section className="mr-stage">
          <div className="bank-scoreboard">
            {PLAYERS.map((p) => (
              <div
                key={p}
                className={`bank-player ${p === HUMAN ? 'me' : ''} ${
                  g.banked[p] ? 'banked' : ''
                }`}
              >
                <span className="bank-player-name">{NAMES[p]}</span>
                <strong>{g.scores[p]}</strong>
                <span className="bank-player-tag">
                  {g.banked[p] ? 'banked' : 'in'}
                </span>
              </div>
            ))}
          </div>

          <div className="bank-pot">
            <div className="bank-pot-round">
              Round {Math.min(g.round, ROUNDS)} / {ROUNDS}
            </div>
            <div className="bank-pot-total">{g.turnTotal}</div>
            <div className="bank-pot-label">pot · {g.rollCount} rolls</div>
            <div className="bank-pot-event">{g.lastEvent}</div>
          </div>

          {g.over ? (
            <div className="bank-gameover">
              <strong>
                {g.winner === HUMAN ? '🏆 You win!' : `${NAMES[g.winner]} wins.`}
              </strong>
              <button className="ctl ctl-primary" onClick={restart}>
                Play again
              </button>
            </div>
          ) : (
            <div className="bank-actions">
              <button
                className="ctl ctl-primary bank-roll"
                onClick={() => humanDecision(false)}
              >
                🎲 Roll
              </button>
              <button
                className="ctl bank-bank"
                onClick={() => humanDecision(true)}
                disabled={!canBank}
              >
                💰 Bank ({g.turnTotal})
              </button>
            </div>
          )}
        </section>

        <aside className="cp-ai">
          <div className="ai-head">
            <span className="ai-dot" />
            <h3>The AI</h3>
            <span className="ai-status">
              {locked ? '🔒 predicted' : g.over ? 'game over' : 'watching'}
            </span>
          </div>

          <div className={`bank-reveal ${reveal ? (reveal.correct ? 'hit' : 'miss') : ''}`}>
            {reveal ? (
              <>
                <strong>
                  {reveal.correct ? 'Called it.' : 'You fooled me.'}
                </strong>{' '}
                I predicted you'd {reveal.predictedBank ? 'BANK' : 'ROLL'}.
              </>
            ) : (
              'Make a move — I guess it just before you commit, then show you.'
            )}
          </div>

          <Meter label="I predicted you" pct={Math.round(acc * 100)} tone="violet" />
          <div className="mr-baseline">
            <span>{predStats.hits}/{predStats.total} decisions</span>
            <span>coin flip = 50%</span>
          </div>

          <p className="bank-hint muted">
            Cal banks at 140, Bella at 240. Rolls 1–3 are safe (a 7 = +70). After
            that a 7 busts, doubles double the pot.
          </p>
        </aside>
      </div>
    </div>
  )
}

// bankGame.js
//
// The BANK dice game, rules copied from the bank-evolution project:
//   - 10 rounds; each round accumulates a shared pot (turnTotal) over rolls.
//   - Rolls 1-3 are "safe": a 7 adds +70; otherwise add the dice sum.
//   - After roll 3: a 7 BUSTS (pot lost), doubles DOUBLE the pot, else add sum.
//   - Banking locks the current pot into your score; you're then out for the round.
// Here it's the human plus two simple threshold AIs to play against — the AI's
// sophistication is irrelevant; it's just an opponent. The interesting part
// (predicting the human's bank/roll choice) lives in bankPredictor.js.

export const ROUNDS = 10
export const HUMAN = 'human'
export const AIS = [
  { id: 'ai1', name: 'Cautious Cal', threshold: 140 },
  { id: 'ai2', name: 'Bold Bella', threshold: 240 },
]
export const PLAYERS = [HUMAN, ...AIS.map((a) => a.id)]

export function newGame() {
  const zero = {}
  PLAYERS.forEach((p) => (zero[p] = 0))
  return {
    round: 1,
    turnTotal: 0,
    rollCount: 0,
    justDoubled: false,
    scores: { ...zero },
    roundStart: { ...zero },
    banked: {},
    lastDice: null,
    lastEvent: 'Roll to start round 1.',
    over: false,
    winner: null,
  }
}

export function rollDice() {
  return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]
}

// Apply a roll to the shared pot. Pure given the dice.
export function applyRoll(state, dice) {
  const [d1, d2] = dice
  const sum = d1 + d2
  const rc = state.rollCount + 1
  let tt = state.turnTotal
  let jd = false
  let busted = false
  let note
  if (rc <= 3) {
    tt += sum === 7 ? 70 : sum
    note = sum === 7 ? '7 → +70 (safe)' : `+${sum}`
  } else if (sum === 7) {
    busted = true
    tt = 0
    note = '7 — BUST!'
  } else if (d1 === d2) {
    tt *= 2
    jd = true
    note = `double ${d1}s → ×2`
  } else {
    tt += sum
    note = `+${sum}`
  }
  return { turnTotal: tt, rollCount: rc, justDoubled: jd, busted, note }
}

export const aiShouldBank = (ai, turnTotal, rollCount) =>
  rollCount > 3 && turnTotal >= ai.threshold

export function standingOf(state) {
  const best = Math.max(...AIS.map((a) => state.scores[a.id]))
  return Math.sign(state.scores[HUMAN] - best)
}

export function contextOf(state) {
  return {
    rollCount: state.rollCount,
    turnTotal: state.turnTotal,
    standing: standingOf(state),
    justDoubled: state.justDoubled,
  }
}

// Un-banked AIs bank if their threshold is met at the current pot.
export function aiBankStep(state) {
  const banked = { ...state.banked }
  const scores = { ...state.scores }
  for (const ai of AIS) {
    if (!banked[ai.id] && aiShouldBank(ai, state.turnTotal, state.rollCount)) {
      banked[ai.id] = true
      scores[ai.id] = state.roundStart[ai.id] + state.turnTotal
    }
  }
  return { banked, scores }
}

export const allBanked = (state) => PLAYERS.every((p) => state.banked[p])

// Settle the current round and move to the next (or end the game).
export function advanceRound(state) {
  if (state.round >= ROUNDS) {
    const winner = PLAYERS.reduce(
      (best, p) => (state.scores[p] > state.scores[best] ? p : best),
      PLAYERS[0]
    )
    return { ...state, over: true, winner, turnTotal: 0 }
  }
  return {
    ...state,
    round: state.round + 1,
    turnTotal: 0,
    rollCount: 0,
    justDoubled: false,
    banked: {},
    roundStart: { ...state.scores },
  }
}

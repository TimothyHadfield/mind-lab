// pdExperts.js
//
// Prisoner's Dilemma specific experts. Symbols: 0 = Cooperate, 1 = Defect.
// aux[i] = { ai: <AI's move that round> }. These capture the reciprocity people
// actually use — tit-for-tat (mirror the opponent's last move) and outcome-
// conditioned habits — on top of the generic frequency / Markov experts.

import { frequencyExpert, markovExpert } from '../shared/experts.js'

// Tit-for-tat: predict you'll copy the AI's previous move.
export function reciprocityExpert() {
  return {
    name: 'reciprocity',
    predict(history, aux, S) {
      const n = history.length
      if (n < 1 || !aux[n - 1]) return null
      const target = aux[n - 1].ai
      const d = new Array(S).fill(0.2)
      d[target] = 0.8
      let sum = 0
      for (const v of d) sum += v
      return d.map((v) => v / sum)
    },
  }
}

// What you do next given (your last move, the AI's last move).
export function pairConditionedExpert() {
  return {
    name: 'pair-conditioned',
    predict(history, aux, S, smoothing) {
      const n = history.length
      if (n < 2 || !aux[n - 1]) return null
      const lastMe = history[n - 1]
      const lastAi = aux[n - 1].ai
      const counts = new Array(S).fill(0)
      let seen = 0
      for (let i = 0; i < n - 1; i++) {
        if (history[i] === lastMe && aux[i] && aux[i].ai === lastAi) {
          counts[history[i + 1]]++
          seen++
        }
      }
      if (seen === 0) return null
      const total = seen + smoothing * S
      return counts.map((c) => (c + smoothing) / total)
    },
  }
}

export function pdExperts() {
  return [
    frequencyExpert(),
    markovExpert(1),
    markovExpert(2),
    reciprocityExpert(),
    pairConditionedExpert(),
  ]
}

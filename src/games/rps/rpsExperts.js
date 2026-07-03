// rpsExperts.js
//
// Rock-Paper-Scissors specific experts. Symbols: 0=Rock, 1=Paper, 2=Scissors.
// The move that beats m is (m+1)%3. These encode well-documented human RPS
// tendencies (Wang/Xu/Zhou "social cycling", and win-stay/lose-shift):
//   - after winning, people tend to repeat; after losing, they switch.
//   - people tend to play the move that would have beaten the opponent's last.
// aux[i] = { ai: <AI move that round>, outcome: 'W'|'L'|'T' from human's view }.

import { frequencyExpert, markovExpert } from '../shared/experts.js'

export const beats = (m) => (m + 1) % 3

// Win-stay / lose-shift: predict the next move from (last move, last outcome).
export function outcomeConditionedExpert() {
  return {
    name: 'winstay-loseshift',
    predict(history, aux, S, smoothing) {
      const n = history.length
      if (n < 2) return null
      const lastMove = history[n - 1]
      const lastOut = aux[n - 1] && aux[n - 1].outcome
      if (!lastOut) return null
      const counts = new Array(S).fill(0)
      let seen = 0
      for (let i = 0; i < n - 1; i++) {
        if (history[i] === lastMove && aux[i] && aux[i].outcome === lastOut) {
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

// People often play the move that beats the opponent's (AI's) last move.
export function beatLastAiExpert() {
  return {
    name: 'beat-last-ai',
    predict(history, aux, S) {
      const n = history.length
      if (n < 1 || !aux[n - 1]) return null
      const target = beats(aux[n - 1].ai)
      const d = new Array(S).fill(0.15)
      d[target] = 0.7
      let sum = 0
      for (const v of d) sum += v
      return d.map((v) => v / sum)
    },
  }
}

export function rpsExperts() {
  return [
    frequencyExpert(),
    markovExpert(1),
    markovExpert(2),
    outcomeConditionedExpert(),
    beatLastAiExpert(),
  ]
}

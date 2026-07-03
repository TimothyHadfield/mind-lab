// experts.js
//
// Generic "expert" predictors over a symbol sequence. Each expert is a PURE
// function of the history: given the symbols so far, it returns a probability
// distribution over the next symbol (or null to abstain when it has no basis
// yet). The portfolio predictor blends them via a meta-learner.
//
// These encode the ways humans fail to be random:
//   - frequency: you favour some options overall.
//   - markov-k:  your next move depends on your last k moves (you over-alternate,
//                avoid repeats, fall into little loops).

// Overall symbol frequencies (smoothed).
export function frequencyExpert() {
  return {
    name: 'frequency',
    predict(history, aux, S, smoothing) {
      if (history.length === 0) return null
      const counts = new Array(S).fill(smoothing)
      for (const s of history) counts[s]++
      const total = history.length + smoothing * S
      return counts.map((c) => c / total)
    },
  }
}

// Order-k Markov: distribution of the next symbol given the last k symbols,
// learned from every earlier occurrence of that same k-context.
export function markovExpert(k) {
  return {
    name: `markov${k}`,
    predict(history, aux, S, smoothing) {
      const n = history.length
      if (n < k + 1) return null
      const ctxStart = n - k
      const counts = new Array(S).fill(0)
      let seen = 0
      for (let i = k; i < n; i++) {
        let match = true
        for (let j = 0; j < k; j++) {
          if (history[i - k + j] !== history[ctxStart + j]) {
            match = false
            break
          }
        }
        if (match) {
          counts[history[i]]++
          seen++
        }
      }
      if (seen === 0) return null
      const total = seen + smoothing * S
      return counts.map((c) => (c + smoothing) / total)
    },
  }
}

// A convenient default portfolio for a pure symbol sequence (e.g. Mind Reader).
export function defaultExperts(maxOrder = 4) {
  const experts = [frequencyExpert()]
  for (let k = 1; k <= maxOrder; k++) experts.push(markovExpert(k))
  return experts
}

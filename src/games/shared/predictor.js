// predictor.js
//
// Online sequence predictor: a PORTFOLIO of expert predictors combined by a
// Hedge (multiplicative-weights) meta-learner. Each turn it mixes the experts'
// predictions weighted by how well each has predicted THIS player lately, then
// down-weights the ones that were wrong. This is the multi-model approach that
// reliably beats humans at binary prediction and Rock-Paper-Scissors — because
// humans can't produce a truly random stream.
//
// Usage per turn:
//   const { prediction } = predictor.predict()   // AI commits a guess
//   ...human makes their move `m`...
//   predictor.record(m, auxInfo)                 // learn from the outcome

export function createPredictor({
  symbolCount,
  experts,
  eta = 0.7, // meta-learner learning rate
  share = 0.02, // fixed-share: keeps it adaptive if you change strategy
  smoothing = 0.5,
}) {
  const S = symbolCount
  const E = experts.length
  let weights = new Array(E).fill(1 / E)
  const history = [] // symbol indices
  const aux = [] // parallel game-specific info (outcomes, AI moves, ...)
  let lastDists = null // per-expert distributions from the latest predict()

  const uniform = () => new Array(S).fill(1 / S)

  function combine() {
    const dists = experts.map(
      (ex) => ex.predict(history, aux, S, smoothing) || uniform()
    )
    const combined = new Array(S).fill(0)
    for (let e = 0; e < E; e++) {
      const w = weights[e]
      const d = dists[e]
      for (let s = 0; s < S; s++) combined[s] += w * d[s]
    }
    let sum = 0
    for (const v of combined) sum += v
    if (sum <= 0) return { dists, combined: uniform() }
    for (let s = 0; s < S; s++) combined[s] /= sum
    return { dists, combined }
  }

  // Predict (and commit) the next symbol.
  function predict() {
    const { dists, combined } = combine()
    lastDists = dists
    let best = 0
    for (let s = 1; s < S; s++) if (combined[s] > combined[best]) best = s
    return { distribution: combined, prediction: best, confidence: combined[best] }
  }

  // Record the actual symbol and learn from it.
  function record(symbol, auxObj = null) {
    if (lastDists) {
      const next = new Array(E)
      for (let e = 0; e < E; e++) {
        const p = Math.max(1e-6, lastDists[e][symbol])
        next[e] = weights[e] * Math.exp(-eta * -Math.log(p)) // = w * p^eta
      }
      let sum = 0
      for (const w of next) sum += w
      for (let e = 0; e < E; e++) {
        next[e] = sum > 0 ? next[e] / sum : 1 / E
        next[e] = (1 - share) * next[e] + share / E // fixed-share mixing
      }
      weights = next
      lastDists = null
    }
    history.push(symbol)
    aux.push(auxObj)
  }

  return {
    predict,
    record,
    reset() {
      weights = new Array(E).fill(1 / E)
      history.length = 0
      aux.length = 0
      lastDists = null
    },
    get length() {
      return history.length
    },
    get weights() {
      return weights.slice()
    },
    expertNames: experts.map((e) => e.name),
  }
}

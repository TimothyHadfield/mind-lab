// numberRuleEngine.js
//
// Concept-learning engine for the Eleusis / "Guess My Rule" game. The player has
// a secret rule about numbers (even, > 50, multiple of 3, prime, ...). The AI
// plays scientist: it proposes a number, the player says whether it fits, and the
// AI keeps a Bayesian posterior over a fixed set of candidate rules. It chooses
// the MOST INFORMATIVE number to ask next (the one it's least sure about), and
// announces the rule once one hypothesis dominates. Same Bayesian recipe as the
// Color Pattern engine: simplicity prior + a small mislabel-noise likelihood.

function isPrime(n) {
  if (n < 2) return false
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false
  return true
}

// Candidate rules. `cost` drives the Occam prior (simpler concepts are cheaper).
function buildHypotheses() {
  const H = []
  const add = (name, test, cost) => H.push({ name, test, cost })

  add('even numbers', (n) => n % 2 === 0, 1)
  add('odd numbers', (n) => n % 2 === 1, 1)
  add('prime numbers', isPrime, 2.5)
  add('single-digit numbers', (n) => n < 10, 2)
  add('two-digit numbers', (n) => n >= 10, 2)

  // thresholds
  const thresholds = [10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90]
  for (const t of thresholds) {
    const cost = t === 50 ? 2 : t % 10 === 0 ? 3 : 3.5
    add(`greater than ${t}`, (n) => n > t, cost)
    add(`less than ${t}`, (n) => n < t, cost)
  }

  // multiples
  const mults = { 3: 2.5, 4: 3, 5: 2, 6: 3.5, 7: 3.5, 10: 2, 25: 3 }
  for (const k of Object.keys(mults)) {
    add(`multiples of ${k}`, (n) => n % Number(k) === 0, mults[k])
  }

  add('ends in 5', (n) => n % 10 === 5, 3)
  add('between 40 and 60', (n) => n >= 40 && n <= 60, 3.5)
  add('between 25 and 75', (n) => n >= 25 && n <= 75, 3.5)

  return H
}

const DEFAULTS = {
  domainMin: 1,
  domainMax: 100,
  noise: 0.05,
  priorLambda: 1.0,
  revealThreshold: 0.9,
  minExamples: 8,
  minAccuracy: 0.85,
}

export function createNumberRuleEngine(config = {}) {
  const cfg = { ...DEFAULTS, ...config }
  const H = buildHypotheses()
  const logA = Math.log(1 - cfg.noise)
  const logD = Math.log(cfg.noise)

  let logScore = H.map((h) => -cfg.priorLambda * h.cost)
  const examples = [] // { n, label }

  function posterior() {
    let max = -Infinity
    for (const v of logScore) if (v > max) max = v
    let sum = 0
    const p = logScore.map((v) => {
      const e = Math.exp(v - max)
      sum += e
      return e
    })
    return p.map((e) => e / sum)
  }

  function record(n, fits) {
    const label = fits ? 1 : 0
    for (let i = 0; i < H.length; i++) {
      const pred = H[i].test(n) ? 1 : 0
      logScore[i] += pred === label ? logA : logD
    }
    examples.push({ n, label })
  }

  // Posterior probability that number n fits the (unknown) rule.
  function probFits(n) {
    const post = posterior()
    let p = 0
    for (let i = 0; i < H.length; i++) if (H[i].test(n)) p += post[i]
    return p
  }

  // Pick the most informative next number: the one whose fit-probability is
  // closest to 50/50 (maximally splits the surviving hypotheses).
  function pickNext(avoid) {
    let best = cfg.domainMin
    let bestScore = Infinity
    for (let n = cfg.domainMin; n <= cfg.domainMax; n++) {
      if (avoid && avoid.has(n)) continue
      const s = Math.abs(probFits(n) - 0.5)
      if (s < bestScore) {
        bestScore = s
        best = n
      }
    }
    return best
  }

  function getState() {
    const post = posterior()
    let map = 0
    for (let i = 1; i < H.length; i++) if (post[i] > post[map]) map = i
    const confidence = post[map]

    let correct = 0
    for (const e of examples) {
      if ((H[map].test(e.n) ? 1 : 0) === e.label) correct++
    }
    const accuracy = examples.length ? correct / examples.length : 1

    const revealReady =
      examples.length >= cfg.minExamples &&
      confidence >= cfg.revealThreshold &&
      accuracy >= cfg.minAccuracy

    const order = H.map((_, i) => i).sort((a, b) => post[b] - post[a])
    const top = order.slice(0, 4).map((i) => ({
      text: H[i].name,
      probability: post[i],
    }))

    return {
      examples: examples.length,
      confidence,
      accuracy,
      revealReady,
      mapRuleText: H[map].name,
      mapTest: H[map].test,
      top,
    }
  }

  return {
    record,
    probFits,
    pickNext,
    getState,
    hypothesisCount: H.length,
    reset() {
      logScore = H.map((h) => -cfg.priorLambda * h.cost)
      examples.length = 0
    },
  }
}

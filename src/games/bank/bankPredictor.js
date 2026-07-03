// bankPredictor.js
//
// Predicts whether the player will BANK (1) or keep ROLLING (0) at each decision.
// Unlike the pure left/right predictor, a bank decision depends heavily on game
// CONTEXT (how big the pot is, how many rolls in, whether you're ahead). So each
// expert here conditions on a different context feature and tracks your bank-rate
// in that bucket; a Hedge meta-learner trusts whichever feature reads you best.
//
// context = { rollCount, turnTotal, standing (-1/0/1), justDoubled (bool) }

const EXPERTS = [
  { name: 'global', key: () => 'g' },
  { name: 'rollCount', key: (c) => Math.min(c.rollCount, 9) },
  { name: 'turnTotal', key: (c) => Math.min(Math.floor(c.turnTotal / 40), 12) },
  { name: 'standing', key: (c) => c.standing },
  { name: 'justDoubled', key: (c) => (c.justDoubled ? 1 : 0) },
]

export function createBankPredictor({ eta = 0.6, share = 0.02, smoothing = 1 } = {}) {
  const E = EXPERTS.length
  let weights = new Array(E).fill(1 / E)
  let tables = EXPERTS.map(() => new Map()) // key -> [rollCount, bankCount]

  // Probability THIS expert assigns to "bank", from its bucket for this context.
  function pBankOf(e, ctx) {
    const t = tables[e].get(EXPERTS[e].key(ctx))
    const roll = t ? t[0] : 0
    const bank = t ? t[1] : 0
    return (bank + smoothing) / (roll + bank + 2 * smoothing)
  }

  function predict(ctx) {
    let pBank = 0
    for (let e = 0; e < E; e++) pBank += weights[e] * pBankOf(e, ctx)
    return {
      pBank,
      prediction: pBank > 0.5 ? 1 : 0, // 1 = bank, 0 = roll
      confidence: Math.max(pBank, 1 - pBank),
    }
  }

  function record(ctx, didBank) {
    const label = didBank ? 1 : 0
    // Hedge update from each expert's pre-update prediction.
    const next = new Array(E)
    for (let e = 0; e < E; e++) {
      const pB = pBankOf(e, ctx)
      const p = Math.max(1e-6, label ? pB : 1 - pB)
      next[e] = weights[e] * Math.pow(p, eta)
    }
    let sum = 0
    for (const w of next) sum += w
    for (let e = 0; e < E; e++) {
      next[e] = sum > 0 ? next[e] / sum : 1 / E
      next[e] = (1 - share) * next[e] + share / E
    }
    weights = next
    // Update each expert's bucket counts.
    for (let e = 0; e < E; e++) {
      const k = EXPERTS[e].key(ctx)
      const t = tables[e].get(k) || [0, 0]
      t[label]++
      tables[e].set(k, t)
    }
  }

  return {
    predict,
    record,
    reset() {
      weights = new Array(E).fill(1 / E)
      tables = EXPERTS.map(() => new Map())
    },
    get weights() {
      return weights.slice()
    },
    expertNames: EXPERTS.map((e) => e.name),
  }
}

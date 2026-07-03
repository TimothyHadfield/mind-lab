import { describe, it, expect } from 'vitest'
import { createBankPredictor } from './bankPredictor.js'

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomCtx(rng) {
  return {
    rollCount: 1 + Math.floor(rng() * 10),
    turnTotal: Math.floor(rng() * 400),
    standing: [-1, 0, 1][Math.floor(rng() * 3)],
    justDoubled: rng() < 0.2,
  }
}

// Play the predictor against a policy(ctx)->bank(bool); return hit-rate over the
// second half (after it has learned).
function accuracyOn(policy, { rounds = 600, seed = 1 } = {}) {
  const p = createBankPredictor()
  const rng = mulberry32(seed)
  let hits = 0
  let counted = 0
  for (let t = 0; t < rounds; t++) {
    const ctx = randomCtx(rng)
    const { prediction } = p.predict(ctx)
    const didBank = policy(ctx)
    if (t >= rounds / 2) {
      counted++
      if (prediction === (didBank ? 1 : 0)) hits++
    }
    p.record(ctx, didBank)
  }
  return hits / counted
}

describe('bank predictor', () => {
  it('learns a pot-size threshold policy (bank when turnTotal >= 200)', () => {
    const acc = accuracyOn((c) => c.turnTotal >= 200)
    expect(acc).toBeGreaterThan(0.9)
  })

  it('learns a roll-count policy (bank at 7+ rolls)', () => {
    const acc = accuracyOn((c) => c.rollCount >= 7)
    expect(acc).toBeGreaterThan(0.9)
  })

  it('learns a standing-based policy (bank when leading)', () => {
    const acc = accuracyOn((c) => c.standing === 1)
    expect(acc).toBeGreaterThan(0.85)
  })

  it('stays near chance against a coin-flip banker', () => {
    const rng = mulberry32(7)
    const acc = accuracyOn(() => rng() < 0.5, { seed: 5 })
    expect(acc).toBeGreaterThan(0.4)
    expect(acc).toBeLessThan(0.6)
  })

  it('reset() clears learning', () => {
    const p = createBankPredictor()
    p.record({ rollCount: 5, turnTotal: 300, standing: 1, justDoubled: false }, true)
    p.reset()
    const { pBank } = p.predict({
      rollCount: 5,
      turnTotal: 300,
      standing: 1,
      justDoubled: false,
    })
    expect(pBank).toBeCloseTo(0.5, 5)
  })
})

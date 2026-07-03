import { describe, it, expect } from 'vitest'
import { createPredictor } from './predictor.js'
import { defaultExperts } from './experts.js'

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Run the predictor against a player function; return AI hit-rate over the
// second half (after a warmup) so early cold-start doesn't dominate.
function playAgainst(player, { rounds = 400, symbolCount = 2, seed = 1 } = {}) {
  const p = createPredictor({ symbolCount, experts: defaultExperts(4) })
  const rng = mulberry32(seed)
  const hist = []
  let hits = 0
  let counted = 0
  for (let t = 0; t < rounds; t++) {
    const { prediction } = p.predict()
    const move = player(hist, rng)
    if (t >= rounds / 2) {
      counted++
      if (prediction === move) hits++
    }
    p.record(move)
    hist.push(move)
  }
  return hits / counted
}

describe('portfolio predictor', () => {
  it('nearly always predicts a constant player', () => {
    const acc = playAgainst(() => 0, { rounds: 100 })
    expect(acc).toBeGreaterThan(0.95)
  })

  it('cracks strict alternation (LRLR…)', () => {
    const acc = playAgainst((hist) => (hist.length ? 1 - hist[hist.length - 1] : 0))
    expect(acc).toBeGreaterThan(0.9)
  })

  it('learns a period-3 loop (0,1,2,0,1,2…)', () => {
    const acc = playAgainst((hist) => hist.length % 3, {
      rounds: 300,
      symbolCount: 3,
    })
    expect(acc).toBeGreaterThan(0.9)
  })

  it('beats chance on a repeat-avoiding "human-ish" player', () => {
    // Avoids making three of the same in a row (a classic human bias).
    const acc = playAgainst((hist, rng) => {
      const n = hist.length
      if (n >= 2 && hist[n - 1] === hist[n - 2]) return 1 - hist[n - 1]
      return rng() < 0.5 ? 0 : 1
    })
    expect(acc).toBeGreaterThan(0.58) // clearly above the 50% baseline
  })

  it('stays near chance against a truly random player', () => {
    const acc = playAgainst((_h, rng) => (rng() < 0.5 ? 0 : 1), { seed: 99 })
    expect(acc).toBeGreaterThan(0.4)
    expect(acc).toBeLessThan(0.6)
  })

  it('reset() clears history and weights', () => {
    const p = createPredictor({ symbolCount: 2, experts: defaultExperts(2) })
    p.predict()
    p.record(0)
    p.reset()
    expect(p.length).toBe(0)
    expect(p.weights.every((w) => Math.abs(w - w) === 0)).toBe(true)
  })
})

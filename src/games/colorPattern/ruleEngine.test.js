import { describe, it, expect } from 'vitest'
import {
  createRuleEngine,
  ruleMatches,
  describeRule,
  ruleComplexity,
} from './ruleEngine.js'

// red=0, green=1, black=2, blue=3
const PALETTE = [
  { id: 'red', name: 'red' },
  { id: 'green', name: 'green' },
  { id: 'black', name: 'black' },
  { id: 'blue', name: 'blue' },
]
const FULL = (1 << PALETTE.length) - 1
const bit = (i) => 1 << i

// Deterministic PRNG so these tests are reproducible regressions.
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Drive an engine with a random color stream, labelling clicks by `truthRule`.
// Noise is ASYMMETRIC: fnRate = chance of missing a matching square (common),
// fpRate = chance of clicking a non-matching square (rare) — mirroring real play.
function simulate(truthRule, { ticks, fnRate = 0, fpRate = 0, seed = 1 } = {}) {
  const rng = mulberry32(seed)
  const engine = createRuleEngine({ palette: PALETTE })
  const history = []
  for (let t = 0; t < ticks; t++) {
    const color = Math.floor(rng() * PALETTE.length)
    history.push(color)
    engine.pushColor(color)
    const fires = ruleMatches(truthRule, history, history.length - 1, FULL)
    let label = fires ? 1 : 0
    if (fires && rng() < fnRate) label = 0 // missed a matching square
    if (!fires && rng() < fpRate) label = 1 // slipped and clicked a wrong one
    engine.settle(label)
  }
  return engine.getState()
}

describe('ruleMatches', () => {
  it('fires an L=1 rule whenever the current color qualifies', () => {
    const rule = [bit(0), FULL, FULL] // "red"
    expect(ruleMatches(rule, [0], 0, FULL)).toBe(true)
    expect(ruleMatches(rule, [1], 0, FULL)).toBe(false)
  })

  it('needs history for deep constraints but not for wild positions', () => {
    const rule = [bit(0), FULL, bit(0)] // red → any → red
    expect(ruleMatches(rule, [0], 0, FULL)).toBe(false)
    expect(ruleMatches(rule, [0, 1, 0], 2, FULL)).toBe(true)
    expect(ruleMatches(rule, [0, 1, 1], 2, FULL)).toBe(false)
  })

  it('treats a disjunction position as "any of these"', () => {
    const rule = [bit(1) | bit(2), FULL, FULL] // green or black
    expect(ruleMatches(rule, [1], 0, FULL)).toBe(true)
    expect(ruleMatches(rule, [2], 0, FULL)).toBe(true)
    expect(ruleMatches(rule, [0], 0, FULL)).toBe(false)
  })
})

describe('describeRule', () => {
  it('reads oldest -> newest with wild + disjunction handling', () => {
    expect(describeRule([bit(0), FULL, FULL], PALETTE)).toBe('red')
    expect(describeRule([bit(0), FULL, bit(0)], PALETTE)).toBe('red → any → red')
    expect(describeRule([bit(1) | bit(2), bit(2), bit(1)], PALETTE)).toBe(
      'green → black → (green or black)'
    )
  })
})

describe('ruleComplexity (Occam prior)', () => {
  it('charges nothing for wild and more for deeper / broader constraints', () => {
    const wild = [FULL, FULL, FULL]
    const single = [bit(0), FULL, FULL]
    const deep = [FULL, FULL, bit(0)]
    const disjunction = [bit(0) | bit(1), FULL, FULL]
    expect(ruleComplexity(wild, FULL)).toBe(0)
    expect(ruleComplexity(deep, FULL)).toBeGreaterThan(
      ruleComplexity(single, FULL)
    )
    expect(ruleComplexity(disjunction, FULL)).toBeGreaterThan(
      ruleComplexity(single, FULL)
    )
  })
})

describe('createRuleEngine — hypothesis space', () => {
  it('caps disjunctions: 11 options/position for a 4-color palette', () => {
    // singles (4) + pairs (6) + "any" (1) = 11 -> 11^3
    const engine = createRuleEngine({ palette: PALETTE })
    expect(engine.hypothesisCount).toBe(Math.pow(11, 3)) // 1331
  })

  it('stays small for a 6-color palette', () => {
    const six = Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, name: `c${i}` }))
    const engine = createRuleEngine({ palette: six })
    // singles (6) + pairs (15) + any (1) = 22 -> 22^3
    expect(engine.hypothesisCount).toBe(Math.pow(22, 3)) // 10648
  })
})

describe('createRuleEngine — recovery of known rules', () => {
  it('recovers a simple L=1 rule ("red")', () => {
    const state = simulate([bit(0), FULL, FULL], { ticks: 80, seed: 7 })
    expect(state.mapRuleText).toBe('red')
    expect(state.revealReady).toBe(true)
    expect(state.confidence).toBeGreaterThan(0.9)
  })

  it('recovers a 3-length rule ("red → any → red")', () => {
    const state = simulate([bit(0), FULL, bit(0)], { ticks: 400, seed: 3 })
    expect(state.mapRuleText).toBe('red → any → red')
    expect(state.revealReady).toBe(true)
  })

  it('recovers a disjunctive rule ("green → black → (green or black)")', () => {
    const truth = [bit(1) | bit(2), bit(2), bit(1)]
    const state = simulate(truth, { ticks: 700, seed: 11 })
    expect(state.mapRuleText).toBe('green → black → (green or black)')
    expect(state.revealReady).toBe(true)
  })

  it('recovers "(red or black) → blue" — the disjunctive case', () => {
    // pos0 = blue, pos1 = red or black. Given enough distinguishing clicks the
    // asymmetric model prefers the true (broader) rule over the simpler subset.
    const truth = [bit(3), bit(0) | bit(2), FULL]
    const state = simulate(truth, { ticks: 500, fnRate: 0.15, seed: 9 })
    expect(state.mapRuleText).toBe('(red or black) → blue')
    expect(state.revealReady).toBe(true)
  })

  it('forgives frequent misses (25% false negatives) and still recovers', () => {
    const state = simulate([bit(0), FULL, FULL], {
      ticks: 160,
      fnRate: 0.25,
      seed: 5,
    })
    expect(state.mapRuleText).toBe('red')
    expect(state.revealReady).toBe(true)
    expect(state.clickPrecision).toBeGreaterThanOrEqual(0.9)
  })
})

describe('createRuleEngine — skepticism', () => {
  it('does not announce a rule for a purely random clicker', () => {
    const rng = mulberry32(42)
    const engine = createRuleEngine({ palette: PALETTE })
    for (let t = 0; t < 80; t++) {
      const color = Math.floor(rng() * PALETTE.length)
      engine.pushColor(color)
      engine.settle(rng() < 0.5 ? 1 : 0)
    }
    expect(engine.getState().revealReady).toBe(false)
  })

  it('reset() returns the engine to its prior', () => {
    const engine = createRuleEngine({ palette: PALETTE })
    engine.pushColor(0)
    engine.settle(1)
    engine.reset()
    const state = engine.getState()
    expect(state.examples).toBe(0)
    expect(state.positives).toBe(0)
    expect(state.confidence).toBeLessThan(0.5)
  })
})

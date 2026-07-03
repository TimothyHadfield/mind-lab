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

// Drive an engine with a random color stream, labelling clicks by `truthRule`
// (with optional misclick noise). Returns the final engine state.
function simulate(truthRule, { ticks, noise = 0, seed = 1 } = {}) {
  const rng = mulberry32(seed)
  const engine = createRuleEngine({ palette: PALETTE })
  const history = []
  for (let t = 0; t < ticks; t++) {
    const color = Math.floor(rng() * PALETTE.length)
    history.push(color)
    engine.pushColor(color)
    let label = ruleMatches(truthRule, history, history.length - 1, FULL) ? 1 : 0
    if (noise > 0 && rng() < noise) label = label ? 0 : 1 // flip = misclick
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
    // Only one color so far: position 2 has no history -> cannot fire.
    expect(ruleMatches(rule, [0], 0, FULL)).toBe(false)
    // red, green, red -> fires (middle is wild).
    expect(ruleMatches(rule, [0, 1, 0], 2, FULL)).toBe(true)
    // red, green, green -> current color not red -> no.
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

describe('createRuleEngine — recovery of known rules', () => {
  it('enumerates the full hypothesis space', () => {
    const engine = createRuleEngine({ palette: PALETTE })
    expect(engine.hypothesisCount).toBe(Math.pow(FULL, 3)) // 15^3 = 3375
  })

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

  it('still recovers the rule despite ~10% misclicks', () => {
    const state = simulate([bit(0), FULL, FULL], {
      ticks: 160,
      noise: 0.1,
      seed: 5,
    })
    expect(state.mapRuleText).toBe('red')
    expect(state.revealReady).toBe(true)
  })
})

describe('createRuleEngine — skepticism', () => {
  it('does not announce a rule for a purely random clicker', () => {
    const rng = mulberry32(42)
    const engine = createRuleEngine({ palette: PALETTE })
    for (let t = 0; t < 80; t++) {
      const color = Math.floor(rng() * PALETTE.length)
      engine.pushColor(color)
      engine.settle(rng() < 0.5 ? 1 : 0) // click with no rule at all
    }
    const state = engine.getState()
    expect(state.revealReady).toBe(false)
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

import { describe, it, expect } from 'vitest'
import { createNumberRuleEngine } from './numberRuleEngine.js'

// Simulate a player who labels the AI's chosen numbers by a secret rule, and
// check the AI's active-learning loop recovers that rule.
function discover(rule, { steps = 30, noise = 0 } = {}) {
  const engine = createNumberRuleEngine()
  const asked = new Set()
  let seed = 12345
  const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (let t = 0; t < steps; t++) {
    const n = engine.pickNext(asked)
    asked.add(n)
    let fits = rule(n)
    if (noise > 0 && rng() < noise) fits = !fits
    engine.record(n, fits)
    const st = engine.getState()
    if (st.revealReady) return st
  }
  return engine.getState()
}

describe('number rule engine', () => {
  it('discovers "even numbers"', () => {
    const st = discover((n) => n % 2 === 0)
    expect(st.revealReady).toBe(true)
    expect(st.mapRuleText).toBe('even numbers')
  })

  it('discovers "greater than 50"', () => {
    const st = discover((n) => n > 50)
    expect(st.revealReady).toBe(true)
    expect(st.mapRuleText).toBe('greater than 50')
  })

  it('discovers "multiples of 3"', () => {
    const st = discover((n) => n % 3 === 0)
    expect(st.revealReady).toBe(true)
    expect(st.mapRuleText).toBe('multiples of 3')
  })

  it('discovers "prime numbers"', () => {
    const st = discover((n) => {
      if (n < 2) return false
      for (let i = 2; i * i <= n; i++) if (n % i === 0) return false
      return true
    })
    expect(st.revealReady).toBe(true)
    expect(st.mapRuleText).toBe('prime numbers')
  })

  it('tolerates a little mislabeling and still lands on the rule', () => {
    const st = discover((n) => n % 2 === 0, { steps: 45, noise: 0.08 })
    expect(st.mapRuleText).toBe('even numbers')
  })

  it('does not confidently announce a rule it cannot express', () => {
    // Fibonacci membership isn't in the hypothesis set.
    const fib = new Set([1, 2, 3, 5, 8, 13, 21, 34, 55, 89])
    const st = discover((n) => fib.has(n), { steps: 25 })
    expect(st.revealReady).toBe(false)
  })
})

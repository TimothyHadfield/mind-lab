import { describe, it, expect } from 'vitest'
import { createPredictor } from '../shared/predictor.js'
import { pdExperts, reciprocityExpert } from './pdExperts.js'

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('PD experts', () => {
  it('reciprocity expert peaks on the AI\'s last move', () => {
    const d = reciprocityExpert().predict([0], [{ ai: 1 }], 2)
    expect(d[1]).toBeGreaterThan(d[0])
  })

  it('predicts a tit-for-tat player (mirrors the AI) well above chance', () => {
    const p = createPredictor({ symbolCount: 2, experts: pdExperts() })
    const rng = mulberry32(3)
    let hits = 0
    let counted = 0
    let lastAi = 0
    const hist = []
    for (let t = 0; t < 200; t++) {
      const { prediction } = p.predict()
      // human plays tit-for-tat: copy the AI's previous move
      const move = hist.length ? lastAi : 0
      if (t >= 100) {
        counted++
        if (prediction === move) hits++
      }
      const aiMove = rng() < 0.5 ? 0 : 1 // AI moves randomly here
      p.record(move, { ai: aiMove })
      hist.push(move)
      lastAi = aiMove
    }
    expect(hits / counted).toBeGreaterThan(0.85)
  })
})

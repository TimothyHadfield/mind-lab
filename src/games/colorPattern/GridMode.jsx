import { useState, useRef, useEffect, useCallback } from 'react'
import { createRuleEngine, ruleMatches } from './ruleEngine.js'
import { PALETTE, FULL_MASK } from './palette.js'
import AiPanel from './AiPanel.jsx'

const SIZES = [120, 240, 400]

function makeGrid(n) {
  const g = new Array(n)
  for (let i = 0; i < n; i++) g[i] = Math.floor(Math.random() * PALETTE.length)
  return g
}

export default function GridMode() {
  const [size, setSize] = useState(SIZES[1])
  const [grid, setGrid] = useState(() => makeGrid(SIZES[1]))
  const [selected, setSelected] = useState(() => new Set())
  const [result, setResult] = useState(null) // { state, preds } after analyze

  // Drag-to-paint state (refs so pointer handlers don't go stale).
  const paintingRef = useRef(false)
  const paintValueRef = useRef(true) // true = selecting, false = deselecting

  const regenerate = useCallback((n) => {
    setGrid(makeGrid(n))
    setSelected(new Set())
    setResult(null)
  }, [])

  const clearPicks = () => {
    setSelected(new Set())
    setResult(null)
  }

  const applyPaint = useCallback((index) => {
    setSelected((prev) => {
      const want = paintValueRef.current
      if (prev.has(index) === want) return prev
      const next = new Set(prev)
      if (want) next.add(index)
      else next.delete(index)
      return next
    })
    setResult(null) // picks changed -> previous analysis is stale
  }, [])

  const onSquareDown = (index) => {
    paintingRef.current = true
    paintValueRef.current = !selected.has(index) // toggle based on this square
    applyPaint(index)
  }
  const onSquareEnter = (index) => {
    if (paintingRef.current) applyPaint(index)
  }

  // Stop painting on any mouse/touch release anywhere.
  useEffect(() => {
    const stop = () => (paintingRef.current = false)
    window.addEventListener('pointerup', stop)
    return () => window.removeEventListener('pointerup', stop)
  }, [])

  const analyze = () => {
    const engine = createRuleEngine({ palette: PALETTE })
    for (let i = 0; i < grid.length; i++) {
      engine.pushColor(grid[i])
      engine.settle(selected.has(i))
    }
    const state = engine.getState()
    const preds = grid.map((_, i) =>
      ruleMatches(state.mapRule, grid, i, FULL_MASK)
    )
    setResult({ state, preds })
  }

  const st = result?.state
  const confidencePct = st ? Math.round(st.confidence * 100) : 0
  const accuracyPct = st ? Math.round(st.mapAccuracy * 100) : null

  // Agreement summary once analyzed.
  let agree = 0
  if (result) {
    for (let i = 0; i < grid.length; i++) {
      if (result.preds[i] === selected.has(i)) agree++
    }
  }

  return (
    <div className="grid-mode">
      <p className="grid-hint">
        Squares are read <strong>like a book</strong>: left → right, top → bottom.
        Click or <strong>drag</strong> to mark every square where your rule would
        have fired — then hit Analyze. Hundreds of examples at once.
      </p>

      <div className="grid-controls">
        <button className="ctl ctl-primary" onClick={analyze}>
          ⚡ Analyze my picks
        </button>
        <button className="ctl" onClick={clearPicks}>
          Clear picks
        </button>
        <button className="ctl" onClick={() => regenerate(size)}>
          ↺ New grid
        </button>
        <div className="speed">
          {SIZES.map((n) => (
            <button
              key={n}
              className={`speed-opt ${size === n ? 'active' : ''}`}
              onClick={() => {
                setSize(n)
                regenerate(n)
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="grid-count">{selected.size} selected</span>
      </div>

      <div className="grid-body">
        <div
          className={`square-grid ${result ? 'analyzed' : ''}`}
          onDragStart={(e) => e.preventDefault()}
        >
          {grid.map((colorIdx, i) => {
            const isSel = selected.has(i)
            const aiPred = result ? result.preds[i] : false
            const mismatch = result && aiPred !== isSel
            return (
              <div
                key={i}
                className={`sq ${isSel ? 'sel' : ''} ${aiPred ? 'ai' : ''} ${
                  mismatch ? 'miss' : ''
                }`}
                style={{ background: PALETTE[colorIdx].hex }}
                onPointerDown={() => onSquareDown(i)}
                onPointerEnter={() => onSquareEnter(i)}
                title={PALETTE[colorIdx].name}
              />
            )
          })}
        </div>

        <AiPanel
          statusText={result ? 'analyzed' : 'waiting for your picks'}
          predict={null}
          confidencePct={confidencePct}
          accuracyPct={accuracyPct}
          examples={st ? st.examples : grid.length}
          examplesLabel="squares"
          positives={selected.size}
          positivesLabel="you selected"
          revealed={!!(st && st.revealReady)}
          mapRuleText={st ? st.mapRuleText : ''}
          revealedFooter={
            st && st.revealReady
              ? 'Violet-dotted squares are where I would have clicked.'
              : null
          }
          top={st ? st.top : []}
          showGuess={!!result}
        />
      </div>

      {result && (
        <div className="grid-summary">
          {st.revealReady ? (
            <p className="grid-verdict good">
              🎯 I think your rule is <strong>{st.mapRuleText}</strong> — I agree
              with {agree} of {grid.length} squares ({Math.round(
                (agree / grid.length) * 100
              )}
              %).
            </p>
          ) : (
            <p className="grid-verdict">
              Best guess so far: <strong>{st.mapRuleText || '—'}</strong> (
              {confidencePct}% sure). Select more squares, add a New grid, or make
              your rule a bit simpler and I'll nail it.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

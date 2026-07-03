import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createRuleEngine, ruleMatches } from './ruleEngine.js'
import { PALETTE, FULL_MASK } from './palette.js'
import AiPanel from './AiPanel.jsx'

const SIZES = [120, 240, 400]

function makeGrid(n) {
  const g = new Array(n)
  for (let i = 0; i < n; i++) g[i] = Math.floor(Math.random() * PALETTE.length)
  return g
}

// Feed the engine the prefix of squares up to the furthest one the user has
// clicked. Per the game's rule: every earlier square the user did NOT click is a
// confirmed negative, and each clicked square is a positive. Squares beyond the
// last click haven't been "reached" yet, so they're left unlabelled.
function analyzePrefix(grid, selected) {
  if (selected.size === 0) return null
  let maxIndex = -1
  for (const i of selected) if (i > maxIndex) maxIndex = i

  const engine = createRuleEngine({ palette: PALETTE })
  for (let i = 0; i <= maxIndex; i++) {
    engine.pushColor(grid[i])
    engine.settle(selected.has(i))
  }
  const state = engine.getState()
  // Show the AI's current rule applied to EVERY square — including ones ahead of
  // where the user is, so matching squares light up the moment the AI gets it.
  const preds = grid.map((_, i) => ruleMatches(state.mapRule, grid, i, FULL_MASK))
  return { state, preds, maxIndex }
}

export default function GridMode() {
  const [size, setSize] = useState(SIZES[1])
  const [grid, setGrid] = useState(() => makeGrid(SIZES[1]))
  const [selected, setSelected] = useState(() => new Set())

  const paintingRef = useRef(false)
  const paintValueRef = useRef(true)

  // The AI re-analyses automatically whenever the picks change.
  const result = useMemo(() => analyzePrefix(grid, selected), [grid, selected])

  const regenerate = useCallback((n) => {
    setGrid(makeGrid(n))
    setSelected(new Set())
  }, [])

  const clearPicks = () => setSelected(new Set())

  const applyPaint = useCallback((index) => {
    setSelected((prev) => {
      const want = paintValueRef.current
      if (prev.has(index) === want) return prev
      const next = new Set(prev)
      if (want) next.add(index)
      else next.delete(index)
      return next
    })
  }, [])

  const onSquareDown = (index) => {
    paintingRef.current = true
    paintValueRef.current = !selected.has(index)
    applyPaint(index)
  }
  const onSquareEnter = (index) => {
    if (paintingRef.current) applyPaint(index)
  }

  useEffect(() => {
    const stop = () => (paintingRef.current = false)
    window.addEventListener('pointerup', stop)
    return () => window.removeEventListener('pointerup', stop)
  }, [])

  const st = result?.state
  const maxIndex = result ? result.maxIndex : -1
  const confidencePct = st ? Math.round(st.confidence * 100) : 0
  const accuracyPct = st ? Math.round(st.mapAccuracy * 100) : null

  return (
    <div className="grid-mode">
      <p className="grid-hint">
        Squares read <strong>like a book</strong>: left → right, top → bottom.
        Click or <strong>drag</strong> down through them and mark every square
        where your rule fires. The AI updates <strong>live</strong> with each
        pick — watch how fast it locks on. (Every square you skip counts as “rule
        did not fire”.)
      </p>

      <div className="grid-controls">
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
            const seen = i <= maxIndex
            const aiPred = result ? result.preds[i] : false
            const mismatch = result && seen && aiPred !== isSel
            return (
              <div
                key={i}
                className={`sq ${isSel ? 'sel' : ''} ${aiPred ? 'ai' : ''} ${
                  mismatch ? 'miss' : ''
                } ${result && !seen ? 'pending' : ''}`}
                style={{ background: PALETTE[colorIdx].hex }}
                onPointerDown={() => onSquareDown(i)}
                onPointerEnter={() => onSquareEnter(i)}
                title={PALETTE[colorIdx].name}
              />
            )
          })}
        </div>

        <AiPanel
          statusText={result ? 'learning live…' : 'waiting for your picks'}
          predict={null}
          confidencePct={confidencePct}
          accuracyPct={accuracyPct}
          examples={result ? maxIndex + 1 : grid.length}
          examplesLabel="squares seen"
          positives={selected.size}
          positivesLabel="you selected"
          revealed={!!(st && st.revealReady)}
          mapRuleText={st ? st.mapRuleText : ''}
          revealedFooter={
            st && st.revealReady
              ? 'Violet-dotted squares are where I would click — including ones you haven’t reached yet.'
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
              🎯 Got it after <strong>{maxIndex + 1}</strong> squares —your rule is{' '}
              <strong>{st.mapRuleText}</strong> ({confidencePct}% sure).
            </p>
          ) : (
            <p className="grid-verdict">
              Thinking… best guess <strong>{st.mapRuleText || '—'}</strong> (
              {confidencePct}% sure) after {maxIndex + 1} squares. Keep going.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

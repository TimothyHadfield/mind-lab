import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createRuleEngine, ruleMatches } from './ruleEngine.js'
import { fullMaskFor } from './palette.js'
import AiPanel from './AiPanel.jsx'

const SIZES = [120, 240, 400]

function makeGrid(n, paletteLen) {
  const g = new Array(n)
  for (let i = 0; i < n; i++) g[i] = Math.floor(Math.random() * paletteLen)
  return g
}

// Feed the engine the prefix of squares up to the furthest one the user clicked.
// Every earlier square they did NOT click is a confirmed negative; each clicked
// square is a positive. Squares past the last click aren't "reached" yet.
function analyzePrefix(grid, selected, palette) {
  if (selected.size === 0) return null
  const fullMask = fullMaskFor(palette)
  let maxIndex = -1
  for (const i of selected) if (i > maxIndex) maxIndex = i

  const engine = createRuleEngine({ palette })
  for (let i = 0; i <= maxIndex; i++) {
    engine.pushColor(grid[i])
    engine.settle(selected.has(i))
  }
  const state = engine.getState()
  const preds = grid.map((_, i) => ruleMatches(state.mapRule, grid, i, fullMask))
  return { state, preds, maxIndex }
}

export default function GridMode({ palette }) {
  const [size, setSize] = useState(SIZES[1])
  const [grid, setGrid] = useState(() => makeGrid(SIZES[1], palette.length))
  const [selected, setSelected] = useState(() => new Set())

  const paintingRef = useRef(false)
  const paintValueRef = useRef(true)

  const result = useMemo(
    () => analyzePrefix(grid, selected, palette),
    [grid, selected, palette]
  )

  const regenerate = useCallback(
    (n) => {
      setGrid(makeGrid(n, palette.length))
      setSelected(new Set())
    },
    [palette.length]
  )

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
  const precisionPct = st ? Math.round(st.clickPrecision * 100) : null

  return (
    <div className="grid-mode">
      <p className="grid-hint">
        Click or <strong>drag</strong> down through the squares, marking where your
        rule fires. The AI learns live — passed squares dim, so keep your eye on the
        bright ones ahead.
      </p>

      <div className="grid-controls">
        <button className="ctl" onClick={clearPicks}>
          Clear
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
            const done = maxIndex >= 0 && i < maxIndex
            return (
              <div
                key={i}
                className={`sq ${isSel ? 'sel' : ''} ${aiPred ? 'ai' : ''} ${
                  mismatch ? 'miss' : ''
                } ${done ? 'done' : ''}`}
                style={{ background: palette[colorIdx].hex }}
                onPointerDown={() => onSquareDown(i)}
                onPointerEnter={() => onSquareEnter(i)}
                title={palette[colorIdx].name}
              />
            )
          })}
        </div>

        <AiPanel
          statusText={result ? 'learning live…' : 'waiting for your picks'}
          predict={null}
          confidencePct={confidencePct}
          accuracyPct={precisionPct}
          examples={result ? maxIndex + 1 : grid.length}
          examplesLabel="squares seen"
          positives={selected.size}
          positivesLabel="you selected"
          revealed={!!(st && st.revealReady)}
          mapRuleText={st ? st.mapRuleText : ''}
          revealedFooter={
            st && st.revealReady
              ? 'Dotted squares are where I would click — including ones ahead of you.'
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
              🎯 Got it after <strong>{maxIndex + 1}</strong> squares — your rule is{' '}
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

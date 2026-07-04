import { useState, useMemo } from 'react'
import { getEvents, clearStats } from '../shared/stats.js'
import { Meter } from '../colorPattern/AiPanel.jsx'

const GAME_NAMES = {
  mindReader: 'Mind Reader',
  rps: 'Rock · Paper · Scissors',
  bank: 'Bank',
  randomNumber: 'Pick a Random Number',
  clickGrid: 'Where Will You Click?',
  pd: "Prisoner's Dilemma",
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x))

function analyze(events) {
  const byGame = {}
  for (const e of events) (byGame[e.game] ||= []).push(e)

  const games = Object.entries(byGame).map(([game, evs]) => {
    const acc = mean(evs.map((e) => (e.correct ? 1 : 0)))
    const baseline = 1 / (evs[0].symbols || 2)
    const skill = clamp((acc - baseline) / (1 - baseline), 0, 1)
    return { game, rounds: evs.length, acc, baseline, skill }
  })

  const totalRounds = events.length
  const overall = totalRounds
    ? games.reduce((x, g) => x + g.skill * g.rounds, 0) / totalRounds
    : 0

  const withPrev = events.filter((e) => e.prevHuman != null)
  const repeatRate = withPrev.length
    ? mean(withPrev.map((e) => (e.human === e.prevHuman ? 1 : 0)))
    : null

  const rps = byGame.rps || []
  let shiftLoss = null
  let shiftWin = null
  if (rps.length > 5) {
    const afterL = []
    const afterW = []
    for (let i = 0; i < rps.length - 1; i++) {
      const shifted = rps[i + 1].human !== rps[i].human ? 1 : 0
      if (rps[i].outcome === 'L') afterL.push(shifted)
      else if (rps[i].outcome === 'W') afterW.push(shifted)
    }
    shiftLoss = afterL.length ? mean(afterL) : null
    shiftWin = afterW.length ? mean(afterW) : null
  }

  return { totalRounds, games, overall, repeatRate, shiftLoss, shiftWin }
}

function overallLabel(x) {
  if (x >= 0.5) return 'Highly predictable'
  if (x >= 0.3) return 'Readable'
  if (x >= 0.15) return 'Slippery'
  return 'Nearly unreadable'
}

export default function BehaviorProfile() {
  const [tick, setTick] = useState(0)
  const data = useMemo(() => analyze(getEvents()), [tick])

  const reset = () => {
    clearStats()
    setTick((t) => t + 1)
  }

  if (data.totalRounds === 0) {
    return (
      <div className="game profile">
        <div className="game-head">
          <div>
            <h2>Behavior Profile</h2>
            <p className="game-sub">Your predictability across every game.</p>
          </div>
        </div>
        <div className="profile-empty">
          <p>No data yet.</p>
          <p className="muted">
            Play <strong>Mind Reader</strong> or <strong>Rock · Paper · Scissors</strong>{' '}
            and come back — this page scores how well the AI could read you.
          </p>
        </div>
      </div>
    )
  }

  const overallPct = Math.round(data.overall * 100)

  return (
    <div className="game profile">
      <div className="game-head">
        <div>
          <h2>Behavior Profile</h2>
          <p className="game-sub">
            Built from {data.totalRounds} rounds across your games. All local.
          </p>
        </div>
        <div className="profile-head-actions">
          <button className="ctl" onClick={() => setTick((t) => t + 1)}>
            ⟳ Refresh
          </button>
          <button className="ctl" onClick={reset}>
            Clear data
          </button>
        </div>
      </div>

      <div className="profile-headline">
        <div className="profile-score">{overallPct}%</div>
        <div>
          <div className="profile-verdict">{overallLabel(data.overall)}</div>
          <p className="muted">
            How much better than chance the AI predicted your moves — 0% is truly
            random, 100% is fully readable.
          </p>
        </div>
      </div>

      <div className="profile-traits">
        {data.repeatRate != null && (
          <Trait
            label="Repetition"
            pct={Math.round(data.repeatRate * 100)}
            note="how often you repeat your previous move"
          />
        )}
        {data.shiftLoss != null && (
          <Trait
            label="Tilt after a loss"
            pct={Math.round(data.shiftLoss * 100)}
            note={
              data.shiftWin != null
                ? `you switch ${Math.round(data.shiftLoss * 100)}% after losing vs ${Math.round(
                    data.shiftWin * 100
                  )}% after winning`
                : 'how often you switch move right after losing'
            }
          />
        )}
      </div>

      <h3 className="profile-subhead">By game</h3>
      <div className="profile-games">
        {data.games.map((g) => (
          <div key={g.game} className="profile-game">
            <div className="profile-game-top">
              <span>{GAME_NAMES[g.game] || g.game}</span>
              <span className="muted">{g.rounds} rounds</span>
            </div>
            <Meter
              label={`AI read you ${Math.round(g.acc * 100)}%`}
              pct={Math.round(g.skill * 100)}
              tone="violet"
            />
            <p className="muted profile-game-note">
              vs {Math.round(g.baseline * 100)}% chance → {Math.round(g.skill * 100)}%
              predictable
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Trait({ label, pct, note }) {
  return (
    <div className="trait">
      <div className="trait-top">
        <span>{label}</span>
        <strong>{pct}%</strong>
      </div>
      <div className="meter-track">
        <div className="meter-fill green" style={{ width: `${pct}%` }} />
      </div>
      <p className="muted trait-note">{note}</p>
    </div>
  )
}

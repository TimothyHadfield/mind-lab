// stats.js
//
// A tiny cross-game event log (localStorage-backed) that every prediction game
// writes a round to. The Behavior Profile reads it back to score how predictable
// you are across everything you've played. Nothing leaves the browser.

const KEY = 'mindlab.stats.v1'
const CAP = 3000

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

function save(events) {
  try {
    localStorage.setItem(KEY, JSON.stringify(events.slice(-CAP)))
  } catch {
    /* storage full or unavailable — ignore */
  }
}

// evt: { game, human, predicted, correct, prevHuman, outcome, symbols }
export function recordRound(evt) {
  const events = load()
  events.push({ ...evt, ts: Date.now() })
  save(events)
}

export function getEvents() {
  return load()
}

export function clearStats() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

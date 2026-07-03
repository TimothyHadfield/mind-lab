// ruleEngine.js
//
// Bayesian rule-inference engine for the Color-Pattern game.
//
// The player has a secret rule about *when* to click, expressed over the most
// recent colors shown. This engine watches the stream of (color shown, did the
// user click?) events and infers that rule.
//
// RULE REPRESENTATION
// -------------------
// A rule is a window over the last `maxLength` colors. Position 0 is the color
// showing right now, position 1 is the one before, etc. Each position is a
// *bitmask* over palette indices describing which colors are allowed there:
//   - a single bit set  -> a specific color            (e.g. "red")
//   - all bits set       -> "any / wild" (no constraint at that position)
//   - two+ bits set      -> a disjunction               (e.g. "green or black")
// A position that is wild needs no history to be satisfied, so a rule of
// effective length 1 (only position 0 constrained) works from the very first
// color, while deeper rules only start firing once enough history exists.
//
// INFERENCE
// ---------
// We enumerate every possible rule (every combination of non-empty per-position
// subsets) and keep a Bayesian posterior over them:
//   - PRIOR favours simpler rules (Occam): fewer constrained positions,
//     shallower windows, and tighter constraints are cheaper.
//   - LIKELIHOOD uses a small misclick/noise probability so a single stray or
//     missed click doesn't destroy the true hypothesis.
// The posterior gives us both a live prediction (should the user click now?)
// and a confidence (how sure are we of the single best rule?) which drives the
// "I think your rule is ..." reveal.

// ----------------------------- small helpers ------------------------------

function popcount(n) {
  let c = 0
  while (n) {
    n &= n - 1
    c++
  }
  return c
}

// Stable log-sum-exp over an array of log-values -> returns { max, sumExp }.
function logSumExpParts(logs) {
  let max = -Infinity
  for (const v of logs) if (v > max) max = v
  if (max === -Infinity) return { max, total: -Infinity }
  let sum = 0
  for (const v of logs) sum += Math.exp(v - max)
  return { max, total: max + Math.log(sum) }
}

// Every non-empty subset of a `size`-color palette, as bitmasks 1..(2^size - 1).
function allNonEmptyMasks(size) {
  const full = (1 << size) - 1
  const masks = []
  for (let m = 1; m <= full; m++) masks.push(m)
  return masks
}

// Cartesian product of per-position mask options -> array of rules.
// Each rule is an array of `length` bitmasks.
function enumerateRules(maskOptions, length) {
  let rules = [[]]
  for (let pos = 0; pos < length; pos++) {
    const next = []
    for (const rule of rules) {
      for (const mask of maskOptions) next.push([...rule, mask])
    }
    rules = next
  }
  return rules
}

// ----------------------------- rule mechanics -----------------------------

// Does `rule` fire at time `t`, given `history` (array of color indices)?
// t is an index into history (the "current" color). Wild positions are always
// satisfied; a constrained position with no history available fails.
export function ruleMatches(rule, history, t, fullMask) {
  for (let i = 0; i < rule.length; i++) {
    const mask = rule[i]
    if (mask === fullMask) continue // wild: no history needed
    const idx = t - i
    if (idx < 0) return false // constrained but nothing there yet
    if ((mask & (1 << history[idx])) === 0) return false
  }
  return true
}

// Structural complexity of a rule, used by the Occam prior.
// Wild positions are free. A constraint costs a base amount, more if it is
// deeper in the window, and a little more per extra allowed color.
export function ruleComplexity(rule, fullMask) {
  let c = 0
  for (let i = 0; i < rule.length; i++) {
    const mask = rule[i]
    if (mask === fullMask) continue
    const k = popcount(mask)
    c += 1 + 0.7 * i + 0.6 * (k - 1)
  }
  return c
}

// Human-readable rule, read oldest -> newest, e.g. "red → any → (green or black)".
export function describeRule(rule, palette) {
  const fullMask = (1 << palette.length) - 1
  // Effective length = deepest constrained position + 1 (min 1).
  let effLen = 1
  for (let i = 0; i < rule.length; i++) {
    if (rule[i] !== fullMask) effLen = i + 1
  }
  const parts = []
  for (let i = effLen - 1; i >= 0; i--) {
    const mask = rule[i]
    if (mask === fullMask) {
      parts.push('any')
    } else {
      const names = []
      for (let b = 0; b < palette.length; b++) {
        if (mask & (1 << b)) names.push(palette[b].name)
      }
      parts.push(names.length === 1 ? names[0] : `(${names.join(' or ')})`)
    }
  }
  return parts.join(' → ')
}

// ------------------------------ the engine --------------------------------

const DEFAULTS = {
  maxLength: 3,
  noise: 0.06, // probability of a misclick / missed click
  priorLambda: 1.0, // strength of the Occam prior
  revealThreshold: 0.9, // posterior mass of the top rule needed to announce it
  minExamples: 12, // don't announce before this many colors seen
  minPositives: 3, // ...or before this many actual clicks
  minAccuracy: 0.8, // the top rule must also explain the clicks this well
}

export function createRuleEngine(config = {}) {
  const cfg = { ...DEFAULTS, ...config }
  const palette = cfg.palette
  if (!palette || palette.length === 0) {
    throw new Error('createRuleEngine requires a non-empty palette')
  }
  const P = palette.length
  const fullMask = (1 << P) - 1

  const rules = enumerateRules(allNonEmptyMasks(P), cfg.maxLength)
  const H = rules.length

  const logLikeAgree = Math.log(1 - cfg.noise)
  const logLikeDisagree = Math.log(cfg.noise)

  // logScore[h] = logPrior(h) + sum of log-likelihoods of observed labels.
  const logScore = new Float64Array(H)
  const complexity = new Float64Array(H)
  for (let h = 0; h < H; h++) {
    complexity[h] = ruleComplexity(rules[h], fullMask)
    logScore[h] = -cfg.priorLambda * complexity[h]
  }

  const history = [] // color indices, oldest -> newest
  const clicks = [] // 0/1 aligned with history, filled in on settle()
  let pendingMatches = null // cached fire-per-rule for the just-shown color
  let examples = 0
  let positives = 0

  function currentPosterior() {
    const { max, total } = logSumExpParts(logScore)
    const post = new Float64Array(H)
    if (total === -Infinity) return post
    for (let h = 0; h < H; h++) post[h] = Math.exp(logScore[h] - total)
    return post
  }

  // A color is shown. Append to history, compute which rules fire now, and
  // return the posterior-weighted probability the user should click.
  function pushColor(colorIndex) {
    history.push(colorIndex)
    const t = history.length - 1
    const post = currentPosterior()
    const matches = new Uint8Array(H)
    let fireProb = 0
    for (let h = 0; h < H; h++) {
      const m = ruleMatches(rules[h], history, t, fullMask) ? 1 : 0
      matches[h] = m
      if (m) fireProb += post[h]
    }
    pendingMatches = matches
    return { fireProbability: fireProb, aiPredictsClick: fireProb > 0.5 }
  }

  // The user did or didn't click for the color just pushed. Update the posterior.
  function settle(clicked) {
    if (!pendingMatches) {
      throw new Error('settle() called before pushColor()')
    }
    const label = clicked ? 1 : 0
    clicks.push(label)
    examples++
    if (label) positives++
    for (let h = 0; h < H; h++) {
      const predictsClick = pendingMatches[h] === 1
      const agree = predictsClick === (label === 1)
      logScore[h] += agree ? logLikeAgree : logLikeDisagree
    }
    pendingMatches = null
  }

  function getState() {
    const post = currentPosterior()
    let mapIndex = 0
    let mapMass = -1
    for (let h = 0; h < H; h++) {
      if (post[h] > mapMass) {
        mapMass = post[h]
        mapIndex = h
      }
    }
    const confidence = mapMass < 0 ? 0 : mapMass

    // How well does the single best rule actually explain the clicks so far?
    // A rule fit to random clicking scores near chance; a true rule scores high.
    // This guards against announcing a rule hallucinated out of noise.
    let mapAccuracy = 1
    if (examples > 0) {
      let correct = 0
      for (let t = 0; t < history.length; t++) {
        const fires = ruleMatches(rules[mapIndex], history, t, fullMask)
        if (fires === (clicks[t] === 1)) correct++
      }
      mapAccuracy = correct / history.length
    }

    const ready =
      examples >= cfg.minExamples &&
      positives >= cfg.minPositives &&
      confidence >= cfg.revealThreshold &&
      mapAccuracy >= cfg.minAccuracy

    // Top few rules, for an optional "what the AI is thinking" panel.
    const order = Array.from({ length: H }, (_, h) => h).sort(
      (a, b) => post[b] - post[a]
    )
    const top = order.slice(0, 5).map((h) => ({
      text: describeRule(rules[h], palette),
      probability: post[h],
    }))

    return {
      examples,
      positives,
      confidence,
      mapAccuracy,
      revealReady: ready,
      mapRule: rules[mapIndex],
      mapRuleText: describeRule(rules[mapIndex], palette),
      top,
    }
  }

  function reset() {
    for (let h = 0; h < H; h++) {
      logScore[h] = -cfg.priorLambda * complexity[h]
    }
    history.length = 0
    clicks.length = 0
    pendingMatches = null
    examples = 0
    positives = 0
  }

  return {
    config: cfg,
    hypothesisCount: H,
    pushColor,
    settle,
    getState,
    reset,
    get history() {
      return history.slice()
    },
  }
}

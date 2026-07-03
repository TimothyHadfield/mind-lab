# Behavior Prediction Site — Plan

## Vision
A website of small games/toys where an "AI" watches the user's behavior during a
**training period of play**, learns the pattern behind it, and then
**predicts / reveals** it. The long-term dream is a general cross-system behavior
predictor; the realistic near-term is a **reusable prediction engine** that plugs
into per-game models. A single universal predictor across all systems isn't
feasible on per-user, small data — but one shared engine reused across games,
plus cross-game behavioral traits, is.

## Research findings (focused overview)
- **Humans can't be random** — the exploit behind everything here. The
  [Aaronson Oracle](https://people.ischool.berkeley.edu/~nick/aaronson-oracle/)
  hits ~70% on left/right presses using n-gram (Markov) counts of recent presses.
- **Best predictors are ensembles of simple models**, not one big model. The
  [multi-AI RPS work](https://www.nature.com/articles/s41598-020-70544-7) runs
  several Markov models of different memory lengths plus win-stay/lose-shift and
  trusts whichever predicts the current player best right now. → a
  "portfolio + meta-learner" core is the realistic ceiling for browser AI.
- **The color game is concept/rule learning**, not sequence prediction. Solvable
  via version spaces (clean, brittle to misclicks) or a **Bayesian rule learner**
  with a simplicity prior + noise model (robust; gives prediction AND confidence).
  We use the Bayesian approach.
- Comparable products: NYT RPS bot (Markov ensemble), Akinator (Bayesian
  hypothesis narrowing). Both are single-user, no-backend — our achievable class.

## Architecture
- **100% client-side.** React + Vite. Models run in-browser. No backend.
- Site shell = a menu of games (`src/games/registry.js`); each game is a
  self-contained module under `src/games/<id>/`.
- Game-specific model logic (the color game's rule learner) is kept separate so a
  future shared `prediction-engine/` (portfolio of experts + Hedge meta-learner)
  can power later games (Mind Reader, RPS, etc.).

## Game 1 — Color Pattern (BUILT)
### Mechanic
Colors flash one at a time from a small palette (red/green/black/blue). The user
holds a secret rule about *when their pattern is fulfilled* and clicks whenever
the recent colors satisfy it. Each shown color is a labeled example: does the
window ending here match? label = did they click.

### The AI (`ruleEngine.js`)
- **Rule = a window of the last `maxLength` colors**, each position a *bitmask*
  of allowed colors: singleton = a specific color, full mask = wild/any, 2+ bits
  = a disjunction ("green or black"). Wild positions need no history.
- **Hypothesis space** = every combination of non-empty per-position subsets:
  (2^P − 1)^maxLength. For P=4, maxLength=3 → 3375 rules, scored every tick.
- **Bayesian posterior**: Occam prior (cheaper for fewer/shallower/tighter
  constraints) + likelihood with a misclick-noise term so stray clicks don't kill
  the true rule.
- **Live prediction**: highlight the AI's button when posterior P(fires now) > 0.5.
- **Reveal**: when the top rule's posterior ≥ 0.9 AND it explains the clicks with
  ≥ 0.8 accuracy AND enough examples/clicks seen — announce it. The accuracy gate
  stops the AI hallucinating a rule out of random clicking.

## Future games (menu already stubbed in registry.js)
- **Mind Reader (Aaronson Oracle)** — AI guesses your next of two buttons.
- **Rock-Paper-Scissors** — Markov-ensemble opponent that adapts.
- **Behavior Profile** — cross-game traits (repetitiveness, tilt, contrarianism).
These reuse a shared portfolio + Hedge meta-learner engine (not yet built).

## Verification
- `npm test` — engine recovers simple, deep, and disjunctive rules from synthetic
  click streams, tolerates ~10% misclicks, and stays skeptical of random clicking.
- `npm run build` — clean production build.
- `npm run dev` — play it: pick a simple rule (e.g. "red"), Start, click on match;
  the AI should lock on within a short training period.

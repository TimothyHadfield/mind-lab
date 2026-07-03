# PROGRESS — Behavior Prediction Site

> Living status file. Read this first when resuming in a fresh chat.
> Last updated: 2026-07-03.

## Where we are
**Step 3 (build) — Game 1 is complete and verified.** The site runs, the Color
Pattern game works, and its AI reliably deduces the user's secret rule.

Workflow with the user: give initial thoughts → research → build, one step at a
time, pausing to talk after each. `PLAN.md` has the design + research. This file
tracks status so a new chat can resume cleanly.

## Done
- ✅ Step 1: initial thoughts on behavior prediction (Aaronson Oracle, ensembles).
- ✅ Step 2: focused research (see PLAN.md → Research findings).
- ✅ Scaffolded React + Vite app (100% client-side, no backend).
- ✅ `ruleEngine.js` — Bayesian rule-inference engine. **12/12 unit tests pass.**
- ✅ `ColorPatternGame.jsx` — full game UI (color stream, click/Space, AI panel
  with live prediction + confidence + accuracy meters, reveal modal, reset/speed).
- ✅ **Two play modes** via a toggle: **Live stream** (timed, one color at a time)
  and **Grid blitz** (`GridMode.jsx`) — a grid of 120/240/400 random squares the
  user click/drag-paints (reading order left→right, top→bottom), then "Analyze"
  feeds the whole batch to the engine at once for near-instant inference. Shared
  `AiPanel.jsx` + `palette.js`. After analyzing, AI-predicted squares show a dot
  and disagreements a marker.
- ✅ Site shell + game menu (`App.jsx`, `registry.js`, `GameCard.jsx`) with 3
  future games stubbed as "coming soon".
- ✅ Verified: unit tests, production build, dev server serves, and an integration
  simulation of the exact game loop reveals "red → any → red" correctly.

## Environment notes (important for a fresh chat)
- Node was NOT installed originally; installed **Node v24.18.0** via
  `winget install OpenJS.NodeJS.LTS`. It lives at `C:\Program Files\nodejs` and
  may not be on PATH in a new shell — prepend it:
  `$env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"` (PowerShell).
- npm blocked esbuild's install script (`npm approve-scripts`), but tests/build
  work regardless.
- Run: `npm install` → `npm run dev` (http://localhost:5173), `npm test`.

## Git / publishing
- This folder is its own git repo (`git init` done), one commit on `main`. It sits
  inside the larger "Code Projects" repo but is independent.
- NOT yet on GitHub — creating a repo needs the user to authenticate once. `gh`
  CLI (v2.96) is installed. To publish: `gh auth login` then `./publish.ps1`
  (creates `mind-lab`, public, and pushes). `gh` lives at
  `C:\Program Files\GitHub CLI`.

## Key files
- `src/games/colorPattern/ruleEngine.js` — the AI (pure, testable).
- `src/games/colorPattern/ruleEngine.test.js` — unit tests.
- `src/games/colorPattern/ColorPatternGame.jsx` — game UI + timer loop.
- `src/games/registry.js` — add new games here.
- `src/App.jsx`, `src/components/GameCard.jsx`, `src/styles/global.css`.

## Design decisions worth remembering
- Rule representation: window of per-position color bitmasks (singleton / wild /
  disjunction). Wild positions need no history.
- Reveal requires posterior ≥ 0.9 **and** rule accuracy ≥ 0.8 **and** enough
  examples/clicks — the accuracy gate is what stops false rules from noise.
- Default engine config: maxLength 3, noise 0.06, priorLambda 1.0.

## Open ideas / next steps (not started)
- **Tuning/feel:** colors are uniform random, so deep rules (e.g. red→any→red)
  need patience. Could bias the stream toward the AI's suspected rule to surface
  evidence faster, or suggest simpler starter rules more prominently.
- **Palette/length options:** let the user pick palette size or maxLength.
- **localStorage:** persist speed preference and maybe a "best rule cracked" log.
- **Game 2:** Mind Reader (Aaronson Oracle) — good next build; introduces the
  shared portfolio + Hedge meta-learner engine the other games will reuse.
- **Component tests:** no DOM test lib installed; engine is covered, UI is not.

## How to demo to the user
`npm run dev`, open the site, click **Color Pattern → Start**. Pick a simple rule
like "click on red", click on every red for ~15–20 colors; the AI announces it.
Then try "red → any → red" (needs more clicks). Reset between rules.

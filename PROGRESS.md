# PROGRESS — Mind Lab (folder "Behavior Prediction", repo `mind-lab`)

## START HERE
- Last updated 2026-10-17.
- Read order: this file → `CLAUDE.md` (file map, run/test, traps) → `chat.md` (session log) → `PLAN.md` (original design + research, July; partly historical) → `docs/archive/PROGRESS-2026-07.md` (the full July status file: engine details, design reasoning).
- Live: https://timothyhadfield.github.io/mind-lab/ · Repo: https://github.com/TimothyHadfield/mind-lab (public)
- Latest sweep report: `C:\Users\timha\laptop-ops\coding-and-claude\reports\sweep-2026-10-16\mind-lab.md`

## Goal right now
Nothing in progress. The site is finished, live and maintained; no feature work is queued. Tim's 2026-10-17 order covers clear fixes and improvements without asking.

## Status
| Area | State (checked 2026-10-17) |
|---|---|
| Games | 9 live, in registry order: Color Pattern (Grid + Live modes, 3 or 6 colors), Guess My Rule (Eleusis), Mind Reader, Pick a Random Number, Where Will You Click?, Rock · Paper · Scissors, Prisoner's Dilemma, Bank, Behavior Profile |
| Tests | **37/37 pass** (5 files, Vitest), measured 2026-10-17 |
| Live build | **Current.** Live `index.html` loads `index-6HAH14Nc.js` + `index-DHrZZyL0.css`, the same hashes a fresh local build of `2025c14` produces; last Pages deploy run green (2026-10-16 10:51 UTC) |
| Git | `main` = `origin/main`, last code commit `2025c14` (2026-10-16) |
| Data | localStorage only (`mindlab.stats.v1`, 3000-round cap). No backend, no accounts, no network calls |
| UI tests | None (no DOM test library); UI is checked with phone-view |

## Authorized next steps
- 2026-10-17 — Tim: "any fixes or improvements you feel confident about go ahead and do, pretty much always. You don't have to ask me." Wording, looks and new features are still his.

## Standing instructions
Only one verbatim quote exists in the files (above, 2026-10-17). The rest are July summaries of Tim's asks, not his exact words:
- Workflow: initial thoughts → research → build, one step at a time, pausing to talk after each.
- Bank: the predictor reveals its guess right **after** each decision, not before. Only Bank's gameplay is copied from Tim's separate bank-evolution project; its evolution/training machinery stays there.
- Every game shows the AI's measured accuracy next to chance (honest, no fake confidence).

## Traps
- **Deploy:** every push to `main` runs `.github/workflows/deploy.yml` (npm ci → npm test → npm run build → GitHub Pages from `dist/`). A failing test blocks the deploy. `dist/` is gitignored, so a local build never dirties the tree. `publish.ps1` is the old one-time `gh repo create` helper; the repo already exists, so don't run it.
- **`npm test` / `npm run build` fail locally** (bash and PowerShell, measured 2026-10-17): the `&` in the folder path "AI & Machine Learning" breaks npm's cmd shims ("'Machine' is not recognized"). Call the tools through node instead: `node node_modules/vitest/vitest.mjs run` and `node node_modules/vite/bin/vite.js build`. CI on Linux is unaffected.
- Node may not be on PATH: `C:\Program Files\nodejs` (bash: `export PATH="/c/Program Files/nodejs:$PATH"`).
- phone-view: `text=Color Pattern` hits the hero sentence; open games with `.game-card >> nth=N` (0 Color Pattern … 7 Bank, 8 Profile). Real touch drags need Chrome CDP touch events.
- Grid mode re-runs the rule engine on every painted square; 6 colors / 400 squares ≈ 0.3 s per square on the laptop (after the 2026-10-16 4x speed-up). Don't add work there.
- Guess My Rule: hypotheses with the same extension over 1..100 split the vote; they are deduplicated. Reveal gate is 0.9.
- The root "Code Projects" folder is a different repo (Estimator_Quiz). Run git only from this folder.
- No accounts, so no test account or `.claude/test/` is needed.

## Decisions
- 100% client-side React + Vite; no backend, no accounts.
- Prediction games share one engine: expert portfolio + Hedge meta-learner (`src/games/shared/predictor.js`).
- Color Pattern uses a Bayesian rule learner with an asymmetric noise model (false positive 0.05, false negative 0.20); disjunctions capped at 2 colors.
- Color Pattern palette: red/green/yellow by default; 6-color mode adds pink/purple/blue (pink replaced orange, which read too close to red).
- Grid mode is Color Pattern's default.
- Bank: simultaneous hidden decisions (no peeking either way); predictor reveals after the decision.
- Guess My Rule reveal accuracy gate raised 0.85 → 0.9 (2026-10-16; 160/160 correct on noisy runs vs 138/160).
- Vite `base: './'` so the build works under `/mind-lab/` and locally.

## NOT verified
- Touch drag on a real iPhone (checked with Chrome touch emulation only, 2026-10-16).
- Grid-mode speed on a real phone (laptop measured only).
- No UI is covered by automated tests.

## Open items for Tim (wording/looks, left as is)
- Home text still says "Start with Color Pattern — more games are on the way" (`src/App.jsx:61-62`), though all 9 games exist. Default: leave until he says.
- On iPhone the Color Pattern grid starts near the bottom of the first screen (~570 of 659 px). Default: leave.
- Report-only from the sweep: game cards are `h3` directly under the page `h1` (heading-order accessibility note); Guess My Rule would repeat the number 1 if all 100 numbers were asked (unreachable in practice).

## Rejected / parked
- ~~Bias the Color Pattern stream toward the suspected rule~~ — July idea, never started; parked, no ask from Tim.
- ~~User-chosen rule length (maxLength)~~ — parked July idea; palette size option was built instead.
- ~~localStorage for speed preference / "best rule cracked" log~~ — parked July idea, no ask.
- ~~DOM/component test library~~ — parked: "Don't add a framework uninvited" (CLAUDE.md); phone-view covers UI.
- ~~Bank evolution/training machinery in Mind Lab~~ — stays in Tim's separate bank-evolution app.

# Mind Lab (repo `mind-lab`, folder "Behavior Prediction")

Nine small browser games where an AI learns a player's habits and predicts their
next move. Tim's personal project, played on his iPhone and laptop. 100% client-side:
no backend, no accounts, no network calls. The only stored data is a localStorage
event log (`mindlab.stats.v1`, capped at 3000 rounds) that feeds the Behavior Profile.

- Live: https://timothyhadfield.github.io/mind-lab/
- Repo: https://github.com/TimothyHadfield/mind-lab (public)
- State: `PROGRESS.md` (uppercase). Session log: `chat.md`. Design + research: `PLAN.md`. Old July status: `docs/archive/PROGRESS-2026-07.md`.

## File map
- `index.html`, `src/main.jsx`, `src/App.jsx`: shell. No router: `App` keeps the open game in state; the menu is `GameCard`s.
- `src/games/registry.js`: the list of games (id, title, wording, accent, component). Add a game here.
- `src/games/shared/`: `predictor.js` (experts + Hedge meta-learner), `experts.js` (frequency, Markov-k), `stats.js` (localStorage log).
- One folder per game under `src/games/`: `colorPattern/` (Bayesian rule engine `ruleEngine.js`, Grid and Live modes), `eleusis/` (Guess My Rule, `numberRuleEngine.js`), `mindReader/`, `randomNumber/`, `clickGrid/`, `rps/` (+`rpsExperts.js`), `pd/` (+`pdExperts.js`), `bank/` (`bankGame.js` rules, `bankPredictor.js`), `profile/` (reads the stats log).
- `src/styles/global.css`: all styles, one dark theme.
- `docs/screenshots/`: images used by README.md.
- `publish.ps1`: old one-time repo-creation helper (the repo already exists).

## Run and test
- Node may not be on PATH: `C:\Program Files\nodejs` (bash: `export PATH="/c/Program Files/nodejs:$PATH"`).
- `npm ci`, then tests (Vitest, engine/predictor unit tests only; 37 tests on 2026-10-17), dev server (localhost:5173), build (to `dist/`).
- **Locally, `npm test` / `npm run build` / `npx` fail**: the `&` in "AI & Machine Learning" breaks npm's cmd shims ("'Machine' is not recognized"). Use `node node_modules/vitest/vitest.mjs run`, `node node_modules/vite/bin/vite.js build`, `node node_modules/vite/bin/vite.js` (dev).
- Built-site check: build as above, then `python -m http.server 8116` from `dist/` (base is `./`, so it works from any path) and `node ~/.claude/tools/phone-view.mjs http://localhost:8116/`.
- No DOM test library: UI is checked with phone-view, not unit tests. Don't add a framework uninvited.

## Deploy
- Push to `main` triggers `.github/workflows/deploy.yml`: `npm ci`, `npm test`, `npm run build`, then GitHub Pages. A failing test blocks the deploy.

## Traps
- **phone-view selectors:** `text=Color Pattern` matches the hero sentence on the home page, not the card. Open games with `.game-card >> nth=N` (registry order: 0 Color Pattern ... 7 Bank, 8 Profile).
- Playwright `click:.sq` on the Color Pattern grid works on desktop; for a real finger drag, use CDP `Input.dispatchTouchEvent` in Chrome (touch pointers are captured by the first element touched).
- Grid mode re-runs the whole rule engine on every painted square (`analyzePrefix`). With 6 colors that is ~10.6k rules per square; keep that in mind before adding work there.
- Eleusis hypotheses are deduplicated by the numbers they pick out (1..100); two rules with the same extension split the posterior and neither can be announced.

## Standing instructions
- Tim, 2026-10-17 (verbatim): "any fixes or improvements you feel confident about go ahead and do, pretty much always. You don't have to ask me."
- The rest are July summaries of Tim's asks, not verbatim quotes:
- Workflow: give initial thoughts → research → build, one step at a time, pausing to talk after each.
- Bank: the predictor reveals its guess right after each decision (not before). Only the Bank gameplay is copied from Tim's separate bank-evolution project; its evolution/training machinery stays there.
- Every game shows the AI's measured accuracy next to chance ("honest, no fake confidence").

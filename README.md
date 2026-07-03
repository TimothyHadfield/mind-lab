# Mind Lab — Behavior Prediction

A small website of games where an AI watches your choices during a short
"training" period, learns the pattern behind them, and then shows you it has
figured you out. Everything runs **entirely in the browser** — no backend, no
data leaves your machine.

The first game is **Color Pattern**: you invent a secret rule about when to
click (based on the recent colors shown), and a Bayesian rule-inference engine
deduces the exact rule in your head — including wildcards and "either/or"
disjunctions — then announces it.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm test         # unit tests for the inference engine (Vitest)
npm run build    # production build to dist/
npm run preview  # serve the production build
```

> Node is required. If `npm` isn't found on Windows, Node lives at
> `C:\Program Files\nodejs` — add it to PATH or call `npm.cmd` from there.

## How it works

See [`PLAN.md`](./PLAN.md) for the design and research background, and
[`PROGRESS.md`](./PROGRESS.md) for current status and next steps.

The core AI is in
[`src/games/colorPattern/ruleEngine.js`](./src/games/colorPattern/ruleEngine.js):
a Bayesian posterior over every possible rule, with an Occam simplicity prior
and a misclick-noise model. It yields both a live prediction ("should you click
now?") and a confidence that drives the reveal.

import { useState } from 'react'
import { GAMES } from './games/registry.js'
import GameCard from './components/GameCard.jsx'

export default function App() {
  const [activeId, setActiveId] = useState(null)
  const active = GAMES.find((g) => g.id === activeId && g.status === 'live')

  return (
    <div className="app">
      <header className="site-header">
        <button
          className="brand"
          onClick={() => setActiveId(null)}
          title="Back to the lab"
        >
          <span className="brand-mark">🧠</span>
          <span className="brand-text">
            <strong>Mind Lab</strong>
            <em>games where an AI learns to predict you</em>
          </span>
        </button>
      </header>

      <main className="site-main">
        {active ? (
          <>
            <button className="back-link" onClick={() => setActiveId(null)}>
              ← All games
            </button>
            <active.component />
          </>
        ) : (
          <Home onPlay={setActiveId} />
        )}
      </main>

      <footer className="site-footer">
        <p>
          Built as an experiment in behavior prediction. Every model runs
          entirely in your browser — nothing you do here is sent anywhere.
        </p>
      </footer>
    </div>
  )
}

function Home({ onPlay }) {
  return (
    <div className="home">
      <section className="hero">
        <h1>Can a machine predict what you'll do?</h1>
        <p>
          Play a short game. An AI watches your choices, learns the pattern
          behind them, and then shows you it has read your mind. Start with{' '}
          <strong>Color Pattern</strong> — more games are on the way.
        </p>
      </section>

      <section className="game-grid">
        {GAMES.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onPlay={() => game.status === 'live' && onPlay(game.id)}
          />
        ))}
      </section>
    </div>
  )
}

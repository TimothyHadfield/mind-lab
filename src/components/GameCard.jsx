export default function GameCard({ game, onPlay }) {
  const live = game.status === 'live'
  return (
    <button
      className={`game-card ${live ? '' : 'is-locked'}`}
      style={{ '--accent': game.accent }}
      onClick={onPlay}
      disabled={!live}
    >
      <div className="game-card-top">
        <h3>{game.title}</h3>
        {live ? (
          <span className="badge badge-live">Play</span>
        ) : (
          <span className="badge badge-soon">Soon</span>
        )}
      </div>
      <p className="game-tagline">{game.tagline}</p>
      <p className="game-desc">{game.description}</p>
    </button>
  )
}

export default function GameOver({ state, onRematch, onLobby, rematchLabel = 'Rematch', rematchDisabled = false }) {
  const w = state.winner;
  const text = w === 'draw' ? "It's a draw!" : w === 0 ? 'Player 1 (Blue) wins!' : 'Player 2 (Red) wins!';
  return (
    <div className="overlay">
      <div className="card">
        <h2>{text}</h2>
        <p>{state.snakes[0].score} – {state.snakes[1].score}</p>
        <div className="row">
          <button className="btn primary" onClick={onRematch} disabled={rematchDisabled}>{rematchLabel}</button>
          <button className="btn" onClick={onLobby}>Lobby</button>
        </div>
      </div>
    </div>
  );
}

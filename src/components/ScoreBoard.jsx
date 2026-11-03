export default function ScoreBoard({ state, labels = ['Player 1 · WASD', 'Player 2 · Arrows'] }) {
  const [a, b] = state.snakes;
  return (
    <div className="scores">
      <div className="score p1"><span>{labels[0]}</span><b>{a.score}</b></div>
      <div className="score p2"><span>{labels[1]}</span><b>{b.score}</b></div>
    </div>
  );
}

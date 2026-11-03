import { useEffect, useRef } from 'react';
import { COLS, ROWS, COLORS } from '../game/constants.js';

const CELL = 30; // logical px per cell; CSS scales the canvas responsively

export default function GameBoard({ state }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext('2d');
    const W = COLS * CELL, H = ROWS * CELL;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#eceef1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) { ctx.moveTo(x * CELL + 0.5, 0); ctx.lineTo(x * CELL + 0.5, H); }
    for (let y = 0; y <= ROWS; y++) { ctx.moveTo(0, y * CELL + 0.5); ctx.lineTo(W, y * CELL + 0.5); }
    ctx.stroke();

    if (state.food) {
      ctx.fillStyle = COLORS.food;
      ctx.beginPath();
      ctx.arc(state.food.x * CELL + CELL / 2, state.food.y * CELL + CELL / 2, CELL * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }

    state.snakes.forEach((s, i) => {
      s.body.forEach((seg, j) => {
        ctx.fillStyle = j === 0 ? (i === 0 ? COLORS.p1Head : COLORS.p2Head) : i === 0 ? COLORS.p1 : COLORS.p2;
        const p = 2;
        ctx.beginPath();
        ctx.roundRect(seg.x * CELL + p, seg.y * CELL + p, CELL - p * 2, CELL - p * 2, 6);
        ctx.fill();
      });
    });
  }, [state]);

  return <canvas ref={ref} className="board" width={COLS * CELL} height={ROWS * CELL} />;
}

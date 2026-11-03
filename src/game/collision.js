import { COLS, ROWS } from './constants.js';

export const inBounds = (p) => p.x >= 0 && p.x < COLS && p.y >= 0 && p.y < ROWS;
export const same = (a, b) => a.x === b.x && a.y === b.y;

/**
 * Does `head` hit a body? `body` is a snake's segment list (head first).
 * When the snake did not grow this tick its tail cell is vacated, so it is
 * excluded from the check (moving into your own old tail cell is legal).
 */
export function hitsBody(head, body, { skipHead = false, tailVacates = false } = {}) {
  const end = tailVacates ? body.length - 1 : body.length;
  for (let i = skipHead ? 1 : 0; i < end; i++) {
    if (same(head, body[i])) return true;
  }
  return false;
}

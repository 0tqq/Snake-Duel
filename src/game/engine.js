import { COLS, ROWS, DIRS, OPPOSITE } from './constants.js';
import { inBounds, same, hitsBody } from './collision.js';

const MAX_QUEUE = 3;

function makeSnake(startX, y, dir) {
  const d = DIRS[dir];
  // head first, body trails behind opposite to travel direction
  const body = [0, 1, 2].map((i) => ({ x: startX - d.x * i, y }));
  return { body, dir, queue: [], score: 0 };
}

export function createState(rng = Math.random) {
  const state = {
    seq: 0,
    status: 'playing', // playing | over
    winner: null, // 0 | 1 | 'draw' | null
    snakes: [makeSnake(3, 9, 'right'), makeSnake(COLS - 4, 8, 'left')],
    food: null,
  };
  state.food = spawnFood(state, rng);
  return state;
}

export function spawnFood(state, rng = Math.random) {
  const occupied = new Set();
  for (const s of state.snakes) for (const c of s.body) occupied.add(c.y * COLS + c.x);
  const free = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!occupied.has(y * COLS + x)) free.push({ x, y });
  if (!free.length) return null;
  return free[Math.floor(rng() * free.length)];
}

/** Queue a turn. Validated against the last queued (or current) direction. */
export function queueDirection(state, player, dir) {
  if (state.status !== 'playing' || !DIRS[dir]) return;
  const s = state.snakes[player];
  const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
  if (dir === last || dir === OPPOSITE[last]) return;
  if (s.queue.length >= MAX_QUEUE) return;
  s.queue.push(dir);
}

/** Advance the simulation one tick. Mutates and returns state. */
export function step(state, rng = Math.random) {
  if (state.status !== 'playing') return state;

  // 1. apply buffered direction
  for (const s of state.snakes) {
    if (s.queue.length) {
      const next = s.queue.shift();
      if (next !== OPPOSITE[s.dir]) s.dir = next;
    }
  }

  // 2. compute new heads & whether each eats
  const heads = state.snakes.map((s) => ({ x: s.body[0].x + DIRS[s.dir].x, y: s.body[0].y + DIRS[s.dir].y }));
  const grows = heads.map((h) => state.food && same(h, state.food));

  // 3. collisions (all evaluated against pre-move bodies, so simultaneous ticks are symmetric)
  const dead = state.snakes.map((s, i) => {
    const o = 1 - i;
    const head = heads[i];
    if (!inBounds(head)) return true;
    if (hitsBody(head, s.body, { tailVacates: !grows[i] })) return true; // own body
    if (hitsBody(head, state.snakes[o].body, { tailVacates: !grows[o] })) return true; // opponent body
    if (same(head, heads[o])) return true; // head-on
    return false;
  });

  state.seq++;

  if (dead[0] || dead[1]) {
    state.status = 'over';
    state.winner = dead[0] && dead[1] ? 'draw' : dead[0] ? 1 : 0;
    return state; // freeze: snakes keep their last valid positions
  }

  // 4. move
  state.snakes.forEach((s, i) => {
    s.body.unshift(heads[i]);
    if (grows[i]) s.score++;
    else s.body.pop();
  });

  if (grows[0] || grows[1]) state.food = spawnFood(state, rng);
  return state;
}

/** Plain-JSON snapshot for broadcasting (queue is host-only). */
export function toSnapshot(state) {
  return {
    seq: state.seq,
    status: state.status,
    winner: state.winner,
    food: state.food,
    snakes: state.snakes.map((s) => ({ body: s.body, dir: s.dir, score: s.score })),
  };
}

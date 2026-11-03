import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, step, queueDirection, spawnFood } from './engine.js';
import { COLS } from './constants.js';

const fresh = () => createState(() => 0);

test('starts with 3 segments each, opposite ends, food free', () => {
  const s = fresh();
  assert.equal(s.snakes[0].body.length, 3);
  assert.equal(s.snakes[1].body.length, 3);
  assert.ok(s.snakes[0].body[0].x < COLS / 2 && s.snakes[1].body[0].x > COLS / 2);
  const all = s.snakes.flatMap((n) => n.body);
  assert.ok(!all.some((c) => c.x === s.food.x && c.y === s.food.y));
});

test('moves one cell per tick', () => {
  const s = fresh();
  const h = { ...s.snakes[0].body[0] };
  step(s);
  assert.equal(s.snakes[0].body[0].x, h.x + 1);
  assert.equal(s.snakes[0].body.length, 3);
});

test('180 reversal is rejected, including via queue', () => {
  const s = fresh();
  queueDirection(s, 0, 'left'); // reverse of right
  assert.equal(s.snakes[0].queue.length, 0);
  queueDirection(s, 0, 'up');
  queueDirection(s, 0, 'down'); // reverse of queued up
  assert.deepEqual(s.snakes[0].queue, ['up']);
});

test('buffered quick turns are both applied', () => {
  const s = fresh();
  queueDirection(s, 0, 'up');
  queueDirection(s, 0, 'left');
  step(s); assert.equal(s.snakes[0].dir, 'up');
  step(s); assert.equal(s.snakes[0].dir, 'left');
});

test('eating grows, scores, respawns food off snakes', () => {
  const s = fresh();
  const h = s.snakes[0].body[0];
  s.food = { x: h.x + 1, y: h.y };
  step(s, () => 0);
  assert.equal(s.snakes[0].score, 1);
  assert.equal(s.snakes[0].body.length, 4);
  assert.equal(s.snakes[1].score, 0);
  const all = s.snakes.flatMap((n) => n.body);
  assert.ok(!all.some((c) => c.x === s.food.x && c.y === s.food.y));
});

test('wall collision: other player wins, game freezes', () => {
  const s = fresh();
  s.snakes[0].body = [{ x: COLS - 1, y: 3 }, { x: COLS - 2, y: 3 }, { x: COLS - 3, y: 3 }];
  step(s);
  assert.equal(s.status, 'over');
  assert.equal(s.winner, 1);
  const frozen = JSON.stringify(s.snakes);
  step(s);
  assert.equal(JSON.stringify(s.snakes), frozen);
});

test('hitting opponent body loses', () => {
  const s = fresh();
  s.snakes[0].body = [{ x: 10, y: 5 }, { x: 9, y: 5 }, { x: 8, y: 5 }];
  s.snakes[0].dir = 'right';
  s.snakes[1].body = [{ x: 11, y: 8 }, { x: 11, y: 7 }, { x: 11, y: 6 }, { x: 11, y: 5 }, { x: 11, y: 4 }];
  s.snakes[1].dir = 'down';
  s.food = { x: 0, y: 0 };
  step(s);
  assert.equal(s.status, 'over');
  assert.equal(s.winner, 1);
});

test('self collision loses', () => {
  const s = fresh();
  s.snakes[0].body = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }, { x: 7, y: 5 }];
  s.snakes[0].dir = 'right'; // head -> (6,5) which is body
  step(s);
  assert.equal(s.winner, 1);
});

test('moving into own vacating tail cell is legal', () => {
  const s = fresh();
  // 2x2 loop: head (5,5) moving down into (5,6)... tail at (5,6)
  s.snakes[0].body = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }];
  s.snakes[0].dir = 'left';
  queueDirection(s, 0, 'down');
  s.food = { x: 0, y: 0 };
  step(s);
  assert.equal(s.status, 'playing');
});

test('same-tick crashes draw; head-on is a draw', () => {
  const s = fresh();
  s.snakes[0].body = [{ x: 9, y: 5 }, { x: 8, y: 5 }, { x: 7, y: 5 }];
  s.snakes[0].dir = 'right';
  s.snakes[1].body = [{ x: 11, y: 5 }, { x: 12, y: 5 }, { x: 13, y: 5 }];
  s.snakes[1].dir = 'left';
  s.food = { x: 0, y: 0 };
  step(s); // both move into (10,5)
  assert.equal(s.winner, 'draw');
});

test('spawnFood never lands on a snake', () => {
  const s = fresh();
  for (let i = 0; i < 200; i++) {
    const f = spawnFood(s, Math.random);
    assert.ok(!s.snakes.some((n) => n.body.some((c) => c.x === f.x && c.y === f.y)));
  }
});

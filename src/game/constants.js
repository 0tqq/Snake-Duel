export const COLS = 24;
export const ROWS = 18;
export const TICK_MS = 140;

export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

// Key -> [player index, direction]
export const KEYMAP = {
  w: [0, 'up'], a: [0, 'left'], s: [0, 'down'], d: [0, 'right'],
  ArrowUp: [1, 'up'], ArrowLeft: [1, 'left'], ArrowDown: [1, 'down'], ArrowRight: [1, 'right'],
};

export const COLORS = { p1: '#2563eb', p1Head: '#1d4ed8', p2: '#dc2626', p2Head: '#b91c1c', food: '#16a34a' };

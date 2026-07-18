// ============================================
// Player Entity
// ============================================

const TILE_SIZE = 48;

export const player = {
  x: 0,
  y: 0,
  width: TILE_SIZE - 12,
  height: TILE_SIZE - 12,
  speed: 120,
  runSpeed: 210,
  isRunning: false,
  inLight: false,
  sanity: 100,
  corruption: 0,
  souls: 0,
  candles: 3,
  rocks: 2,
  soulTrail: [],
  trailTimer: 0,
  moving: false,
  direction: { x: 0, y: 0 },
  _stepTimer: 0,
  _heartbeatTimer: 0,

  reset() {
    this.sanity = 100;
    this.corruption = 0;
    this.souls = 0;
    this.candles = 3;
    this.rocks = 2;
    this.soulTrail = [];
    this.trailTimer = 0;
    this.moving = false;
    this.isRunning = false;
  },
};

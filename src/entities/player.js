// ============================================
// Player Entity
// ============================================

const TILE_SIZE = 48;

export const player = {
  x: 0,
  y: 0,
  width: TILE_SIZE - 18,
  height: TILE_SIZE - 18,
  speed: 120,
  runSpeed: 210,
  isRunning: false,
  inLight: false,
  sanity: 100,
  corruption: 0,

  // Health System
  maxLives: 3,
  lives: 3,
  invulnerableTimer: 0,

  soulsDelivered: 0,
  carrying: null,

  // Footprints (Bloody Trail)
  footprints: [],
  lastFootprintPos: { x: 0, y: 0 },

  soulTrail: [],
  trailTimer: 0,

  moving: false,
  direction: { x: 0, y: 0 },
  _stepTimer: 0,
  _heartbeatTimer: 0,

  reset(difficulty = "normal") {
    this.sanity = 100;
    this.corruption = 0;
    this.soulsDelivered = 0;
    this.carrying = null;
    this.soulTrail = [];
    this.trailTimer = 0;
    this.moving = false;
    this.isRunning = false;
    this.invulnerableTimer = 0;
    this.footprints = [];

    if (difficulty === "easy") this.maxLives = 5;
    else if (difficulty === "hell") this.maxLives = 1;
    else this.maxLives = 3;

    this.lives = this.maxLives;
  },
};

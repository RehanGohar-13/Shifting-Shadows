// ============================================
// Camera System
// ============================================

import { player } from "../entities/player.js";

export const camera = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  canvas: null,

  init(canvas) {
    this.canvas = canvas;
  },

  update(dt) {
    this.targetX = player.x + player.width / 2 - this.canvas.width / 2;
    this.targetY = player.y + player.height / 2 - this.canvas.height / 2;
    this.x += (this.targetX - this.x) * 0.08;
    this.y += (this.targetY - this.y) * 0.08;
  },

  snap() {
    this.x = player.x + player.width / 2 - this.canvas.width / 2;
    this.y = player.y + player.height / 2 - this.canvas.height / 2;
    this.targetX = this.x;
    this.targetY = this.y;
  },
};

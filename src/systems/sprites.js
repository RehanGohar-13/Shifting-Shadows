// ============================================
// SHIFTING SHADOWS — Sprite Loader
// ============================================

class SpriteSystem {
  constructor() {
    this.sprites = {};
    this.loaded = false;
    this.loadedCount = 0;
    this.totalCount = 0;
  }

  load() {
    return new Promise((resolve) => {
      // Generate wall tile procedurally
      this.sprites.wall = this.createWallTile();

      const spriteMap = {
        player: "./assets/sprites/Tiles/tile_0096.png",
        phantom: "./assets/sprites/Tiles/tile_0121.png",
        phantomChase: "./assets/sprites/Tiles/tile_0121.png",
        phantom2: "./assets/sprites/Tiles/tile_0108.png",
        floor: "./assets/sprites/Tiles/tile_0040.png",
        soul: "./assets/sprites/Tiles/tile_0113.png",
        candle: "./assets/sprites/Tiles/tile_0127.png",
        rock: "./assets/sprites/rock.png",
        rift: "./assets/sprites/rift.png",
        bone: "./assets/sprites/Tiles/tile_0130.png",
      };

      this.totalCount = Object.keys(spriteMap).length;

      Object.entries(spriteMap).forEach(([key, path]) => {
        const img = new Image();
        img.onload = () => {
          if (key === "rock") {
            this.sprites[key] = this.removeWhiteBackground(img);
          } else {
            this.sprites[key] = img;
          }
          this.loadedCount++;
          console.log(`Loaded ${key} (${this.loadedCount}/${this.totalCount})`);
          if (this.loadedCount === this.totalCount) {
            this.loaded = true;
            console.log("All sprites loaded!");
            resolve();
          }
        };
        img.onerror = () => {
          console.error(`Failed to load: ${path}`);
          this.loadedCount++;
          if (this.loadedCount === this.totalCount) {
            this.loaded = true;
            resolve();
          }
        };
        img.src = path;
      });
    });
  }

  removeWhiteBackground(img) {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 240 && g > 240 && b > 240) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  createWallTile() {
    const size = 16;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    // Base dark stone
    ctx.fillStyle = "#2a1a3a";
    ctx.fillRect(0, 0, size, size);

    // Brick pattern
    const brickH = 4;
    const brickW = 8;

    for (let row = 0; row < size / brickH; row++) {
      const offset = row % 2 === 0 ? 0 : brickW / 2;
      for (let col = -1; col < size / brickW + 1; col++) {
        const x = col * brickW + offset;
        const y = row * brickH;
        const shade = 35 + Math.floor(Math.random() * 15);
        ctx.fillStyle = `rgb(${shade}, ${Math.floor(shade * 0.6)}, ${shade + 20})`;
        ctx.fillRect(x + 1, y, brickW - 1, brickH - 1);
      }
    }

    // Mortar lines
    ctx.strokeStyle = "rgba(20, 5, 30, 0.6)";
    ctx.lineWidth = 1;
    for (let row = 0; row <= size / brickH; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * brickH);
      ctx.lineTo(size, row * brickH);
      ctx.stroke();
    }
    for (let row = 0; row < size / brickH; row++) {
      const offset = row % 2 === 0 ? 0 : brickW / 2;
      for (let col = 0; col <= size / brickW + 1; col++) {
        const x = col * brickW + offset;
        ctx.beginPath();
        ctx.moveTo(x, row * brickH);
        ctx.lineTo(x, (row + 1) * brickH);
        ctx.stroke();
      }
    }

    // Purple tint (matches game theme)
    ctx.fillStyle = "rgba(107, 0, 255, 0.05)";
    ctx.fillRect(0, 0, size, size);

    return c;
  }

  update(dt) {}

  get generated() {
    return this.loaded;
  }
}

export const sprites = new SpriteSystem();

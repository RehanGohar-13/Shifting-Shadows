// ============================================
// SHIFTING SHADOWS — Sprite Loader
// ============================================

class SpriteSystem {
  constructor() {
    this.sprites = {};
    this.loaded = false;
    this.loadedCount = 0;
    this.totalCount = 0;
    this.onReady = null;
  }

  // Load all sprites — returns a promise
  load() {
    return new Promise((resolve) => {
      const spriteMap = {
        // Characters
        player: "assets/sprites/Tiles/tile_0096.png",
        phantom: "assets/sprites/Tiles/tile_0121.png",
        phantomChase: "assets/sprites/Tiles/tile_0121.png",
        phantom2: "assets/sprites/Tiles/tile_0108.png",

        // Environment
        wall: "assets/sprites/Tiles/tile_0040.png",
        floor: "assets/sprites/Tiles/tile_0014.png",

        // Objects
        soul: "assets/sprites/Tiles/tile_0113.png",
        candle: "assets/sprites/Tiles/tile_0127.png",
        rock: "assets/sprites/rock.png",
        rift: "assets/sprites/rift.png",
      };

      this.totalCount = Object.keys(spriteMap).length;

      Object.entries(spriteMap).forEach(([key, path]) => {
        const img = new Image();
        img.onload = () => {
          // Process rock to remove white background
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

  // Remove white background (for rock)
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

      // Remove white and near-white pixels
      if (r > 240 && g > 240 && b > 240) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // For compatibility with old code
  update(dt) {
    // Animation timing can go here later
  }

  get generated() {
    return this.loaded;
  }
}

export const sprites = new SpriteSystem();

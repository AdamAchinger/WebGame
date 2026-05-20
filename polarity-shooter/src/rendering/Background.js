/**
 * Background – scrolling starfield image with parallax asteroids.
 */
import { GAME_W, GAME_H } from '../constants.js';

const cb = '?v=' + Date.now();
const bgImage = new Image();
bgImage.src = 'assets/bg_space.jpg' + cb;

const asteroidImages = [];
for (let i = 1; i <= 4; i++) {
  const img = new Image();
  img.src = `assets/asteroid_${i}.png` + cb;
  asteroidImages.push(img);
}

export class Background {
  constructor() {
    this._bgOffset = 0;
    this._bgSpeed = 30; // pixels per second

    this._asteroids = [];
    
    // Create initial asteroids
    for (let i = 0; i < 15; i++) {
      this._spawnAsteroid(true);
    }
  }

  _spawnAsteroid(initial = false) {
    const scale = 0.1 + Math.random() * 0.25; 
    // Parallax: larger asteroids are "closer" and move faster
    const baseSpeed = 20 + scale * 200;
    
    this._asteroids.push({
      imgIndex: Math.floor(Math.random() * 4),
      x: Math.random() * GAME_W,
      y: initial ? Math.random() * GAME_H : -200,
      speed: baseSpeed,
      scale: scale,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 1.5,
    });
  }

  update(dt) {
    // Scroll background
    this._bgOffset += this._bgSpeed * dt;
    
    // Update asteroids
    for (let i = this._asteroids.length - 1; i >= 0; i--) {
      const ast = this._asteroids[i];
      ast.y += ast.speed * dt;
      ast.rotation += ast.rotationSpeed * dt;

      // Remove and respawn if off screen
      if (ast.y > GAME_H + 200) {
        this._asteroids.splice(i, 1);
        this._spawnAsteroid(false);
      }
    }
  }

  draw(ctx) {
    // Fallback base color
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    if (bgImage.complete && bgImage.naturalHeight > 0) {
      // Calculate drawing dimensions to cover the canvas width
      const scale = GAME_W / bgImage.naturalWidth;
      const drawW = GAME_W;
      const drawH = bgImage.naturalHeight * scale;

      // Loop offset
      if (this._bgOffset > drawH) {
        this._bgOffset -= drawH;
      }

      // Draw background twice for seamless scrolling
      ctx.drawImage(bgImage, 0, this._bgOffset, drawW, drawH);
      ctx.drawImage(bgImage, 0, this._bgOffset - drawH, drawW, drawH);
      
      // Dark overlay to ensure game objects pop
      ctx.fillStyle = 'rgba(5, 5, 8, 0.45)';
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    }

    // Draw asteroids
    for (const ast of this._asteroids) {
      const img = asteroidImages[ast.imgIndex];
      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.rotation);
        
        // Draw centered and scaled
        const w = img.naturalWidth * ast.scale;
        const h = img.naturalHeight * ast.scale;
        
        // Darken asteroids slightly so they don't distract from gameplay
        ctx.filter = 'brightness(0.5) saturate(0.8)';
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }
  }
}

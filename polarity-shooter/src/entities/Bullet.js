/**
 * Bullet – projectile fired by player or enemy.
 */
import { Entity } from './Entity.js';
import { POLARITY, POLARITY_COLORS } from '../constants.js';

const rocketImg = new Image();
rocketImg.src = 'assets/rocket.png';

const bulletImg = new Image();
bulletImg.src = 'assets/bullet.png';

const tintedBulletCache = { [POLARITY.BLUE]: {}, [POLARITY.RED]: {} };

function getTintedProjectileSprite(img, isRocket, polarity) {
  const typeKey = isRocket ? 'rocket' : 'bullet';
  if (tintedBulletCache[polarity][typeKey]) return tintedBulletCache[polarity][typeKey];
  
  if (!img || !img.complete || img.naturalWidth === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0);

  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = polarity === POLARITY.RED ? 'rgba(255, 60, 60, 0.9)' : 'rgba(60, 140, 255, 0.9)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(img, 0, 0);

  tintedBulletCache[polarity][typeKey] = canvas;
  return canvas;
}

export class Bullet extends Entity {
  /**
   * @param {object} opts
   * @param {import('../utils/Vector2.js').Vector2} opts.position
   * @param {import('../utils/Vector2.js').Vector2} opts.velocity
   * @param {number} opts.polarity  POLARITY.BLUE or POLARITY.RED
   * @param {number} [opts.damage]
   * @param {boolean} [opts.isPlayerBullet]
   * @param {number} [opts.radius]
   */
  constructor({ position, velocity, polarity, damage = 1, isPlayerBullet = false, radius = 4, isRocket = false }) {
    super({ position, radius, hp: 1 });
    this.velocity = velocity.clone();
    this.polarity = polarity;
    this.damage = damage;
    this.isPlayerBullet = isPlayerBullet;
    this.isRocket = isRocket;

    // For rotational-mode bullets, store the angle for oriented drawing
    this._angle = Math.atan2(velocity.y, velocity.x);
  }

  update(dt, enemies = []) {
    if (this.isRocket && this.isPlayerBullet && enemies && enemies.length > 0) {
      // Find nearest enemy
      let nearest = null;
      let minDist = Infinity;
      for (const e of enemies) {
        if (!e.isAlive) continue;
        const distSq = (e.position.x - this.position.x) ** 2 + (e.position.y - this.position.y) ** 2;
        if (distSq < minDist) {
          minDist = distSq;
          nearest = e;
        }
      }

      // Home in on nearest enemy
      if (nearest) {
        const dx = nearest.position.x - this.position.x;
        const dy = nearest.position.y - this.position.y;
        const targetAngle = Math.atan2(dy, dx);
        
        // Smooth rotation
        const currentAngle = Math.atan2(this.velocity.y, this.velocity.x);
        let diff = targetAngle - currentAngle;
        
        // Normalize diff to -PI to PI
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        const turnSpeed = 4.0; // rad/s (smoother homing)
        const newAngle = currentAngle + Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed * dt);
        
        // Gradual acceleration
        const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        const targetSpeed = 800;
        const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * 3 * dt;
        
        this.velocity.x = Math.cos(newAngle) * newSpeed;
        this.velocity.y = Math.sin(newAngle) * newSpeed;
        this._angle = newAngle;
      }
    }

    super.update(dt);
    
    if (this.isRocket && this.age > 1.0) {
      this.isAlive = false; // Explodes after 1 seconds
    }
    
    // Remove bullets that fly off-screen (generous margin)
    if (this.position.y < -100 || this.position.y > 900 ||
        this.position.x < -100 || this.position.x > 700) {
      this.isAlive = false;
    }
  }

  draw(ctx) {
    const col = POLARITY_COLORS[this.polarity];
    if (!col) return; // safety
    const { x, y } = this.position;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle + Math.PI / 2); // rotate so "up" aligns with velocity direction

    const baseImg = this.isRocket ? rocketImg : bulletImg;
    
    // Adjust size depending on type
    const w = this.isRocket ? 16 : 10;
    const h = this.isRocket ? 32 : 24;

    const tintedImg = getTintedProjectileSprite(baseImg, this.isRocket, this.polarity);

    if (tintedImg) {
      ctx.drawImage(tintedImg, -w/2, -h/2, w, h);
      
      // Restore for glow (optional)
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = col.glow;
      ctx.shadowBlur = 10;
      ctx.fillStyle = col.glow;
    } else {
      // Fallback
      ctx.fillStyle = col.bullet;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

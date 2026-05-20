/**
 * Enemy – multiple enemy types with varied shapes, bullet patterns, and behaviors.
 *
 * Types: GRUNT, FLANKER, TANK, ROTATING_LASER, SNIPER
 */
import { Entity } from './Entity.js';
import { Bullet } from './Bullet.js';
import { Vector2 } from '../utils/Vector2.js';
import { POLARITY, POLARITY_COLORS, ENEMY, GAME_W, GAME_H } from '../constants.js';
import { soundManager } from '../managers/SoundManager.js';

export const ENEMY_TYPE = Object.freeze({
  GRUNT:   'grunt',    // basic, straight line
  FLANKER: 'flanker',  // fast, sine wave arcs
  TANK:    'tank',     // slow, big HP
  ROTATING_LASER: 'rotating_laser',  // shoots in all directions
  SNIPER:  'sniper',   // slow turning arcs
  LOOPER:  'looper',   // fast, loops around
  SWOOPER: 'swooper',  // comes from behind, meets in middle, dives at player
  ORBITER: 'orbiter',  // flies to screen, stops, spins, and shoots
});

const enemySprites = {};
const cb = '?v=' + Date.now();
if (typeof Image !== 'undefined') {
  enemySprites[ENEMY_TYPE.GRUNT] = new Image();
  enemySprites[ENEMY_TYPE.GRUNT].src = 'assets/enemy_grunt.png' + cb;
  
  enemySprites[ENEMY_TYPE.FLANKER] = new Image();
  enemySprites[ENEMY_TYPE.FLANKER].src = 'assets/enemy_flanker.png' + cb;
  
  enemySprites[ENEMY_TYPE.TANK] = new Image();
  enemySprites[ENEMY_TYPE.TANK].src = 'assets/enemy_tank.png' + cb;
  
  enemySprites[ENEMY_TYPE.ROTATING_LASER] = new Image();
  enemySprites[ENEMY_TYPE.ROTATING_LASER].src = 'assets/enemy_spinner.png' + cb; // keep original filename
  
  enemySprites[ENEMY_TYPE.SNIPER] = new Image();
  enemySprites[ENEMY_TYPE.SNIPER].src = 'assets/enemy_sniper.png' + cb;
}

const tintedEnemyCache = { [POLARITY.BLUE]: {}, [POLARITY.RED]: {} };

function getTintedEnemySprite(type, polarity) {
  if (tintedEnemyCache[polarity][type]) return tintedEnemyCache[polarity][type];
  
  const img = enemySprites[type];
  if (!img || !img.complete || img.naturalWidth === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Multiply color by texture brightness:
  // We use globalCompositeOperation = 'multiply' to overlay a color
  ctx.globalCompositeOperation = 'multiply';
  
  // Zmniejsz hue o 75% -> 25% intensity (0.25 alpha)
  ctx.fillStyle = polarity === POLARITY.RED ? 'rgba(255, 20, 20, 0.25)' : 'rgba(20, 150, 255, 0.25)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Restore the original alpha channel (cut out the rectangular background)
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(img, 0, 0);

  tintedEnemyCache[polarity][type] = canvas;
  return canvas;
}

export class Enemy extends Entity {
  constructor({
    position,
    polarity,
    hp = 2,
    speed = 80,
    fireRate = 2.0,
    scoreValue = 100,
    radius = 12,
    isBoss = false,
    moveDir = null,
    type = ENEMY_TYPE.GRUNT,
  }) {
    super({ position, radius, hp });
    this.polarity   = polarity;
    this.speed      = speed;
    this.fireRate   = fireRate;
    this.fireTimer  = Math.random() * fireRate;
    this.scoreValue = scoreValue;
    this.isBoss     = isBoss;
    this.type       = type;
    this.moveDir    = moveDir ? moveDir.clone() : new Vector2(0, 1);
    this.baseAngle  = Math.atan2(this.moveDir.y, this.moveDir.x);

    this._sinePhase  = Math.random() * Math.PI * 2;
    this._spinAngle  = 0;
    this._hitFlash   = 0;

    this.burstFiresLeft = 0;
    this.burstTimer = 0;
  }

  update(dt, playerPos) {
    this.age += dt;
    this._hitFlash = Math.max(0, this._hitFlash - dt);
    this._spinAngle += dt * 3;

    let turnRate = 0;
    let targetAngle = null;

    // Movement by type - Airplane flight model
    switch (this.type) {
      case ENEMY_TYPE.GRUNT:
        // Steer towards player constantly
        targetAngle = Math.atan2(playerPos.y - this.position.y, playerPos.x - this.position.x);
        turnRate = 1.0;
        break;

      case ENEMY_TYPE.TANK:
        // Heavy, slow turning towards player
        targetAngle = Math.atan2(playerPos.y - this.position.y, playerPos.x - this.position.x);
        turnRate = 0.4;
        break;

      case 'looper':
        // Flies in, loops 360 degrees, then leaves
        if (this.age > 0.6 && this.age < 2.0) {
           const currentAngle = Math.atan2(this.moveDir.y, this.moveDir.x);
           const loopDir = this.position.x > GAME_W / 2 ? -1 : 1; 
           const newAngle = currentAngle + (Math.PI * 1.5) * loopDir * dt;
           this.moveDir.x = Math.cos(newAngle);
           this.moveDir.y = Math.sin(newAngle);
        } else if (this.age >= 2.0) {
           targetAngle = this.baseAngle; // Return to original trajectory
           turnRate = 3.0;
        }
        break;

      case ENEMY_TYPE.SWOOPER:
        // Comes from behind, arcs to center, then dives at player
        if (this.age > 1.2 && this.age < 2.5) {
          targetAngle = Math.atan2(GAME_H/2 - 100 - this.position.y, GAME_W/2 - this.position.x);
          turnRate = 4.0;
        } else if (this.age >= 2.5 && this.age <= 2.6) {
           targetAngle = Math.atan2(playerPos.y - this.position.y, playerPos.x - this.position.x);
           turnRate = 8.0; 
           this.speed = 350; 
        } else if (this.age > 2.6) {
           turnRate = 0; 
        }
        break;

      case ENEMY_TYPE.ORBITER:
        if (this.age < 1.0) {
           this.speed = Math.max(0, this.speed - dt * 100); 
        } else if (this.age >= 1.0 && this.age < 3.5) {
           this.speed = 0;
           turnRate = 0; 
        } else if (this.age >= 3.5) {
           this.speed += dt * 150;
           targetAngle = this.baseAngle + Math.PI; 
           turnRate = 2.0;
        }
        break;

      case ENEMY_TYPE.FLANKER:
        // Fast, aggressive homing
        targetAngle = Math.atan2(playerPos.y - this.position.y, playerPos.x - this.position.x);
        turnRate = 1.8; 
        break;

      case ENEMY_TYPE.SNIPER:
        // Gently steer towards player
        targetAngle = Math.atan2(playerPos.y - this.position.y, playerPos.x - this.position.x);
        turnRate = 0.7; 
        break;

      case ENEMY_TYPE.ROTATING_LASER:
        // Fly in, then brake to a complete stop to act as a turret
        if (this.age > 1.5) {
          this.speed = Math.max(0, this.speed - dt * 250);
          turnRate = 0;
        } else {
          turnRate = 0;
        }
        break;
    }

    // Apply smooth rotation to moveDir
    if (targetAngle !== null && turnRate > 0) {
      const currentAngle = Math.atan2(this.moveDir.y, this.moveDir.x);
      let diff = targetAngle - currentAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const step = diff > 0 ? Math.min(diff, turnRate * dt) : Math.max(diff, -turnRate * dt);
      const newAngle = currentAngle + step;
      this.moveDir.x = Math.cos(newAngle);
      this.moveDir.y = Math.sin(newAngle);
    }

    // Apply inertia: continuously move forward
    this.position.x += this.moveDir.x * this.speed * dt;
    this.position.y += this.moveDir.y * this.speed * dt;

    // Off-screen removal
    if (this.position.y > GAME_H + 100 || this.position.y < -100 ||
        this.position.x > GAME_W + 100 || this.position.x < -100) {
      this.isAlive = false;
      return [];
    }

    // Shooting
    const bullets = [];
    if (this.position.x > 5 && this.position.x < GAME_W - 5 &&
        this.position.y > 5 && this.position.y < GAME_H - 5) {
      
      if (this.burstFiresLeft > 0) {
        this.burstTimer -= dt;
        if (this.burstTimer <= 0) {
          this.burstTimer = 0.12;
          this.burstFiresLeft--;
          const newBullets = this._fireBullets(playerPos);
          if (newBullets.length > 0) {
            bullets.push(...newBullets);
            soundManager.playEnemyShoot();
          }
        }
      }

      if (this.fireRate > 0) {
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
          this.fireTimer = this.fireRate;
          
          if (this.type === ENEMY_TYPE.SNIPER) {
            this.burstFiresLeft = 4;
            this.burstTimer = 0.12;
          }

          const newBullets = this._fireBullets(playerPos);
          if (newBullets.length > 0) {
            bullets.push(...newBullets);
            soundManager.playEnemyShoot();
          }
        }
      }
    }

    return bullets;
  }

  takeDamage(amount) {
    super.takeDamage(amount);
    this._hitFlash = 0.08;
  }

  _fireBullets(playerPos) {
    const { x, y } = this.position;
    const spd = ENEMY.BULLET_SPEED;
    
    // Shoot forward (in moveDir direction)
    const forwardAngle = Math.atan2(this.moveDir.y, this.moveDir.x);
    const dirX = Math.cos(forwardAngle);
    const dirY = Math.sin(forwardAngle);

    // Calculate direction towards player (used for turret and sniper targeting)
    const angleToPlayer = Math.atan2(playerPos.y - y, playerPos.x - x);
    const playerDirX = Math.cos(angleToPlayer);
    const playerDirY = Math.sin(angleToPlayer);

    switch (this.type) {
      case ENEMY_TYPE.GRUNT:
      case ENEMY_TYPE.LOOPER:
      case ENEMY_TYPE.SWOOPER: {
        // Machine gun: single shot forward (in moveDir) with slight inaccuracy
        const spray = forwardAngle + (Math.random() - 0.5) * 0.2;
        return [this._mkBullet(x, y, Math.cos(spray) * spd, Math.sin(spray) * spd, 4)];
      }

      case ENEMY_TYPE.ORBITER: {
        const bullets = [];
        if (this.age > 1.5 && this.age < 3.0) {
          // Orbiter: fires a fan in its forward direction
          for (let i = -2; i <= 2; i++) {
            const a = forwardAngle + (Math.PI / 8) * i;
            bullets.push(this._mkBullet(x, y, Math.cos(a) * spd * 0.8, Math.sin(a) * spd * 0.8, 4));
          }
        }
        return bullets;
      }

      case ENEMY_TYPE.FLANKER: {
        // Fast planes: Twin-linked fast shots forward (in moveDir)
        const px = -dirY * 8, py = dirX * 8;
        return [
          this._mkBullet(x + px, y + py, dirX * spd * 1.5, dirY * spd * 1.5, 3),
          this._mkBullet(x - px, y - py, dirX * spd * 1.5, dirY * spd * 1.5, 3),
        ];
      }

      case ENEMY_TYPE.TANK: {
        // Bombs: Heavy double shot forward (in moveDir)
        const px = -dirY * 12, py = dirX * 12;
        return [
          this._mkBullet(x + px, y + py, dirX * spd * 0.5, dirY * spd * 0.5, 7),
          this._mkBullet(x - px, y - py, dirX * spd * 0.5, dirY * spd * 0.5, 7)
        ];
      }

      case ENEMY_TYPE.ROTATING_LASER: {
        // Turret: fires spinning ring and aimed shot at player
        const bullets = [];
        const count = 6;
        for (let i = 0; i < count; i++) {
          const a = this._spinAngle + (Math.PI * 2 / count) * i;
          bullets.push(this._mkBullet(x, y, Math.cos(a) * spd * 0.7, Math.sin(a) * spd * 0.7, 4));
        }
        bullets.push(this._mkBullet(x, y, playerDirX * spd * 1.1, playerDirY * spd * 1.1, 5)); 
        return bullets;
      }

      case ENEMY_TYPE.SNIPER: {
        // Sniper: shoots aimed burst towards player
        return [this._mkBullet(x, y, playerDirX * spd * 1.6, playerDirY * spd * 1.6, 3)];
      }

      default:
        return [];
    }
  }

  _mkBullet(bx, by, vx, vy, r) {
    return new Bullet({
      position: new Vector2(bx, by),
      velocity: new Vector2(vx, vy),
      polarity: this.polarity,
      damage: 1,
      isPlayerBullet: false,
      radius: r,
    });
  }

  draw(ctx) {
    const { x, y } = this.position;
    const col = POLARITY_COLORS[this.polarity];
    const r = this.radius;
    if (!col) return;

    ctx.save();

    // Remove old shadow blur border. Only keep it for hit flash.
    if (this._hitFlash > 0) {
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 20;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    const img = enemySprites[this.type];

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.translate(x, y);
      const facing = Math.atan2(this.moveDir.y, this.moveDir.x);
      // Sprites face UP natively. Rotate to match moveDir.
      ctx.rotate(facing + Math.PI / 2);

      const drawScale = r * 3.5; 
      
      // We use a cached tinted sprite to correctly multiply hue by texture brightness
      let tintedImg = getTintedEnemySprite(this.type, this.polarity);
      
      if (!tintedImg) {
         tintedImg = img; // fallback
      }

      // Draw the image
      ctx.drawImage(tintedImg, -drawScale / 2, -drawScale / 2, drawScale, drawScale);

      // Hit flash overlay
      if (this._hitFlash > 0) {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Revert transform
      ctx.rotate(-(facing + Math.PI / 2));
      ctx.translate(-x, -y);

    } else {
      const fill = this._hitFlash > 0 ? '#fff' : col.core;

      switch (this.type) {
        case ENEMY_TYPE.GRUNT:
          this._drawTriangle(ctx, x, y, r, col, fill);
          break;
        case ENEMY_TYPE.FLANKER:
          this._drawDart(ctx, x, y, r, col, fill);
          break;
        case ENEMY_TYPE.TANK:
          this._drawHex(ctx, x, y, r, col, fill);
          break;
        case ENEMY_TYPE.ROTATING_LASER:
          this._drawSpinner(ctx, x, y, r, col, fill);
          break;
        case ENEMY_TYPE.SNIPER:
          this._drawDiamond(ctx, x, y, r, col, fill);
          break;
        default:
          this._drawTriangle(ctx, x, y, r, col, fill);
      }
    }

    // HP bar for high-HP enemies
    if (this.maxHp > 3) {
      ctx.shadowBlur = 0;
      const barW = r * 2;
      const barH = 3;
      const barX = x - barW / 2;
      const barY = y - r - 8;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = col.bright;
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
    }

    ctx.restore();
  }

  // ── Shape draw helpers ──

  _drawTriangle(ctx, x, y, r, col, fill) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = col.bright;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - r, y - r * 0.7);
    ctx.lineTo(x + r, y - r * 0.7);
    ctx.lineTo(x, y + r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    this._drawCore(ctx, x, y, col);
  }

  _drawDart(ctx, x, y, r, col, fill) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = col.bright;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + r * 1.1);
    ctx.lineTo(x + r, y - r * 0.6);
    ctx.lineTo(x + r * 0.3, y - r * 0.2);
    ctx.lineTo(x - r * 0.3, y - r * 0.2);
    ctx.lineTo(x - r, y - r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    this._drawCore(ctx, x, y, col);
  }

  _drawHex(ctx, x, y, r, col, fill) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = col.bright;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    this._drawCore(ctx, x, y, col);
  }

  _drawSpinner(ctx, x, y, r, col, fill) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = col.bright;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = this._spinAngle + (Math.PI / 2) * i;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
      ctx.stroke();
    }
    this._drawCore(ctx, x, y, col);
  }

  _drawDiamond(ctx, x, y, r, col, fill) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = col.bright;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.8, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.8, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    this._drawCore(ctx, x, y, col);
  }

  _drawCore(ctx, x, y, col) {
    ctx.shadowBlur = 6;
    ctx.fillStyle = col.bright;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}


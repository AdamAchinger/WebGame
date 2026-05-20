/**
 * Player – ship with polarity switching and forward-only shooting.
 * Uses the newly provided premium pixel-art sprite assets for BLUE and RED states.
 * Does a horizontal flip animation when switching polarity.
 */
import { Entity } from './Entity.js';
import { Bullet } from './Bullet.js';
import { Vector2 } from '../utils/Vector2.js';
import { POLARITY, POLARITY_COLORS, PLAYER, GAME_W, GAME_H } from '../constants.js';
import { soundManager } from '../managers/SoundManager.js';

export class Player extends Entity {
  constructor() {
    super({
      position: new Vector2(GAME_W / 2, GAME_H - 80),
      radius: PLAYER.SIZE,
      hp: 1,
    });
    this.polarity     = POLARITY.BLUE;
    this.lives        = PLAYER.MAX_LIVES;
    this.score        = 0;
    this.chain        = 0;
    this.maxChain     = 0;
    this.fireTimer    = 0;
    this.invulnTimer  = 0;
    this.hitboxRadius = PLAYER.HITBOX;

    // Abilities
    this.boostTimer         = 0;
    this.boostCharges       = 4;
    this.maxBoostCharges    = 4;
    this.boostRechargeTimer = 0;
    this.boostRechargeTime  = 1.5;
    this.overchargeTimer    = 0;
    this.overchargeCooldown = 0;

    this._switchFlash = 0;
    this._thrustPhase = 0;
    this._absorbPulse = 0;

    // Flip animation: scaleX goes 1 → 0 → -1 → 0 → 1 (or similar)
    this._flipTimer   = 0;       // > 0 means flip is in progress
    this._flipDir     = 1;       // 1 or -1
    this._deathPos    = new Vector2(GAME_W / 2, GAME_H - 80);

    // Load new spaceship sprite assets with cache buster
    const cb = '?v=' + Date.now();
    this.spriteBlue = new Image();
    this.spriteBlue.src = 'assets/Player_Blue.png' + cb;

    this.spriteRed = new Image();
    this.spriteRed.src = 'assets/Player_Red.png' + cb;
  }

  switchPolarity() {
    this.polarity = this.polarity === POLARITY.BLUE ? POLARITY.RED : POLARITY.BLUE;
    this._switchFlash = 0.25;
    this._flipTimer = 0.3; // flip duration
    this._flipDir = Math.random() > 0.5 ? 1 : -1;
    this.chain = 0;
  }

  update(dt, input) {
    if (!this.isAlive) return [];

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.boostTimer > 0) this.boostTimer -= dt;
    if (this.overchargeTimer > 0) this.overchargeTimer -= dt;
    if (this.overchargeCooldown > 0) this.overchargeCooldown -= dt;

    if (this.boostCharges < this.maxBoostCharges) {
      this.boostRechargeTimer -= dt;
      if (this.boostRechargeTimer <= 0) {
        this.boostCharges++;
        if (this.boostCharges < this.maxBoostCharges) {
          this.boostRechargeTimer = this.boostRechargeTime;
        }
      }
    } else {
      this.boostRechargeTimer = this.boostRechargeTime;
    }

    if (input.boostPressed && this.boostCharges > 0 && this.boostTimer <= 0) {
      this.boostTimer = 0.5; // half second dash
      this.boostCharges--;
      this.invulnTimer = Math.max(this.invulnTimer, 0.5); // dash i-frames
    }

    if (input.overchargePressed && this.overchargeCooldown <= 0) {
      this.overchargeTimer = 4.0; // 4 seconds of power
      this.overchargeCooldown = 12.0;
    }

    // Movement
    let speedMult = this.boostTimer > 0 ? 2.5 : 1.0;
    this.velocity.x = input.move.x * PLAYER.SPEED * speedMult;
    this.velocity.y = input.move.y * PLAYER.SPEED * speedMult;
    super.update(dt);

    const margin = this.radius;
    this.position.x = Math.max(margin, Math.min(GAME_W - margin, this.position.x));
    this.position.y = Math.max(margin, Math.min(GAME_H - margin, this.position.y));

    if (input.switchPressed) this.switchPolarity();

    // Timers
    this._switchFlash = Math.max(0, this._switchFlash - dt);
    this._thrustPhase += dt * 12;
    this._absorbPulse = Math.max(0, this._absorbPulse - dt);
    this._flipTimer   = Math.max(0, this._flipTimer - dt);

    // Shooting – always forward (up)
    const bullets = [];
    this.fireTimer -= dt;
    if (input.shoot && this.fireTimer <= 0) {
      const isOvercharge = this.overchargeTimer > 0;
      // Normal: 0.09s, Overcharge: slower (so fewer, but powerful rockets)
      this.fireTimer = isOvercharge ? PLAYER.FIRE_RATE * 8.0 : PLAYER.FIRE_RATE;
      
      const offsets = isOvercharge ? [-20, 20] : [-6, 6];
      const yOffsets = isOvercharge ? [0, 0] : [-12, -12];

      for (let i = 0; i < offsets.length; i++) {
        const ox = offsets[i];
        const oy = yOffsets[i];
        
        let vx = 0;
        let vy = -PLAYER.BULLET_SPEED;
        
        if (isOvercharge) {
          // Spread them out initially in a wider arc so they swoop in
          const spreadAngle = (i === 0) ? -1.0 : 1.0; 
          const speed = PLAYER.BULLET_SPEED * 0.4; // shoot out slowly at first
          vx = Math.sin(spreadAngle) * speed;
          vy = -Math.cos(spreadAngle) * speed;
        }

        bullets.push(new Bullet({
          position: new Vector2(this.position.x + ox, this.position.y + oy),
          velocity: new Vector2(vx, vy),
          polarity: this.polarity,
          damage: isOvercharge ? PLAYER.BULLET_DAMAGE * 3 : PLAYER.BULLET_DAMAGE, // Rockets deal more damage
          isPlayerBullet: true,
          radius: isOvercharge ? 6 : 3, // Rockets are bigger
          isRocket: isOvercharge
        }));
      }
      soundManager.playShoot(isOvercharge);
    }
    return bullets;
  }

  die(livesToLose = 1) {
    this._deathPos.set(this.position.x, this.position.y);
    this.lives -= livesToLose;
    this.chain = 0;
    if (this.lives <= 0) {
      this.isAlive = false;
    } else {
      this.invulnTimer = PLAYER.INVULN_TIME;
      const m = this.radius + 20;
      this.position.set(
        Math.max(m, Math.min(GAME_W - m, this._deathPos.x)),
        Math.max(m, Math.min(GAME_H - m, this._deathPos.y))
      );
    }
  }

  onAbsorb() {
    this.chain++;
    if (this.chain > this.maxChain) this.maxChain = this.chain;
    this._absorbPulse = 0.15;
  }

  addScore(pts) { this.score += pts; }

  draw(ctx) {
    if (!this.isAlive) return;
    const { x, y } = this.position;
    const col = POLARITY_COLORS[this.polarity];
    if (!col) return;

    ctx.save();

    // Invuln blink
    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    // Switch flash glow
    if (this._switchFlash > 0) {
      ctx.shadowColor = col.bright;
      ctx.shadowBlur = 40 * (this._switchFlash / 0.25);
    }

    // Absorb pulse ring
    if (this._absorbPulse > 0) {
      const pulseR = this.radius + 12 * (1 - this._absorbPulse / 0.15);
      ctx.strokeStyle = col.bright;
      const savedAlpha = ctx.globalAlpha;
      ctx.globalAlpha *= 0.4;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, pulseR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = savedAlpha;
    }

    // Ability Visuals
    if (this.boostTimer > 0) {
      const bRatio = this.boostTimer / 0.5;
      ctx.shadowColor = col.bright;
      ctx.shadowBlur = 15;
      ctx.globalAlpha = 0.5 * bRatio;
      
      // Draw motion trail
      const trailLen = 30;
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x - 10, y + trailLen);
      ctx.lineTo(x + 10, y + trailLen);
      ctx.closePath();
      ctx.fillStyle = col.bright;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    if (this.overchargeTimer > 0) {
      const r = this.radius + 6 + Math.sin(Date.now() / 30) * 4;
      ctx.shadowColor = col.bright;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = col.bright;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
    }

    // ── Flip animation via scaleX ──
    ctx.translate(x, y);
    if (this._flipTimer > 0) {
      const t = 1 - (this._flipTimer / 0.3);
      const scaleX = Math.cos(t * Math.PI);
      ctx.scale(scaleX, 1);
    }

    // Draw sprite if loaded, else fallback to vector procedural drawing
    const img = this.polarity === POLARITY.BLUE ? this.spriteBlue : this.spriteRed;
    if (img.complete && img.naturalWidth > 0) {
      // Dimensions matching standard ship but scaled for gorgeous detail
      const drawW = 46;
      const drawH = 46;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      // Procedural Vector Fallback:
      // Thrust
      const thrustLen = 10 + Math.sin(this._thrustPhase) * 3;
      ctx.fillStyle = col.bright;
      ctx.shadowColor = col.glow;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(-5, 8);
      ctx.lineTo(0, 8 + thrustLen);
      ctx.lineTo(5, 8);
      ctx.closePath();
      ctx.fill();

      // Ship body
      ctx.shadowColor = col.glow;
      ctx.shadowBlur = 18;
      ctx.fillStyle = col.core;
      ctx.strokeStyle = col.bright;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(14, 10);
      ctx.lineTo(4, 6);
      ctx.lineTo(0, 12);
      ctx.lineTo(-4, 6);
      ctx.lineTo(-14, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Polarity core dot
      ctx.shadowBlur = 10;
      ctx.fillStyle = col.bright;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      // Dark overlay for RED
      if (this.polarity === POLARITY.RED) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(60,10,10,0.5)';
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(14, 10);
        ctx.lineTo(4, 6);
        ctx.lineTo(0, 12);
        ctx.lineTo(-4, 6);
        ctx.lineTo(-14, 10);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();

    // Hitbox dot (world space, outside flip transform)
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(x, y, this.hitboxRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

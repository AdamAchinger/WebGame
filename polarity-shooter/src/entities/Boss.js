/**
 * Boss – end-of-level boss with high HP, sweeping laser, and alternating polarity bullet sequences.
 *
 * Attack sequences (cycle):
 *  1. BURST   – tight aimed burst at player (BLUE)
 *  2. RING    – full 360° ring of bullets   (RED)
 *  3. SPIRAL  – slow rotating spiral        (BLUE)
 *  4. LASER   – sweeping beam               (alternates)
 *  5. CROSS   – 4-way cross + aimed burst   (RED)
 *  ... loops back, gets faster every phase
 */
import { Entity } from './Entity.js';
import { Bullet } from './Bullet.js';
import { Vector2 } from '../utils/Vector2.js';
import { POLARITY, POLARITY_COLORS, GAME_W, GAME_H } from '../constants.js';

const cb = '?boss=' + Date.now();
const bossSprite = new Image();
bossSprite.src = 'assets/Enemy_Boss_Laser.png' + cb;
console.log('[Boss] Loading sprite from:', bossSprite.src);

bossSprite.onload  = () => console.log('[Boss] Sprite loaded OK:', bossSprite.naturalWidth, 'x', bossSprite.naturalHeight);
// Fallback to old asset if new one not found
bossSprite.onerror = () => {
  console.warn('[Boss] PNG not found, falling back to boss.jpg');
  bossSprite.src = 'assets/boss.jpg' + cb;
};

const LASER_STATES = Object.freeze({
  IDLE:         'idle',
  TELEGRAPHING: 'telegraphing',
  FIRING:       'firing',
  COOLDOWN:     'cooldown',
});

// Attack sequence names
const ATTACKS = ['BURST', 'RING', 'SPIRAL', 'LASER', 'CROSS'];

export class Boss extends Entity {
  constructor({ position, polarity = 0, level = 1 }) {
    // 5× base HP compared to previous version
    const hp = (80 + level * 30) * 5;
    super({ position, radius: 40, hp });

    this.polarity   = polarity;
    this.scoreValue = 10000 + level * 2000;
    this.isBoss     = true;
    this.level      = level;

    // ── Movement ──────────────────────────────────────────────────────
    this._targetY    = 120;
    this._driftPhase = 0;
    this._arrived    = false;

    // ── Attack sequence ───────────────────────────────────────────────
    // Boss cycles through ATTACKS[], switching polarity each attack
    this._attackIndex    = 0;
    this._attackPolarity = POLARITY.BLUE;    // starts blue, alternates each attack
    this._attackTimer    = 2.5;              // delay before first attack
    this._attackDuration = 0;               // how long current attack runs

    // Per-attack state
    this._bulletTimer  = 0;
    this._bulletRate   = 0.12;
    this._spreadPhase  = 0;
    this._spiralAngle  = 0;

    // ── Laser ─────────────────────────────────────────────────────────
    this._laserState    = LASER_STATES.IDLE;
    this._laserAngle    = -Math.PI / 2;
    this._laserTimer    = 0;
    this._laserAlpha    = 0;
    this._firingDuration    = 1.8;
    this._telegraphDuration = 1.0;

    // ── Phase tracking ────────────────────────────────────────────────
    this._phase        = 1;   // 1, 2, 3 – based on HP thirds
    this._hitFlash     = 0;

    // ── Screen-shake signal (read by Game.js) ─────────────────────────
    this.shakeRequest  = 0;
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  _updatePhase() {
    const pct = this.hp / this.maxHp;
    const newPhase = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;
    if (newPhase !== this._phase) {
      this._phase = newPhase;
      // Speed up the attack cycle
      this._attackTimer = 0.4;
      this.shakeRequest = 0.6;
    }
  }

  _speedForPhase() {
    return 1 + (this._phase - 1) * 0.4;
  }

  _nextAttack() {
    this._attackIndex    = (this._attackIndex + 1) % ATTACKS.length;
    // Alternate polarity every attack
    this._attackPolarity = 1 - this._attackPolarity;
    this._bulletTimer    = 0;
    this._spreadPhase    = 0;
    // Duration of each attack pattern before moving to the next
    this._attackDuration = this._currentAttack() === 'LASER' ? 0 : 2.5 / this._speedForPhase();
    this._attackTimer    = this._attackDuration;
  }

  _currentAttack() {
    return ATTACKS[this._attackIndex];
  }

  // ── Update ────────────────────────────────────────────────────────────

  update(dt, playerPos) {
    this.age += dt;
    this._hitFlash    = Math.max(0, this._hitFlash - dt);
    this.shakeRequest = Math.max(0, this.shakeRequest - dt);

    this._updatePhase();

    // Swoop in
    if (!this._arrived) {
      this.position.y += 140 * dt;
      if (this.position.y >= this._targetY) {
        this.position.y = this._targetY;
        this._arrived = true;
      }
      return [];
    }

    // Horizontal drift – faster in later phases
    this._driftPhase += dt * (0.4 + (this._phase - 1) * 0.25);
    const driftAmp = 140 + (this._phase - 1) * 40;
    const targetX  = GAME_W / 2 + Math.sin(this._driftPhase) * driftAmp;
    this.position.x += (targetX - this.position.x) * 3.5 * dt;

    const bullets = [];

    // ── Attack state machine ──────────────────────────────────────────
    const attack = this._currentAttack();

    if (attack === 'LASER') {
      bullets.push(...this._runLaser(dt, playerPos));
    } else {
      // Timed bullet patterns
      this._attackTimer -= dt;
      this._bulletTimer -= dt;
      const rate = this._bulletRate / this._speedForPhase();

      if (this._bulletTimer <= 0) {
        this._bulletTimer = rate;
        this._spreadPhase += 0.3 * this._speedForPhase();
        this._spiralAngle += 0.5 * this._speedForPhase();

        switch (attack) {
          case 'BURST':  bullets.push(...this._fireBurst(playerPos));  break;
          case 'RING':   bullets.push(...this._fireRing());             break;
          case 'SPIRAL': bullets.push(...this._fireSpiral());           break;
          case 'CROSS':  bullets.push(...this._fireCross(playerPos));   break;
        }
      }

      if (this._attackTimer <= 0) this._nextAttack();
    }

    return bullets;
  }

  // ── Laser sub-system ─────────────────────────────────────────────────

  _runLaser(dt, playerPos) {
    const bullets = [];
    this._laserTimer -= dt;

    switch (this._laserState) {
      case LASER_STATES.IDLE:
        // Fire bullets while waiting for laser
        this._bulletTimer -= dt;
        if (this._bulletTimer <= 0) {
          this._bulletTimer = 0.18;
          bullets.push(...this._fireBurst(playerPos));
        }
        if (this._laserTimer <= 0) {
          this._laserState = LASER_STATES.TELEGRAPHING;
          this._laserTimer = this._telegraphDuration;
          this._laserAngle = Math.atan2(
            playerPos.y - this.position.y,
            playerPos.x - this.position.x
          );
        }
        break;

      case LASER_STATES.TELEGRAPHING: {
        // Slowly track player
        const tAng = Math.atan2(playerPos.y - this.position.y, playerPos.x - this.position.x);
        let diff = tAng - this._laserAngle;
        while (diff > Math.PI)  diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this._laserAngle += diff * 2.0 * dt;
        this._laserAlpha  = 1 - this._laserTimer / this._telegraphDuration;
        if (this._laserTimer <= 0) {
          this._laserState = LASER_STATES.FIRING;
          this._laserTimer = this._firingDuration / this._speedForPhase();
          this.shakeRequest = 0.3;
        }
        break;
      }

      case LASER_STATES.FIRING: {
        const sweep = (1.0 + (this._phase - 1) * 0.4) * dt;
        this._laserAngle += sweep;
        this._laserAlpha  = 1.0;
        if (this._laserTimer <= 0) {
          this._laserState = LASER_STATES.COOLDOWN;
          this._laserTimer = 0.6;
          this._laserAlpha = 0;
        }
        break;
      }

      case LASER_STATES.COOLDOWN:
        this._laserAlpha = 0;
        if (this._laserTimer <= 0) {
          // Laser attack done – move to next attack
          this._laserState = LASER_STATES.IDLE;
          this._laserTimer = 1.0;
          this._nextAttack();
        }
        break;
    }

    return bullets;
  }

  isLaserFiring() { return this._laserState === LASER_STATES.FIRING; }
  getLaserAngle()  { return this._laserAngle; }
  getLaserOrigin() { return this.position; }
  getLaserColor()  { return POLARITY_COLORS[this._attackPolarity].bright; }

  // ── Bullet patterns ───────────────────────────────────────────────────

  _fireBurst(playerPos) {
    const { x, y } = this.position;
    const spd = 185 * this._speedForPhase();
    const dx = playerPos.x - x, dy = playerPos.y - y;
    const d  = Math.sqrt(dx * dx + dy * dy) || 1;
    const baseAng = Math.atan2(dy, dx);
    const count = 3 + this._phase;
    const spread = 0.2;
    const bullets = [];
    for (let i = 0; i < count; i++) {
      const a = baseAng + (i - (count - 1) / 2) * spread;
      bullets.push(this._mkBullet(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 4, this._attackPolarity));
    }
    return bullets;
  }

  _fireRing() {
    const { x, y } = this.position;
    const spd = 145;
    const count = 8 + this._phase * 2;
    const bullets = [];
    for (let i = 0; i < count; i++) {
      const a = this._spreadPhase + (Math.PI * 2 / count) * i;
      bullets.push(this._mkBullet(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 4, this._attackPolarity));
    }
    return bullets;
  }

  _fireSpiral() {
    const { x, y } = this.position;
    const spd = 130;
    const arms = 2 + this._phase;
    const bullets = [];
    for (let i = 0; i < arms; i++) {
      const a = this._spiralAngle + (Math.PI * 2 / arms) * i;
      bullets.push(this._mkBullet(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 3.5, this._attackPolarity));
    }
    return bullets;
  }

  _fireCross(playerPos) {
    const { x, y } = this.position;
    const spd = 165;
    const bullets = [];
    // 4-way cross
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + this._spreadPhase * 0.1;
      bullets.push(this._mkBullet(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 4, this._attackPolarity));
    }
    // Aimed at player (opposite polarity for extra danger)
    const dx = playerPos.x - x, dy = playerPos.y - y;
    const d  = Math.sqrt(dx * dx + dy * dy) || 1;
    bullets.push(this._mkBullet(x, y, (dx / d) * spd * 1.3, (dy / d) * spd * 1.3, 5, 1 - this._attackPolarity));
    return bullets;
  }

  _mkBullet(bx, by, vx, vy, r, polarity) {
    return new Bullet({
      position: new Vector2(bx, by),
      velocity: new Vector2(vx, vy),
      polarity: polarity ?? this._attackPolarity,
      damage: 1,
      isPlayerBullet: false,
      radius: r,
    });
  }

  // ── Damage ────────────────────────────────────────────────────────────

  takeDamage(amount) {
    super.takeDamage(amount);
    this._hitFlash = 0.07;
  }

  // ── Draw ──────────────────────────────────────────────────────────────

  draw(ctx) {
    if (!this.isAlive) return;
    const { x, y } = this.position;
    const r   = this.radius;
    const col = POLARITY_COLORS[this._attackPolarity];

    ctx.save();

    // ── Laser telegraph ───────────────────────────────────────────────
    if (this._laserState === LASER_STATES.TELEGRAPHING && this._laserAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this._laserAlpha * 0.75;
      ctx.strokeStyle = col.bright;
      ctx.lineWidth   = 2.5;
      ctx.setLineDash([8, 5]);
      ctx.shadowColor = col.glow;
      ctx.shadowBlur  = 14;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(this._laserAngle) * GAME_W * 2, y + Math.sin(this._laserAngle) * GAME_W * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── Laser beam ────────────────────────────────────────────────────
    if (this._laserState === LASER_STATES.FIRING) {
      ctx.save();
      const endX = x + Math.cos(this._laserAngle) * GAME_W * 2;
      const endY = y + Math.sin(this._laserAngle) * GAME_W * 2;

      // Wide outer glow
      ctx.strokeStyle = col.bright;
      ctx.lineWidth   = 22;
      ctx.globalAlpha = 0.2;
      ctx.shadowColor = col.glow;
      ctx.shadowBlur  = 60;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(endX, endY); ctx.stroke();

      // Mid glow
      ctx.lineWidth   = 10;
      ctx.globalAlpha = 0.5;
      ctx.shadowBlur  = 30;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(endX, endY); ctx.stroke();

      // Core white beam
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 4;
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur  = 10;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(endX, endY); ctx.stroke();

      ctx.restore();
    }

    // ── Sprite / fallback ─────────────────────────────────────────────
    if (this._hitFlash > 0) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur  = 40;
    }

    if (bossSprite.complete && bossSprite.naturalWidth > 0) {
      const sz = r * 5.5;
      ctx.drawImage(bossSprite, x - sz / 2, y - sz / 2, sz, sz);
    } else {
      // Procedural fallback: double hexagon
      ctx.fillStyle   = '#0a0a1a';
      ctx.strokeStyle = col.bright;
      ctx.lineWidth   = 3;
      ctx.shadowColor = col.glow;
      ctx.shadowBlur  = 18;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        i === 0 ? ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
                : ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Inner ring
      ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = col.core; ctx.fill();
    }

    ctx.shadowBlur = 0;

    // Phase 2 / 3 rage ring
    if (this._phase >= 2) {
      const ringColor = this._phase === 3 ? '#ff2020' : '#ff8800';
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(this.age * (this._phase === 3 ? 9 : 5));
      ctx.strokeStyle = ringColor;
      ctx.lineWidth   = 5;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur  = 30;
      ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;
    }

    // Hit flash overlay
    if (this._hitFlash > 0) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle   = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, r * 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ── Full-width HP bar at top of screen ───────────────────────────
    ctx.shadowBlur = 0;
    const barW   = GAME_W * 0.7;
    const barH   = 10;
    const barX   = (GAME_W - barW) / 2;
    const barY   = 8;
    const pct    = this.hp / this.maxHp;
    const hpCol  = pct > 0.66 ? '#44ff88' : pct > 0.33 ? '#ffaa00' : '#ff2020';

    // Shadow track
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX, barY, barW, barH);

    // HP fill with pulse on low HP
    ctx.fillStyle = hpCol;
    if (pct < 0.33) {
      ctx.globalAlpha = 0.7 + 0.3 * Math.abs(Math.sin(this.age * 8));
    }
    ctx.fillRect(barX, barY, barW * pct, barH);
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Phase markers at 66% and 33%
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(barX + barW * 0.66 - 1, barY, 2, barH);
    ctx.fillRect(barX + barW * 0.33 - 1, barY, 2, barH);

    // Labels
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = '#fff';
    ctx.font         = 'bold 10px "Share Tech Mono", monospace';
    ctx.fillText(
      `BOSS  ♦  ${ATTACKS[this._attackIndex]}  ♦  HP ${this.hp} / ${this.maxHp}`,
      GAME_W / 2, barY + barH + 2
    );

    ctx.restore();
  }
}

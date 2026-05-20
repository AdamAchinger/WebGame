/**
 * CollisionManager – Ikaruga-style polarity rules.
 *
 * BLUE player: destroys RED enemies, immune to BLUE bullets, DOUBLE damage from RED
 * RED player:  destroys BLUE enemies, immune to RED bullets, DOUBLE damage from BLUE
 */
import { SCORE } from '../constants.js';
import { soundManager } from './SoundManager.js';

export class CollisionManager {
  constructor(player, particles, waves) {
    this.player    = player;
    this.particles = particles;
    this.waves     = waves;
  }

  check(playerBullets, enemyBullets, enemies) {
    if (!this.player.isAlive) return;
    this._playerVsEnemyBullets(enemyBullets);
    this._playerBulletsVsEnemies(playerBullets, enemies);
    this._playerVsEnemies(enemies);
  }

  /**
   * Enemy bullets vs player:
   *   SAME polarity → absorbed (immune + bonus)
   *   OPPOSITE polarity → double damage (die)
   */
  _playerVsEnemyBullets(enemyBullets) {
    const p = this.player;
    if (p.invulnTimer > 0) return;

    for (const b of enemyBullets) {
      if (!b.isAlive) continue;

      const dx = p.position.x - b.position.x;
      const dy = p.position.y - b.position.y;
      const dist = dx * dx + dy * dy;
      const minDist = p.hitboxRadius + b.radius;

      if (dist < minDist * minDist) {
        if (b.polarity === p.polarity) {
          // SAME polarity → ABSORB (immune)
          b.isAlive = false;
          p.onAbsorb();
          p.addScore(SCORE.ABSORB_BONUS + p.chain * SCORE.CHAIN_BONUS);
          this.particles.spawnAbsorb(b.position.x, b.position.y, b.polarity);
          soundManager.playHit(); // Absorb sound
        } else {
          // OPPOSITE polarity → DOUBLE DAMAGE (instant death)
          b.isAlive = false;
          this.particles.spawnPlayerDeath(p.position.x, p.position.y);
          soundManager.playExplosion();
          p.die();
          return;
        }
      }
    }
  }

  /**
   * Player bullets vs enemies:
   *   SAME polarity → deal damage (player destroys same-color enemies)
   *   OPPOSITE polarity → bullet passes through (can't damage opposite)
   */
  _playerBulletsVsEnemies(playerBullets, enemies) {
    for (const b of playerBullets) {
      if (!b.isAlive) continue;

      for (const e of enemies) {
        if (!e.isAlive) continue;
        if (!b.collidesWith(e)) continue;

        // Same polarity → passes through (ineffective)
        if (b.polarity === e.polarity) continue;

        // Opposite polarity → deal damage
        e.takeDamage(b.damage);
        b.isAlive = false;

        if (!e.isAlive) {
          this.player.addScore(e.scoreValue);
          this.particles.spawnEnemyDeath(e.position.x, e.position.y, e.polarity);
          this.particles.spawnScore(e.position.x, e.position.y - 10);
          this.waves.onEnemyDied();
          soundManager.playExplosion();
        } else {
          soundManager.playHit();
        }
        break;
      }
    }
  }

  /**
   * Player body vs enemies:
   *   SAME polarity → safe (pass through)
   *   OPPOSITE polarity → die
   */
  _playerVsEnemies(enemies) {
    const p = this.player;
    if (p.invulnTimer > 0) return;

    for (const e of enemies) {
      if (!e.isAlive) continue;
      // Same polarity → safe
      if (e.polarity === p.polarity) continue;

      const dx = p.position.x - e.position.x;
      const dy = p.position.y - e.position.y;
      const dist = dx * dx + dy * dy;
      const minDist = p.hitboxRadius + e.radius;

      if (dist < minDist * minDist) {
        this.particles.spawnPlayerDeath(p.position.x, p.position.y);
        soundManager.playExplosion();
        p.die();
        return;
      }
    }
  }
}

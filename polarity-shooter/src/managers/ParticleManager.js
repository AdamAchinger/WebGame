/**
 * ParticleManager – creates and manages visual particle effects.
 */
import { Particle } from '../entities/Particle.js';
import { POLARITY_COLORS } from '../constants.js';

export class ParticleManager {
  constructor() {
    this.particles = [];
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (!this.particles[i].isAlive) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      p.draw(ctx);
    }
  }

  spawnAbsorb(x, y, polarity) {
    const col = POLARITY_COLORS[polarity];
    if (!col) return;
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
      const speed = 60 + Math.random() * 100;
      this.particles.push(new Particle({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        color: col.bright,
        size: 2 + Math.random() * 2,
        type: 'spark',
      }));
    }
    this.particles.push(new Particle({
      x, y, vx: 0, vy: 0,
      life: 0.25,
      color: col.bright,
      size: 6,
      type: 'ring',
    }));
  }

  spawnEnemyDeath(x, y, polarity) {
    const col = POLARITY_COLORS[polarity];
    if (!col) return;
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      this.particles.push(new Particle({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.4,
        color: Math.random() > 0.5 ? col.bright : '#fff',
        size: 2 + Math.random() * 3,
        type: Math.random() > 0.3 ? 'spark' : 'circle',
      }));
    }
    this.particles.push(new Particle({
      x, y, vx: 0, vy: 0,
      life: 0.35,
      color: col.bright,
      size: 10,
      type: 'ring',
    }));
  }

  spawnPlayerDeath(x, y) {
    const count = 24;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 200;
      this.particles.push(new Particle({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.5,
        color: Math.random() > 0.5 ? '#4a9eff' : '#ff4a4a',
        size: 2 + Math.random() * 4,
        type: 'spark',
      }));
    }
    this.particles.push(new Particle({
      x, y, vx: 0, vy: 0,
      life: 0.5,
      color: '#ffffff',
      size: 16,
      type: 'ring',
    }));
  }

  spawnScore(x, y) {
    for (let i = 0; i < 4; i++) {
      this.particles.push(new Particle({
        x, y,
        vx: (Math.random() - 0.5) * 40,
        vy: -30 - Math.random() * 30,
        life: 0.4,
        color: '#ffd740',
        size: 1.5,
        type: 'circle',
      }));
    }
  }

  clear() {
    this.particles.length = 0;
  }
}

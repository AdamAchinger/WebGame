/**
 * Entity – base class for all game objects.
 */
import { Vector2 } from '../utils/Vector2.js';

export class Entity {
  /**
   * @param {object} opts
   * @param {Vector2} opts.position
   * @param {number}  [opts.radius]
   * @param {number}  [opts.hp]
   */
  constructor({ position, radius = 8, hp = 1 } = {}) {
    this.position = position ? position.clone() : new Vector2();
    this.velocity = new Vector2();
    this.radius   = radius;
    this.hp       = hp;
    this.maxHp    = hp;
    this.isAlive  = true;
    this.age      = 0;        // seconds alive
  }

  update(dt) {
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.age += dt;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
    }
  }

  /** Circle-circle collision */
  collidesWith(other) {
    const dx = this.position.x - other.position.x;
    const dy = this.position.y - other.position.y;
    const dist = dx * dx + dy * dy;
    const minDist = this.radius + other.radius;
    return dist < minDist * minDist;
  }

  draw(ctx) { /* override */ }
}

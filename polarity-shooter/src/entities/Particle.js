/**
 * Particle – visual-only effect entity.
 */
export class Particle {
  constructor({ x, y, vx, vy, life, color, size, type = 'circle' }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
    this.type = type; // 'circle', 'spark', 'ring'
    this.isAlive = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.life -= dt;
    if (this.life <= 0) this.isAlive = false;
  }

  draw(ctx) {
    const t = this.life / this.maxLife; // 1 → 0
    const alpha = t;
    const s = this.size * (0.3 + 0.7 * t);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (this.type === 'spark') {
      const len = s * 3;
      const angle = Math.atan2(this.vy, this.vx);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = s * 0.5;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(this.x - Math.cos(angle) * len, this.y - Math.sin(angle) * len);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    } else if (this.type === 'ring') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      const ringR = s * (1 + (1 - t) * 3);
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

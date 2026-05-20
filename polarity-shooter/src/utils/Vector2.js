/**
 * Simple 2D vector utility class.
 */
export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) { this.x = x; this.y = y; return this; }
  copy(v) { this.x = v.x; this.y = v.y; return this; }
  clone() { return new Vector2(this.x, this.y); }

  add(v)  { this.x += v.x; this.y += v.y; return this; }
  sub(v)  { this.x -= v.x; this.y -= v.y; return this; }
  scale(s){ this.x *= s;   this.y *= s;   return this; }

  length()    { return Math.sqrt(this.x * this.x + this.y * this.y); }
  lengthSq()  { return this.x * this.x + this.y * this.y; }

  normalize() {
    const len = this.length();
    if (len > 0) { this.x /= len; this.y /= len; }
    return this;
  }

  distTo(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  angle() { return Math.atan2(this.y, this.x); }

  static fromAngle(a, len = 1) {
    return new Vector2(Math.cos(a) * len, Math.sin(a) * len);
  }
}

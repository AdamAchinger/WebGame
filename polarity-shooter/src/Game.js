/**
 * Game – main game class orchestrating the game loop.
 */
import { GAME_W, GAME_H } from './constants.js';
import { InputManager } from './input/InputManager.js';
import { Player } from './entities/Player.js';
import { WaveManager } from './managers/WaveManager.js';
import { ParticleManager } from './managers/ParticleManager.js';
import { CollisionManager } from './managers/CollisionManager.js';
import { Background } from './rendering/Background.js';
import { HUD } from './rendering/HUD.js';
import { Enemy, ENEMY_TYPE } from './entities/Enemy.js';
import { Boss } from './entities/Boss.js';
import { Vector2 } from './utils/Vector2.js';
export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    // Logical resolution
    this.canvas.width  = GAME_W;
    this.canvas.height = GAME_H;

    // Core systems
    this.input      = new InputManager();
    this.background = new Background();
    this.hud        = new HUD();

    // Game state
    this.state = 'title'; // 'title' | 'playing' | 'gameover'
    this._lastTime = null;
    this._animId   = null;

    // Entity lists (managed directly for simplicity)
    this.player        = null;
    this.playerBullets = [];
    this.enemies       = [];
    this.enemyBullets  = [];
    this.waves         = null;
    this.particles     = null;
    this.collisions    = null;

    // Handle window resize to maintain aspect ratio
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  /** Start a new game */
  startGame() {
    this.player = new Player();
    this.playerBullets = [];
    this.enemies       = [];
    this.enemyBullets  = [];
    this.waves         = new WaveManager();
    this.particles     = new ParticleManager();
    this.collisions    = new CollisionManager(this.player, this.particles, this.waves);

    this.state = 'playing';

    // Hide screens
    document.getElementById('titleScreen').style.display = 'none';
    document.getElementById('gameOverScreen').classList.add('hidden');
  }

  /** Start the game loop */
  run() {
    this._lastTime = null;
    this._animId = requestAnimationFrame((t) => this._loop(t));
  }

  stop() {
    if (this._animId) cancelAnimationFrame(this._animId);
  }

  // ── Loop ──────────────────────────────────────────────────────────────

  _loop(timestamp) {
    try {
      const dt = Math.min((timestamp - (this._lastTime ?? timestamp)) / 1000, 0.05);
      this._lastTime = timestamp;

      this.input.poll();

      if (this.state === 'playing' || this.state === 'level_complete') {
        this._update(dt);
      } else if (this.state === 'title' || this.state === 'gameover') {
        this.background.update(dt);
        
        if (this.state === 'title') {
          // Spawn random cinematic enemies
          if (!this.enemies) this.enemies = [];
          if (this.enemies.length < 5 && Math.random() < 0.02) {
            const x = 50 + Math.random() * (GAME_W - 100);
            // Pick a random enemy type (only those with textures)
            const types = [
              ENEMY_TYPE.GRUNT,
              ENEMY_TYPE.FLANKER,
              ENEMY_TYPE.TANK,
              ENEMY_TYPE.ROTATING_LASER,
              ENEMY_TYPE.SNIPER
            ];
            const type = types[Math.floor(Math.random() * types.length)];
            const polarity = Math.random() > 0.5 ? 0 : 1;
            this.enemies.push(new Enemy({ type, position: new Vector2(x, -50), polarity }));
          }
          
          // Update them with a dummy target far below
          const dummyTarget = new Vector2(GAME_W / 2, GAME_H + 200);
          for (const e of this.enemies) {
            e.update(dt, dummyTarget);
          }
          
          // Remove enemies that fly off screen
          this.enemies = this.enemies.filter(e => e.isAlive && e.position.y < GAME_H + 100);
        }
      }

      this._draw();

      this._animId = requestAnimationFrame((t) => this._loop(t));
    } catch (err) {
      const el = document.getElementById('gamepadStatus');
      if (el) {
        el.textContent = 'ERROR: ' + err.message;
        el.style.color = 'red';
      }
      console.error(err);
    }
  }

  _update(dt) {
    // Background scroll
    this.background.update(dt);

    if (this.state === 'level_complete') {
      // Accelerate player upwards off screen
      this.player.velocity = this.player.velocity || new Vector2(0, 0);
      this.player.velocity.y -= 1500 * dt; // massive acceleration
      this.player.position.y += this.player.velocity.y * dt;
      
      // Update particles
      if (this.particles) this.particles.update(dt);
      
      if (this.player.position.y < -100) {
        // Start next level
        this.waves.reset(); // Resets wave to 0, which means next level!
        this.player.position.set(GAME_W / 2, GAME_H - 100);
        this.player.velocity.set(0, 0);
        this.state = 'playing';
      }
      return;
    }

    // Player update → returns new bullets
    const newPlayerBullets = this.player.update(dt, this.input);
    this.playerBullets.push(...newPlayerBullets);

    // Wave manager → spawn new enemies
    // Pass only non-boss live count so boss death alone triggers level complete
    const liveEnemies  = this.enemies.filter(e => e.isAlive).length;
    const liveMinions  = this.enemies.filter(e => e.isAlive && !e.isBoss).length;
    const newEnemies = this.waves.update(dt, this.waves.bossSpawned ? liveMinions : liveEnemies);
    this.enemies.push(...newEnemies);

    if (this.waves.levelCompleted && liveEnemies === 0 && this.state === 'playing') {
      this.state = 'level_complete';
    }

    // Enemy updates → returns new bullets
    for (const e of this.enemies) {
      if (!e.isAlive) continue;
      const eBullets = e.update(dt, this.player.position);
      this.enemyBullets.push(...eBullets);
    }

    // Update bullets
    for (const b of this.playerBullets) b.update(dt, this.enemies);
    for (const b of this.enemyBullets)  b.update(dt);

    // Collision detection
    this.collisions.check(this.playerBullets, this.enemyBullets, this.enemies);

    // Boss laser collision – point-to-line distance check
    if (this.player.isAlive && this.player.invulnTimer <= 0) {
      for (const e of this.enemies) {
        if (e instanceof Boss && e.isLaserFiring()) {
          const ox = e.getLaserOrigin().x;
          const oy = e.getLaserOrigin().y;
          const ang = e.getLaserAngle();
          // Direction vector of laser
          const lx = Math.cos(ang);
          const ly = Math.sin(ang);
          // Vector from laser origin to player
          const dx = this.player.position.x - ox;
          const dy = this.player.position.y - oy;
          // Perpendicular distance (cross product)
          const perp = Math.abs(dx * ly - dy * lx);
          // Only hit if player is in front of the laser (dot product > 0)
          const dot  = dx * lx + dy * ly;
          if (perp < 14 && dot > 0) {
            this.player.takeDamage(1);
          }
        }
      }
    }

    // Particles
    this.particles.update(dt);

    // Clean dead entities
    this.playerBullets = this.playerBullets.filter(b => b.isAlive);
    this.enemyBullets  = this.enemyBullets.filter(b => b.isAlive);
    this.enemies       = this.enemies.filter(e => e.isAlive);

    // Game over check
    if (!this.player.isAlive) {
      this._gameOver();
    }
  }

  _draw() {
    const ctx = this.ctx;

    // Background
    this.background.draw(ctx);

    // Enemies (draw in all states so they show up on title screen)
    if (this.enemies) {
      for (const e of this.enemies) e.draw(ctx);
    }

    if (this.state === 'playing' || this.state === 'gameover') {
      // Enemy bullets (behind enemies)
      for (const b of this.enemyBullets) b.draw(ctx);

      // Player bullets
      for (const b of this.playerBullets) b.draw(ctx);

      // Player
      if (this.player) this.player.draw(ctx);

      // Particles (on top)
      if (this.particles) this.particles.draw(ctx);

      // HUD
      if (this.player) {
        this.hud.draw(ctx, this.player, this.waves?.wave || 0, this.waves?.bossSpawned || false, this.waves?.maxWaves || 10, this.waves?.currentWaveName || '');
      }
    }
  }

  _gameOver() {
    this.state = 'gameover';

    document.getElementById('finalScore').textContent = this.player.score.toLocaleString();
    document.getElementById('finalWave').textContent  = this.waves.wave;
    document.getElementById('finalChain').textContent  = this.player.maxChain;
    document.getElementById('gameOverScreen').classList.remove('hidden');
  }

  // ── Resize ────────────────────────────────────────────────────────────

  _resize() {
    const parent = this.canvas.parentElement;
    const pw = parent ? parent.clientWidth  : window.innerWidth;
    const ph = parent ? parent.clientHeight : window.innerHeight;

    // Maintain 2:3 aspect ratio, fit within viewport
    const aspect = GAME_W / GAME_H;
    let w, h;
    if (pw / ph > aspect) {
      h = ph;
      w = h * aspect;
    } else {
      w = pw;
      h = w / aspect;
    }

    this.canvas.style.width  = `${Math.floor(w)}px`;
    this.canvas.style.height = `${Math.floor(h)}px`;
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = `${Math.floor((pw - w) / 2)}px`;
    this.canvas.style.top  = `${Math.floor((ph - h) / 2)}px`;
  }
}

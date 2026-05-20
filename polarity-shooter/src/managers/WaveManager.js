/**
 * WaveManager v2 – Hand-crafted wave scripts with color-grouped formations.
 *
 * Design principles:
 *  1. Each formation is a single polarity (color-grouped).
 *  2. Multiple formations of DIFFERENT colors strike simultaneously.
 *  3. Every wave has a unique composition – no two waves repeat.
 *  4. Waves escalate in difficulty through enemy types, counts, and attack angles.
 *  5. All enemies fly toward the center zone (30% screen height).
 */
import { Enemy, ENEMY_TYPE } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { Vector2 } from '../utils/Vector2.js';
import { POLARITY, GAME_W, GAME_H } from '../constants.js';

const SIDE = { TOP: 0, BOTTOM: 1, LEFT: 2, RIGHT: 3 };

// ── Formation blueprints ─────────────────────────────────────────────
// Each blueprint returns an array of { rx, ry } relative offsets.
// rx/ry are in grid units (multiplied by spacing later).

const FORMATIONS = {
  /** Single horizontal line */
  LINE_3:   () => [{ rx: -1, ry: 0 }, { rx: 0, ry: 0 }, { rx: 1, ry: 0 }],
  LINE_5:   () => [{ rx: -2, ry: 0 }, { rx: -1, ry: 0 }, { rx: 0, ry: 0 }, { rx: 1, ry: 0 }, { rx: 2, ry: 0 }],

  /** V-shape (classic wedge) */
  V_3: () => [
    { rx: 0, ry: 0 },
    { rx: -1, ry: -1 }, { rx: 1, ry: -1 },
  ],
  V_5: () => [
    { rx: 0, ry: 0 },
    { rx: -1, ry: -1 }, { rx: 1, ry: -1 },
    { rx: -2, ry: -2 }, { rx: 2, ry: -2 },
  ],

  /** Diamond / rhombus */
  DIAMOND: () => [
    { rx: 0, ry: 0 },
    { rx: -1, ry: -1 }, { rx: 1, ry: -1 },
    { rx: 0, ry: -2 },
  ],

  /** Convoy – single file column */
  CONVOY_4: () => [
    { rx: 0, ry: 0 }, { rx: 0, ry: -1.5 },
    { rx: 0, ry: -3 }, { rx: 0, ry: -4.5 },
  ],

  /** Cross / plus */
  CROSS: () => [
    { rx: 0, ry: -1 },
    { rx: -1, ry: -1 }, { rx: 1, ry: -1 },
    { rx: 0, ry: 0 }, { rx: 0, ry: -2 },
  ],

  /** Arrow – Tank leader + Flanker wings */
  ARROW: () => [
    { rx: 0, ry: 0, customType: ENEMY_TYPE.TANK },
    { rx: -0.8, ry: -1, customType: ENEMY_TYPE.FLANKER },
    { rx: 0.8, ry: -1, customType: ENEMY_TYPE.FLANKER },
    { rx: -1.6, ry: -2, customType: ENEMY_TYPE.FLANKER },
    { rx: 1.6, ry: -2, customType: ENEMY_TYPE.FLANKER },
  ],

  /** Double line (2 rows) */
  DOUBLE_LINE: () => [
    { rx: -1, ry: 0 }, { rx: 0, ry: 0 }, { rx: 1, ry: 0 },
    { rx: -1, ry: -1.2 }, { rx: 0, ry: -1.2 }, { rx: 1, ry: -1.2 },
  ],

  /** Wide wall */
  WALL: () => [
    { rx: -3, ry: 0 }, { rx: -2, ry: 0 }, { rx: -1, ry: 0 }, { rx: 0, ry: 0 },
    { rx: 1, ry: 0 }, { rx: 2, ry: 0 }, { rx: 3, ry: 0 },
  ],

  /** Pincer – two small groups flanking wide */
  PINCER_L: () => [
    { rx: -3, ry: 0 }, { rx: -2.5, ry: -1 }, { rx: -2, ry: 0 },
  ],
  PINCER_R: () => [
    { rx: 2, ry: 0 }, { rx: 2.5, ry: -1 }, { rx: 3, ry: 0 },
  ],

  /** Spiral / staggered descent */
  SPIRAL: () => [
    { rx: -1.5, ry: 0 },
    { rx: -0.5, ry: -1 },
    { rx: 0.5, ry: -2 },
    { rx: 1.5, ry: -3 },
  ],

  /** Single heavy – one tough unit */
  SOLO_TANK: () => [{ rx: 0, ry: 0, customType: ENEMY_TYPE.TANK }],
  SOLO_SPINNER: () => [{ rx: 0, ry: 0, customType: ENEMY_TYPE.ROTATING_LASER }],

  /** Sniper nest – snipers with grunt escorts */
  SNIPER_NEST: () => [
    { rx: 0, ry: 0, customType: ENEMY_TYPE.SNIPER },
    { rx: -1, ry: -0.8 }, { rx: 1, ry: -0.8 },
    { rx: 0, ry: -1.6, customType: ENEMY_TYPE.SNIPER },
  ],

  /** X-shape */
  X_SHAPE: () => [
    { rx: 0, ry: -1 },
    { rx: -1, ry: 0 }, { rx: 1, ry: 0 },
    { rx: -1, ry: -2 }, { rx: 1, ry: -2 },
  ],
};

// ── Wave scripts ─────────────────────────────────────────────────────
// Each wave is an array of "strike groups". Each strike group defines:
//   formation: key from FORMATIONS
//   side: SIDE constant
//   polarity: POLARITY.BLUE or POLARITY.RED
//   type: default ENEMY_TYPE for the group (overridden by customType)
//   speed: base speed override (optional)
// All strike groups within a wave spawn simultaneously.

function createWaveScripts() {
  const P = POLARITY;
  const S = SIDE;
  const T = ENEMY_TYPE;

  return [
    // ── Wave 1: Introduction – Aggressive start ────────────────────────
    {
      name: 'First Contact',
      strikes: [
        { formation: 'V_5',    side: S.TOP,    polarity: P.BLUE, type: T.GRUNT },
        { formation: 'V_5',    side: S.TOP,    polarity: P.RED,  type: T.GRUNT, offsetX: 120 },
        { formation: 'LINE_3', side: S.BOTTOM, polarity: P.BLUE, type: T.GRUNT },
      ]
    },

    // ── Wave 2: Flanking introduction ──────────────────────────────────
    {
      name: 'Pincer Strike',
      strikes: [
        { formation: 'LINE_5',   side: S.LEFT,   polarity: P.RED,  type: T.GRUNT },
        { formation: 'LINE_5',   side: S.RIGHT,  polarity: P.BLUE, type: T.GRUNT },
        { formation: 'SNIPER_NEST', side: S.TOP, polarity: P.RED,  type: T.GRUNT },
      ]
    },

    // ── Wave 3: Swift Wings + Heavy Armor ──────────────────────────────
    {
      name: 'Swift Wings',
      strikes: [
        { formation: 'CONVOY_4', side: S.LEFT,   polarity: P.BLUE, type: T.FLANKER, speed: 160 },
        { formation: 'CONVOY_4', side: S.RIGHT,  polarity: P.RED,  type: T.FLANKER, speed: 160 },
        { formation: 'SOLO_TANK', side: S.TOP,   polarity: P.RED,  type: T.TANK },
        { formation: 'SOLO_TANK', side: S.BOTTOM,polarity: P.BLUE, type: T.TANK },
      ]
    },

    // ── Wave 4: Sniper ambush ──────────────────────────────────────────
    {
      name: 'Sniper Ambush',
      strikes: [
        { formation: 'SNIPER_NEST', side: S.TOP,    polarity: P.RED,  type: T.GRUNT },
        { formation: 'LINE_5',      side: S.BOTTOM, polarity: P.BLUE, type: T.GRUNT },
        { formation: 'PINCER_L',    side: S.LEFT,   polarity: P.RED,  type: T.FLANKER },
      ]
    },

    // ── Wave 5: Cross assault from all sides ───────────────────────────
    {
      name: 'Crossfire',
      strikes: [
        { formation: 'V_5',     side: S.TOP,    polarity: P.BLUE, type: T.GRUNT },
        { formation: 'V_3',     side: S.BOTTOM, polarity: P.RED,  type: T.GRUNT },
        { formation: 'PINCER_L', side: S.LEFT,  polarity: P.BLUE, type: T.FLANKER },
        { formation: 'PINCER_R', side: S.RIGHT, polarity: P.RED,  type: T.FLANKER },
      ]
    },

    // ── Wave 6: Heavy armor debut ──────────────────────────────────────
    {
      name: 'Iron Wall',
      strikes: [
        { formation: 'ARROW',       side: S.TOP,    polarity: P.RED,  type: T.GRUNT },
        { formation: 'DOUBLE_LINE', side: S.BOTTOM, polarity: P.BLUE, type: T.GRUNT },
        { formation: 'SOLO_TANK',   side: S.LEFT,   polarity: P.RED,  type: T.TANK, speed: 50 },
      ]
    },

    // ── Wave 7: Spinner introduction ───────────────────────────────────
    {
      name: 'Spiral Chaos',
      strikes: [
        { formation: 'SOLO_SPINNER', side: S.TOP,    polarity: P.BLUE, type: T.ROTATING_LASER, speed: 45 },
        { formation: 'SPIRAL',       side: S.LEFT,   polarity: P.RED,  type: T.FLANKER, speed: 130 },
        { formation: 'SPIRAL',       side: S.RIGHT,  polarity: P.BLUE, type: T.FLANKER, speed: 130 },
        { formation: 'LINE_3',       side: S.BOTTOM, polarity: P.RED,  type: T.GRUNT },
      ]
    },

    // ── Wave 8: The gauntlet ───────────────────────────────────────────
    {
      name: 'The Gauntlet',
      strikes: [
        { formation: 'WALL',        side: S.TOP,    polarity: P.RED,  type: T.GRUNT },
        { formation: 'CROSS',       side: S.BOTTOM, polarity: P.BLUE, type: T.GRUNT },
        { formation: 'CONVOY_4',    side: S.LEFT,   polarity: P.BLUE, type: T.FLANKER, speed: 180 },
        { formation: 'CONVOY_4',    side: S.RIGHT,  polarity: P.RED,  type: T.FLANKER, speed: 180 },
      ]
    },

    // ── Wave 9: Sniper gauntlet ────────────────────────────────────────
    {
      name: 'Precision Storm',
      strikes: [
        { formation: 'SNIPER_NEST', side: S.TOP,    polarity: P.BLUE, type: T.GRUNT },
        { formation: 'SNIPER_NEST', side: S.BOTTOM, polarity: P.RED,  type: T.GRUNT },
        { formation: 'X_SHAPE',     side: S.LEFT,   polarity: P.RED,  type: T.GRUNT },
        { formation: 'DIAMOND',     side: S.RIGHT,  polarity: P.BLUE, type: T.GRUNT },
      ]
    },

    // ── Wave 10: Pre-boss onslaught ────────────────────────────────────
    {
      name: 'Final Stand',
      strikes: [
        { formation: 'ARROW',       side: S.TOP,    polarity: P.RED,  type: T.GRUNT },
        { formation: 'ARROW',       side: S.BOTTOM, polarity: P.BLUE, type: T.GRUNT },
        { formation: 'DOUBLE_LINE', side: S.LEFT,   polarity: P.BLUE, type: T.FLANKER },
        { formation: 'DOUBLE_LINE', side: S.RIGHT,  polarity: P.RED,  type: T.FLANKER },
        { formation: 'SOLO_SPINNER', side: S.TOP,   polarity: P.RED,  type: T.ROTATING_LASER, speed: 40, offsetX: -150 },
        { formation: 'SOLO_SPINNER', side: S.TOP,   polarity: P.BLUE, type: T.ROTATING_LASER, speed: 40, offsetX: 150 },
      ]
    },
  ];
}


// ── WaveManager class ────────────────────────────────────────────────

export class WaveManager {
  constructor() {
    this.wave           = 0;
    this.timer          = 2.0;
    this.waveDelay      = 3.0;
    this._enemyCount    = 0;
    this.levelCompleted = false;
    this.bossSpawned    = false;
    this.levelNum       = 1;
    this._waveScripts   = createWaveScripts();
    this._waveSpawned   = false;
  }

  get maxWaves() { return this._waveScripts.length; }

  get wavesLeft() {
    return Math.max(0, this.maxWaves - this.wave + 1);
  }

  get currentWaveName() {
    const script = this._waveScripts[this.wave];
    return script ? script.name : '';
  }

  onEnemyDied() {
    this._enemyCount = Math.max(0, this._enemyCount - 1);
  }

  update(dt, liveEnemies) {
    const spawned = [];
    this.timer -= dt;

    // ── Boss fight ────────────────────────────────────────────────────
    if (this.bossSpawned) {
      this._minionTimer = (this._minionTimer ?? 6) - dt;
      if (this._minionTimer <= 0) {
        this._minionTimer = 7 + Math.random() * 4;
        spawned.push(...this._spawnBossMinions());
      }
      if (liveEnemies === 0) {
        this.levelCompleted = true;
      }
      return spawned;
    }

    if (this.timer > 0) return spawned;

    // ── Check if current wave is cleared ──────────────────────────────
    if (this._waveSpawned) {
      if (liveEnemies === 0) {
        // Move to next wave
        this.wave++;
        this._waveSpawned = false;

        if (this.wave >= this.maxWaves) {
          // Boss time!
          if (!this.bossSpawned) {
            this.bossSpawned = true;
            const boss = new Boss({
              position: new Vector2(GAME_W / 2, -60),
              polarity: Math.random() > 0.5 ? 0 : 1,
              level: this.levelNum,
            });
            spawned.push(boss);
            this.timer = 0.5;
          }
          return spawned;
        }
        this.timer = 1.5; // short breather
      }
      return spawned;
    }

    if (this.levelCompleted) return spawned;

    // ── Spawn all strike groups for the current wave simultaneously ───
    const script = this._waveScripts[this.wave];
    if (!script) return spawned;

    const hpMult    = 1 + (this.levelNum - 1) * 0.3;
    const speedMult = 1 + (this.levelNum - 1) * 0.05;
    const fireMult  = Math.max(0.5, 1 - (this.levelNum - 1) * 0.05);

    for (const strike of script.strikes) {
      const enemies = this._buildFormation(strike, hpMult, speedMult, fireMult);
      for (const e of enemies) {
        spawned.push(new Enemy(e));
      }
      this._enemyCount += enemies.length;
    }

    this._waveSpawned = true;
    this.timer = this.waveDelay;
    return spawned;
  }

  // ── Build a single formation from a strike definition ──────────────
  _buildFormation(strike, hpMult, speedMult, fireMult) {
    const { formation, side, polarity, type, speed, offsetX = 0 } = strike;
    const blueprint = FORMATIONS[formation];
    if (!blueprint) return [];

    const coords = blueprint();
    const baseSpeed = (speed || (70 + Math.random() * 20)) * speedMult;
    const baseFire  = (2.0 + Math.random() * 0.8) * fireMult;
    const spacing   = 42;
    const result    = [];

    for (const coord of coords) {
      const pos = this._getSpawnPosition(side, coord.rx * spacing + offsetX, coord.ry * spacing);
      const dir = this._getDirToCenter(pos);

      const enemyType = coord.customType || type;

      let hp  = Math.ceil(2 * hpMult);
      let rad = 12;
      let val = 100;

      let finalSpeed = baseSpeed;
      let finalFire = baseFire;

      if (enemyType === ENEMY_TYPE.TANK) {
        hp  = Math.ceil(6 * hpMult);
        rad = 18;
        val = 250;
        finalFire = 2.0 * fireMult; // Slow bombs
      } else if (enemyType === ENEMY_TYPE.ROTATING_LASER) {
        hp  = Math.ceil(4 * hpMult);
        rad = 14;
        val = 180;
        finalFire = 0.6 * fireMult;
      } else if (enemyType === ENEMY_TYPE.SNIPER) {
        hp  = Math.ceil(2 * hpMult);
        rad = 11;
        val = 150;
        finalFire = 1.6 * fireMult; // Wait between bursts
      } else if (enemyType === ENEMY_TYPE.FLANKER) {
        hp  = Math.ceil(2 * hpMult);
        rad = 11;
        val = 120;
        finalSpeed = baseSpeed * 1.6; // Very fast
        finalFire = 1.0 * fireMult; 
      } else {
        // GRUNT - Machine Gun
        finalFire = 0.25 * fireMult; // Extremely fast firing
      }

      result.push({
        position:   pos,
        polarity,
        hp,
        speed:      finalSpeed,
        fireRate:   finalFire,
        scoreValue: val,
        radius:     rad,
        isBoss:     false,
        moveDir:    dir,
        type:       enemyType,
      });
    }

    return result;
  }

  // ── Direction toward center zone (30% height) ──────────────────────
  _getDirToCenter(pos) {
    const tx = GAME_W / 2;
    const ty = GAME_H * 0.3;
    const dx = tx - pos.x;
    const dy = ty - pos.y;
    const len = Math.hypot(dx, dy) || 1;
    return new Vector2(dx / len, dy / len);
  }

  // ── Spawn position for a given side ────────────────────────────────
  _getSpawnPosition(side, rx, ry) {
    const midX = GAME_W / 2;
    const midY = GAME_H / 2;

    switch (side) {
      case SIDE.TOP:
        return new Vector2(midX + rx, ry - 40);
      case SIDE.BOTTOM:
        return new Vector2(midX + rx, GAME_H - ry + 40);
      case SIDE.LEFT:
        return new Vector2(ry - 40, midY + rx);
      case SIDE.RIGHT:
        return new Vector2(GAME_W - ry + 40, midY + rx);
      default:
        return new Vector2(midX + rx, ry - 40);
    }
  }

  // ── Boss minion reinforcements ─────────────────────────────────────
  _spawnBossMinions() {
    const minions = [];
    const hpMult    = 1 + (this.levelNum - 1) * 0.3;
    const speedMult = 1 + (this.levelNum - 1) * 0.1;

    // Always spawn BOTH colors simultaneously during boss
    // Left side: RED
    for (let i = 0; i < 3; i++) {
      const pos = new Vector2(-40, 150 + i * 80);
      minions.push(new Enemy({
        position:   pos,
        polarity:   POLARITY.RED,
        hp:         Math.ceil(2 * hpMult),
        speed:      80 * speedMult,
        fireRate:   2.0,
        scoreValue: 80,
        radius:     11,
        moveDir:    this._getDirToCenter(pos),
        type:       ENEMY_TYPE.FLANKER,
      }));
    }

    // Right side: BLUE
    for (let i = 0; i < 3; i++) {
      const pos = new Vector2(GAME_W + 40, 150 + i * 80);
      minions.push(new Enemy({
        position:   pos,
        polarity:   POLARITY.BLUE,
        hp:         Math.ceil(2 * hpMult),
        speed:      80 * speedMult,
        fireRate:   2.0,
        scoreValue: 80,
        radius:     11,
        moveDir:    this._getDirToCenter(pos),
        type:       ENEMY_TYPE.FLANKER,
      }));
    }

    return minions;
  }

  reset() {
    this.wave           = 0;
    this.timer          = 2.0;
    this._enemyCount    = 0;
    this.levelCompleted = false;
    this.bossSpawned    = false;
    this._minionTimer   = 6;
    this._waveSpawned   = false;
    this.levelNum++;
    this._waveScripts   = createWaveScripts();
  }
}

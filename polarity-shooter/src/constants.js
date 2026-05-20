/**
 * Game constants & polarity enum.
 */

/** Polarity enum */
export const POLARITY = Object.freeze({
  BLUE: 0,
  RED:  1,
});

/** Visual palette per polarity */
export const POLARITY_COLORS = Object.freeze({
  [POLARITY.BLUE]: {
    core:   '#0a1a3a',
    glow:   'rgba(60, 140, 255, 0.8)',
    bright: '#4a9eff',
    dim:    'rgba(60, 140, 255, 0.3)',
    bullet: '#80b8ff',
    trail:  'rgba(60, 140, 255, 0.15)',
    name:   'BLUE',
  },
  [POLARITY.RED]: {
    core:   '#3a0a0a',
    glow:   'rgba(255, 60, 60, 0.8)',
    bright: '#ff4a4a',
    dim:    'rgba(255, 60, 60, 0.3)',
    bullet: '#ff8080',
    trail:  'rgba(255, 60, 60, 0.15)',
    name:   'RED',
  },
});

/** Game dimensions (logical / internal) */
export const GAME_W = 640;
export const GAME_H = 800;

/** Player settings */
export const PLAYER = Object.freeze({
  SPEED:         280,
  FIRE_RATE:     0.09,
  BULLET_SPEED:  900,
  BULLET_DAMAGE: 1,
  SIZE:          14,
  MAX_LIVES:     3,
  INVULN_TIME:   2.0,
  HITBOX:        5,
});

/** Enemy defaults */
export const ENEMY = Object.freeze({
  BULLET_SPEED: 320,
});

/** Scoring */
export const SCORE = Object.freeze({
  KILL_BASE:     100,
  ABSORB_BONUS:  5,
  CHAIN_BONUS:   10,
});

/**
 * Main entry point – bootstraps the game.
 */
import { Game } from './Game.js';
import { soundManager } from './managers/SoundManager.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

// ── Title screen buttons ─────────────────────────────────────────────
document.getElementById('startBtn').addEventListener('click', () => {
  soundManager.init();
  game.startGame();
});

document.getElementById('restartBtn').addEventListener('click', () => {
  soundManager.init();
  game.startGame();
});

// Also allow keyboard/gamepad start from title/gameover
window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter' || e.code === 'Space') {
    if (game.state === 'title') {
      e.preventDefault();
      soundManager.init();
      game.startGame();
    } else if (game.state === 'gameover') {
      e.preventDefault();
      soundManager.init();
      game.startGame();
    }
  }
});

// Gamepad confirm check (polled in game loop, but also check here for menus)
let _gpMenuInterval = setInterval(() => {
  const gamepads = navigator.getGamepads();
  for (const gp of gamepads) {
    if (!gp) continue;
    // A button (0) or Start (9)
    if (gp.buttons[0]?.pressed || gp.buttons[9]?.pressed) {
      if (game.state === 'title' || game.state === 'gameover') {
        soundManager.init();
        game.startGame();
      }
    }
  }
}, 100);

// Start the render loop (background animates even on title)
game.run();

console.log('[Polarity Shooter] Game initialized. Press START or Enter to play.');

/**
 * HUD – heads-up display: score, lives, polarity, wave, chain.
 */
import { POLARITY, POLARITY_COLORS, GAME_W, GAME_H } from '../constants.js';

export class HUD {
  constructor() {
    this._waveFlash = 0;
    this._lastWave = 0;
  }

  draw(ctx, player, wave, bossSpawned = false, maxWaves = 10, waveName = '') {
    ctx.save();
    ctx.textBaseline = 'top';

    if (wave !== this._lastWave) {
      this._waveFlash = 1.5;
      this._lastWave = wave;
    }
    this._waveFlash = Math.max(0, this._waveFlash - 0.016);

    const col = POLARITY_COLORS[player.polarity] || POLARITY_COLORS[0];

    // --- Side Screen Glow for current combat mode ---
    const glowWidth = 35; // pixels
    
    // Left edge
    const gradLeft = ctx.createLinearGradient(0, 0, glowWidth, 0);
    gradLeft.addColorStop(0, player.polarity === POLARITY.RED ? 'rgba(255, 30, 30, 0.45)' : 'rgba(30, 150, 255, 0.45)');
    gradLeft.addColorStop(1, 'rgba(0,0,0,0)');

    // Right edge
    const gradRight = ctx.createLinearGradient(GAME_W, 0, GAME_W - glowWidth, 0);
    gradRight.addColorStop(0, player.polarity === POLARITY.RED ? 'rgba(255, 30, 30, 0.45)' : 'rgba(30, 150, 255, 0.45)');
    gradRight.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradLeft;
    ctx.fillRect(0, 0, glowWidth, GAME_H);
    ctx.fillStyle = gradRight;
    ctx.fillRect(GAME_W - glowWidth, 0, glowWidth, GAME_H);
    ctx.globalCompositeOperation = 'source-over';
    // ------------------------------------------------

    // Score
    ctx.font = '700 18px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd740';
    ctx.shadowColor = 'rgba(255,215,64,0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText(player.score.toLocaleString(), GAME_W / 2, 12);
    ctx.shadowBlur = 0;
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('SCORE', GAME_W / 2, 34);

    // Waves Left
    ctx.textAlign = 'left';
    ctx.font = '12px "Share Tech Mono", monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('WAVES LEFT', 12, 12);
    ctx.font = '700 16px Orbitron, sans-serif';
    ctx.fillStyle = '#4a9eff';
    const wavesLeft = Math.max(0, maxWaves - wave);
    ctx.fillText(wavesLeft, 12, 28);

    // Lives
    ctx.textAlign = 'left';
    ctx.font = '12px "Share Tech Mono", monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('LIVES', 12, 50);
    for (let i = 0; i < player.lives; i++) {
      const lx = 14 + i * 18, ly = 66;
      ctx.fillStyle = col.bright;
      ctx.shadowColor = col.glow;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(lx, ly - 6);
      ctx.lineTo(lx + 6, ly + 4);
      ctx.lineTo(lx - 6, ly + 4);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Polarity indicator
    ctx.textAlign = 'right';
    ctx.font = '12px "Share Tech Mono", monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('POLARITY', GAME_W - 12, 12);
    const px = GAME_W - 30, py = 38;
    ctx.strokeStyle = col.bright;
    ctx.lineWidth = 2;
    ctx.shadowColor = col.glow;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = col.core;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = col.bright;
    ctx.font = '700 11px Orbitron, sans-serif';
    ctx.fillText(col.name, GAME_W - 48, 33);

    // Wave flash
    ctx.textAlign = 'center';
    if (this._waveFlash > 0 && wave > 0) {
      ctx.globalAlpha = Math.min(1, this._waveFlash);
      ctx.font = '900 28px Orbitron, sans-serif';
      ctx.fillStyle = '#4a9eff';
      ctx.shadowColor = 'rgba(60,140,255,0.6)';
      ctx.shadowBlur = 20;
      ctx.fillText('WAVE ' + wave, GAME_W / 2, GAME_H / 2 - 50);
      if (waveName) {
        ctx.font = '700 16px "Share Tech Mono", monospace';
        ctx.fillStyle = '#80b8ff';
        ctx.fillText(waveName, GAME_W / 2, GAME_H / 2 - 20);
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Boss incoming flash
    if (bossSpawned && this._bossFlash === undefined) this._bossFlash = 3.5;
    if (this._bossFlash > 0) {
      this._bossFlash -= 0.016;
      const pulse = Math.abs(Math.sin(this._bossFlash * 5));
      ctx.globalAlpha = Math.min(1, this._bossFlash) * pulse;
      ctx.font = '900 40px Orbitron, sans-serif';
      ctx.fillStyle = '#ff2020';
      ctx.shadowColor = 'rgba(255, 20, 20, 0.8)';
      ctx.shadowBlur = 40;
      ctx.fillText('⚠ BOSS INCOMING ⚠', GAME_W / 2, GAME_H / 2 - 60);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    if (!bossSpawned && this._bossFlash !== undefined) this._bossFlash = undefined;

    ctx.font = '11px "Share Tech Mono", monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('WAVE ' + wave, GAME_W / 2, GAME_H - 22);

    // Chain
    if (player.chain > 1) {
      ctx.textAlign = 'left';
      ctx.font = '700 14px Orbitron, sans-serif';
      ctx.fillStyle = player.chain >= 10 ? '#ffd740' : '#4a9eff';
      ctx.shadowColor = player.chain >= 10 ? 'rgba(255,215,64,0.5)' : 'rgba(60,140,255,0.4)';
      ctx.shadowBlur = 8;
      ctx.fillText('CHAIN x' + player.chain, 12, GAME_H - 26);
      ctx.shadowBlur = 0;
    }

    // Cooldowns
    ctx.textAlign = 'right';
    ctx.font = '11px "Share Tech Mono", monospace';
    
    // Boost Cooldown
    let boostStatus = '';
    if (player.boostCharges >= player.maxBoostCharges) {
      boostStatus = 'MAX';
    } else {
      boostStatus = player.boostCharges + '/' + player.maxBoostCharges + ' (' + player.boostRechargeTimer.toFixed(1) + 's)';
    }
    ctx.fillStyle = player.boostCharges > 0 ? '#4a9eff' : '#ff6060';
    ctx.fillText('BOOST: ' + boostStatus, GAME_W - 12, GAME_H - 40);
    
    // Overcharge (Rockets) Cooldown
    let overStatus = player.overchargeCooldown > 0 ? (player.overchargeCooldown).toFixed(1) + 's' : 'READY';
    ctx.fillStyle = player.overchargeCooldown > 0 ? '#ff6060' : '#ffd740';
    ctx.fillText('ROCKETS: ' + overStatus, GAME_W - 12, GAME_H - 26);

    ctx.restore();
  }
}

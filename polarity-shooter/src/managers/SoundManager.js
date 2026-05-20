/**
 * SoundManager - Procedural Web Audio API sound generator for retro sound effects.
 */

class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.initialized = false;
    this.masterGain = null;
  }

  init() {
    if (this.initialized) return;
    
    // Create audio context on first user interaction
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return; // Audio not supported
    
    this.audioCtx = new AudioContext();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0.3; // Master volume
    this.masterGain.connect(this.audioCtx.destination);
    
    this.initialized = true;
  }

  _playTone(freqStart, freqEnd, type, duration, vol = 1, slideTime = null) {
    if (!this.initialized || !this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = type;
    osc.connect(gain);
    gain.connect(this.masterGain);

    const now = this.audioCtx.currentTime;
    
    // Frequency envelope
    osc.frequency.setValueAtTime(freqStart, now);
    if (slideTime === null) slideTime = duration;
    osc.frequency.exponentialRampToValueAtTime(freqEnd, now + slideTime);

    // Volume envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + duration * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }
  
  _playNoise(duration, vol = 1) {
    if (!this.initialized || !this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    const bufferSize = this.audioCtx.sampleRate * duration;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1; // White noise
    }

    const noiseSource = this.audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    
    // Apply lowpass filter to make it sound more like an explosion
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + duration);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noiseSource.start(this.audioCtx.currentTime);
  }

  playShoot(isOvercharge = false) {
    if (isOvercharge) {
      // Deeper, heavier sound for rockets
      this._playTone(300, 100, 'square', 0.2, 0.4);
      this._playNoise(0.2, 0.2); // Add some noise for oomph
    } else {
      // High-pitched laser
      this._playTone(800, 300, 'square', 0.1, 0.2);
    }
  }

  playEnemyShoot() {
    this._playTone(600, 200, 'triangle', 0.1, 0.15);
  }

  playHit() {
    // Disabled damage/hit sounds
  }

  playExplosion() {
    this._playNoise(0.5, 0.6);
    this._playTone(100, 20, 'square', 0.5, 0.4); // Deep rumble
  }
}

export const soundManager = new SoundManager();

/**
 * InputManager – unified keyboard + Gamepad API input.
 *
 * Controls:
 *   Keyboard:  Arrows / WASD = move,  Z = shoot,  X = switch polarity
 *   Gamepad:   Left stick / D-pad = move
 *              RT (axis 3 / button 7) = shoot
 *              LT (axis 2 / button 6) = switch polarity
 *              Right stick (axes 2,3) = aim direction (rotational mode)
 *              A (0) or Start (9) = confirm / menu
 */
export class InputManager {
  constructor() {
    /** @type {{ x: number, y: number }} Normalized movement */
    this.move = { x: 0, y: 0 };

    /** @type {{ x: number, y: number }} Right stick aim direction (raw) */
    this.aimStick = { x: 0, y: 0 };

    /** Whether the right stick is being actively pushed */
    this.aimActive = false;

    /** Continuous flags */
    this.shoot = false;

    /** One-shot flags (true only for one frame) */
    this.switchPressed  = false;
    this.confirmPressed = false;
    this.boostPressed   = false;
    this.overchargePressed = false;

    // Internal keyboard state
    this._keys = new Set();
    this._justPressed = new Set();

    // Gamepad
    this._gpIndex = null;
    this._prevButtons = [];
    this._prevLT = false; // previous LT state for edge detection

    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    window.addEventListener('keyup',   (e) => this._onKeyUp(e));

    window.addEventListener('gamepadconnected',    (e) => this._onGpConnect(e));
    window.addEventListener('gamepaddisconnected', (e) => this._onGpDisconnect(e));
  }

  /** Must be called at the START of each frame. */
  poll() {
    this.switchPressed  = false;
    this.confirmPressed = false;
    this.boostPressed   = false;
    this.overchargePressed = false;
    this.shoot = false;
    this.move.x = 0;
    this.move.y = 0;
    this.aimStick.x = 0;
    this.aimStick.y = 0;
    this.aimActive = false;

    this._pollKeyboard();
    this._pollGamepad();

    // Clamp movement
    const len = Math.sqrt(this.move.x ** 2 + this.move.y ** 2);
    if (len > 1) {
      this.move.x /= len;
      this.move.y /= len;
    }

    this._justPressed.clear();
  }

  /** @returns {boolean} Whether a gamepad is connected */
  get hasGamepad() { return this._gpIndex !== null; }

  /** @returns {string} Gamepad name or empty */
  get gamepadName() {
    if (this._gpIndex === null) return '';
    const gp = navigator.getGamepads()[this._gpIndex];
    return gp ? gp.id : '';
  }

  // ── Keyboard ─────────────────────────────────────────────────────────

  _onKeyDown(e) {
    // Prevent scrolling on arrow keys / space
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyZ','KeyX','KeyC','KeyV'].includes(e.code)) {
      e.preventDefault();
    }
    if (!this._keys.has(e.code)) {
      this._keys.add(e.code);
      this._justPressed.add(e.code);
    }
  }

  _onKeyUp(e) {
    this._keys.delete(e.code);
  }

  _pollKeyboard() {
    if (this._keys.has('ArrowLeft')  || this._keys.has('KeyA')) this.move.x -= 1;
    if (this._keys.has('ArrowRight') || this._keys.has('KeyD')) this.move.x += 1;
    if (this._keys.has('ArrowUp')    || this._keys.has('KeyW')) this.move.y -= 1;
    if (this._keys.has('ArrowDown')  || this._keys.has('KeyS')) this.move.y += 1;

    // Z = shoot (hold)
    if (this._keys.has('KeyZ') || this._keys.has('Space')) {
      this.shoot = true;
    }

    // X = switch polarity (just pressed)
    if (this._justPressed.has('KeyX')) {
      this.switchPressed = true;
    }

    // C = Boost
    if (this._justPressed.has('KeyC')) {
      this.boostPressed = true;
    }

    // V = Overcharge
    if (this._justPressed.has('KeyV')) {
      this.overchargePressed = true;
    }

    // Enter = confirm (just pressed)
    if (this._justPressed.has('Enter') || this._justPressed.has('Space')) {
      this.confirmPressed = true;
    }
  }

  // ── Gamepad ──────────────────────────────────────────────────────────

  _onGpConnect(e) {
    this._gpIndex = e.gamepad.index;
    console.log(`[Input] Gamepad connected: ${e.gamepad.id}`);
    this._updateStatusEl();
  }

  _onGpDisconnect(e) {
    if (e.gamepad.index === this._gpIndex) {
      this._gpIndex = null;
      this._prevButtons = [];
      this._prevLT = false;
      console.log('[Input] Gamepad disconnected');
      this._updateStatusEl();
    }
  }

  _updateStatusEl() {
    const el = document.getElementById('gamepadStatus');
    if (!el) return;
    if (this._gpIndex !== null) {
      const gp = navigator.getGamepads()[this._gpIndex];
      el.textContent = `Gamepad: ${gp?.id?.slice(0, 40) || 'podłączony'} ✓`;
      el.style.color = '#4a9eff';
    } else {
      el.textContent = 'Gamepad: nie wykryto';
      el.style.color = '';
    }
  }

  _pollGamepad() {
    if (this._gpIndex === null) return;
    const gp = navigator.getGamepads()[this._gpIndex];
    if (!gp) return;

    // Left stick (axes 0,1) with deadzone
    const DEADZONE = 0.25;
    const ax = Math.abs(gp.axes[0]) > DEADZONE ? gp.axes[0] : 0;
    const ay = Math.abs(gp.axes[1]) > DEADZONE ? gp.axes[1] : 0;
    this.move.x += ax;
    this.move.y += ay;

    // D-pad (buttons 12-15)
    if (gp.buttons[12]?.pressed) this.move.y -= 1; // up
    if (gp.buttons[13]?.pressed) this.move.y += 1; // down
    if (gp.buttons[14]?.pressed) this.move.x -= 1; // left
    if (gp.buttons[15]?.pressed) this.move.x += 1; // right

    // Right stick (axes 2,3) – for rotational aiming
    const AIM_DEADZONE = 0.3;
    const rsx = gp.axes.length > 2 ? gp.axes[2] : 0;
    const rsy = gp.axes.length > 3 ? gp.axes[3] : 0;
    if (Math.sqrt(rsx * rsx + rsy * rsy) > AIM_DEADZONE) {
      this.aimStick.x = rsx;
      this.aimStick.y = rsy;
      this.aimActive = true;
    }

    // A (button 0) = Shoot (continuous)
    if (gp.buttons[0]?.pressed) this.shoot = true;

    // LT (button 6 / left trigger) = Switch polarity (edge detection)
    const ltPressed = gp.buttons[6]?.value > 0.3 || gp.buttons[6]?.pressed;
    if (ltPressed && !this._prevLT) {
      this.switchPressed = true;
    }
    this._prevLT = ltPressed;

    // X (button 2) = Boost (edge detection)
    const xPressed = gp.buttons[2]?.pressed;
    if (xPressed && !this._prevButtons[2]) {
      this.boostPressed = true;
    }

    // Y (button 3) = Overcharge (edge detection)
    const yPressed = gp.buttons[3]?.pressed;
    if (yPressed && !this._prevButtons[3]) {
      this.overchargePressed = true;
    }

    // RT (button 7 / right trigger) = shoot (fallback)
    const rtPressed = gp.buttons[7]?.value > 0.3 || gp.buttons[7]?.pressed;
    if (rtPressed) this.shoot = true;

    // A (0) or Start (9) = confirm
    const confirmBtns = [0, 9];
    for (const idx of confirmBtns) {
      const curr = gp.buttons[idx]?.pressed;
      const prev = this._prevButtons[idx] || false;
      if (curr && !prev) this.confirmPressed = true;
    }

    // Store previous frame button states
    this._prevButtons = gp.buttons.map(b => b.pressed);
  }
}

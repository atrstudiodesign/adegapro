// Professional Audio Feedback Service for Retail & POS Environments
// Uses Web Audio API for zero-latency, offline-capable synthesized sound alerts
// Allows cashiers to operate at maximum speed without constantly glancing at the screen.

class SoundService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.6; // Default pleasant volume (0.0 to 1.0)

  constructor() {
    // Restore user sound preferences from localStorage if available
    try {
      const savedMute = localStorage.getItem('adega_sound_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedVol = localStorage.getItem('adega_sound_volume');
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v) && v >= 0 && v <= 1) {
          this.volume = v;
        }
      }
    } catch {
      // LocalStorage fallback
    }
  }

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      return this.ctx;
    } catch (e) {
      console.warn('AudioContext initialization failed:', e);
      return null;
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    try {
      localStorage.setItem('adega_sound_muted', String(muted));
    } catch {
      // Ignore
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    if (!this.isMuted) {
      this.playScanSuccess();
    }
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('adega_sound_volume', String(this.volume));
    } catch {
      // Ignore
    }
  }

  /**
   * SCAN SUCCESS BEEP
   * Clean, crisp high-pitch scanner sound (similar to Zebra / Honeywell barcode scanners).
   * Informs the cashier that the barcode was read and the item was safely added to the ticket.
   */
  public playScanSuccess(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now); // A6 note - bright, clean
      osc.frequency.exponentialRampToValueAtTime(1900, now + 0.05);

      const targetGain = 0.22 * this.volume;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(targetGain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {
      // Fallback silently if audio fails
    }
  }

  /**
   * BARCODE SCAN FAILED / ERROR ALERT
   * Distinctive double-buzz low tone (discordant sawtooth).
   * Unmistakable alert that alerts the cashier WITHOUT LOOKING at the monitor:
   * "Barcode not recognized", "Out of stock", or "Invalid code".
   */
  public playScanError(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const targetGain = 0.28 * this.volume;

      // Pulse 1: Low buzz (220 Hz sawtooth)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(220, now);
      osc1.frequency.linearRampToValueAtTime(180, now + 0.11);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(targetGain, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Pulse 2: Secondary dissonant buzz 70ms later (160 Hz -> 140 Hz)
      const t2 = now + 0.13;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(190, t2);
      osc2.frequency.linearRampToValueAtTime(150, t2 + 0.14);

      gain2.gain.setValueAtTime(0.001, t2);
      gain2.gain.exponentialRampToValueAtTime(targetGain, t2 + 0.015);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.14);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t2);
      osc2.stop(t2 + 0.15);
    } catch (e) {
      // Audio error fallback
    }
  }

  /**
   * TRANSACTION / CHECKOUT SUCCESS FANFARE (Ka-ching / Harmonic Chime)
   * Ascending bell-like chord (C5 -> E5 -> G5 -> C6) with lingering metallic resonance.
   * Gives immediate positive confirmation that payment was authorized, sale was recorded,
   * and the drawer / receipt has fired.
   */
  public playTransactionSuccess(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.14, gain: 0.20 }, // C5
        { freq: 659.25, time: 0.08, dur: 0.14, gain: 0.22 }, // E5
        { freq: 783.99, time: 0.16, dur: 0.16, gain: 0.24 }, // G5
        { freq: 1046.50, time: 0.24, dur: 0.40, gain: 0.30 } // C6 (Bright finish)
      ];

      notes.forEach(({ freq, time, dur, gain: noteGain }) => {
        const noteStart = now + time;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        const currentVol = noteGain * this.volume;
        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.exponentialRampToValueAtTime(currentVol, noteStart + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + dur + 0.01);
      });
    } catch (e) {
      // Ignore
    }
  }

  /**
   * WARNING / CAUTION ALERT
   * Moderately urgent double-tone for notifications (e.g., minimum cash, confirmation prompts)
   */
  public playWarning(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.linearRampToValueAtTime(440, now + 0.16); // A4

      const targetGain = 0.2 * this.volume;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(targetGain, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.17);
    } catch (e) {
      // Ignore
    }
  }

  /**
   * TACTILE KEYPAD TAP / CLICK
   * Crisp, subtle micro-transient (mechanical key feel) for touch virtual numpad.
   * Gives instant haptic/auditory feedback for touchscreen tablet & kiosk operators.
   */
  public playKeypadTap(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.022);

      const tapGain = 0.12 * this.volume;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(tapGain, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.028);
    } catch (e) {
      // Ignore
    }
  }
}

export const soundService = new SoundService();

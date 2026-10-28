/**
 * Duolingo-style WebAudio Synthesizer & Teacher Streak Service
 * Zero external audio files required — uses native Web Audio API oscillators.
 */

const MUTE_STORAGE_KEY = 'docentia_sound_muted_v1';
const STREAK_STORAGE_KEY = 'docentia_teacher_streak_v1';

class SoundServiceClass {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private streakDays: number = 5;

  constructor() {
    try {
      const savedMute = localStorage.getItem(MUTE_STORAGE_KEY);
      if (savedMute !== null) {
        this.muted = JSON.parse(savedMute);
      }
      const savedStreak = localStorage.getItem(STREAK_STORAGE_KEY);
      if (savedStreak !== null) {
        this.streakDays = Math.max(1, parseInt(savedStreak, 10) || 5);
      }
    } catch {
      // ignore storage errors
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, JSON.stringify(this.muted));
    } catch {
      // ignore
    }
    if (!this.muted) {
      this.playClick();
    }
    return this.muted;
  }

  public getStreak(): number {
    return this.streakDays;
  }

  public incrementStreak(): number {
    this.streakDays += 1;
    try {
      localStorage.setItem(STREAK_STORAGE_KEY, String(this.streakDays));
    } catch {
      // ignore
    }
    this.playSuccess();
    return this.streakDays;
  }

  /**
   * Crisp tactile button pop (Duolingo 3D sticker press)
   */
  public playClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.055);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.065);
    } catch {
      // ignore audio context restrictions
    }
  }

  /**
   * Iconic Duolingo "Correct Answer / Complete" bright major triad chime
   */
  public playSuccess(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';

        const startTime = now + idx * 0.065;
        const duration = idx === notes.length - 1 ? 0.28 : 0.12;

        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.11, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Playful mascot jump / XP burst sound
   */
  public playMascotBoing(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.14);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.17);
    } catch {
      // ignore
    }
  }

  /**
   * Gentle two-tone alert when OCR flags a doubtful handwritten exercise
   */
  public playWarning(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [440, 349.23]; // A4 -> F4
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';

        const startTime = now + idx * 0.11;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.09, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.15);
      });
    } catch {
      // ignore
    }
  }
}

export const SoundService = new SoundServiceClass();

import { Injectable, signal } from '@angular/core';

const MUTE_KEY = 'wett-quiz.muted';

/** Kleine Synthesizer-Effekte über die Web Audio API, ganz ohne Audiodateien. */
@Injectable({ providedIn: 'root' })
export class SoundService {
  readonly muted = signal(this.readMuted());
  private ctx?: AudioContext;

  toggle(): void {
    this.muted.update((m) => !m);
    try {
      localStorage.setItem(MUTE_KEY, String(this.muted()));
    } catch {
      // egal
    }
  }

  pop(): void {
    this.tone(660, 0.08, 'triangle', 0.15);
  }

  coin(): void {
    this.tone(988, 0.08, 'square', 0.08);
    this.tone(1319, 0.25, 'square', 0.08, 0.08);
  }

  wahWah(): void {
    [392, 370, 349, 311].forEach((f, i) => this.tone(f, i === 3 ? 0.6 : 0.25, 'sawtooth', 0.07, i * 0.28));
  }

  fanfare(): void {
    const notes = [523, 659, 784, 1047, 784, 1047];
    const lengths = [0.15, 0.15, 0.15, 0.35, 0.15, 0.7];
    let t = 0;
    notes.forEach((f, i) => {
      this.tone(f, lengths[i], 'square', 0.09, t);
      this.tone(f / 2, lengths[i], 'triangle', 0.08, t);
      t += lengths[i];
    });
  }

  /** Trommelwirbel aus kurzen Rauschimpulsen, wird zum Ende hin lauter. */
  drumroll(seconds: number): void {
    const ctx = this.context();
    if (!ctx) {
      return;
    }
    const hits = Math.floor(seconds * 22);
    for (let i = 0; i < hits; i++) {
      this.noise(0.04, 0.05 + 0.25 * (i / hits), i / 22);
    }
    this.noise(0.4, 0.5, seconds);
  }

  private tone(freq: number, duration: number, type: OscillatorType, volume: number, delay = 0): void {
    const ctx = this.context();
    if (!ctx) {
      return;
    }
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private noise(duration: number, volume: number, delay: number): void {
    const ctx = this.context()!;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    gain.gain.value = volume;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(ctx.currentTime + delay);
  }

  private context(): AudioContext | undefined {
    if (this.muted() || typeof AudioContext === 'undefined') {
      return undefined;
    }
    this.ctx ??= new AudioContext();
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private readMuted(): boolean {
    try {
      return localStorage.getItem(MUTE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}

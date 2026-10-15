import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';

/** Zählt bei Änderungen sichtbar vom alten zum neuen Wert hoch bzw. runter. */
@Component({
  selector: 'app-counter',
  template: '{{ shown() }}',
})
export class Counter {
  readonly value = input.required<number>();
  readonly duration = input(1200);
  /** Wenn gesetzt, zählt schon die erste Anzeige von diesem Wert aus hoch. */
  readonly from = input<number>();

  protected readonly shown = signal(0);
  private frame = 0;
  private initialized = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
    effect(() => {
      const target = this.value();
      untracked(() => this.animateTo(target));
    });
  }

  private animateTo(target: number): void {
    cancelAnimationFrame(this.frame);
    if (!this.initialized) {
      this.initialized = true;
      this.shown.set(this.from() ?? target);
    }
    const from = this.shown();
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / this.duration());
      const eased = 1 - Math.pow(1 - t, 3);
      this.shown.set(Math.round(from + (target - from) * eased));
      if (t < 1) {
        this.frame = requestAnimationFrame(step);
      }
    };
    this.frame = requestAnimationFrame(step);
  }
}

import { Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  round: boolean;
}

const COLORS = ['#ff5d73', '#3fa7ff', '#3ccf6e', '#ffc93c', '#8a5cff', '#ff7ac6'];

/** Konfettiregen auf einem Canvas über der ganzen Seite. */
@Component({
  selector: 'app-confetti',
  template: '<canvas #canvas></canvas>',
  styles: `
    canvas {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 100;
    }
  `,
})
export class Confetti {
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private pieces: Piece[] = [];
  private frame = 0;
  private spawnUntil = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
  }

  burst(seconds = 6): void {
    const canvas = this.canvas().nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    this.spawnUntil = performance.now() + seconds * 1000;
    for (let i = 0; i < 160; i++) {
      this.pieces.push(this.piece(canvas.width / 2, canvas.height * 0.45, true));
    }
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.tick());
  }

  private piece(x: number, y: number, explode: boolean): Piece {
    const angle = Math.random() * Math.PI * 2;
    const speed = explode ? 4 + Math.random() * 10 : 0;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed + (explode ? 0 : Math.random() * 2 - 1),
      vy: Math.sin(angle) * speed - (explode ? 6 : 0) + (explode ? 0 : 2 + Math.random() * 2),
      size: 6 + Math.random() * 8,
      rotation: Math.random() * Math.PI,
      spin: Math.random() * 0.3 - 0.15,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      round: Math.random() < 0.3,
    };
  }

  private tick(): void {
    const canvas = this.canvas().nativeElement;
    const ctx = canvas.getContext('2d')!;
    if (performance.now() < this.spawnUntil) {
      for (let i = 0; i < 4; i++) {
        this.pieces.push(this.piece(Math.random() * canvas.width, -20, false));
      }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of this.pieces) {
      p.vy += 0.18;
      p.vx *= 0.99;
      p.vy = Math.min(p.vy, 6);
      p.x += p.vx + Math.sin(p.y / 30);
      p.y += p.vy;
      p.rotation += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    }
    this.pieces = this.pieces.filter((p) => p.y < canvas.height + 30);
    if (this.pieces.length > 0) {
      this.frame = requestAnimationFrame(() => this.tick());
    }
  }
}

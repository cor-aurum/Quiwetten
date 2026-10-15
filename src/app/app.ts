import { Component, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Finale } from './finale/finale';
import { GameService } from './game/game.service';
import { SoundService } from './game/sound.service';
import { Round } from './round/round';
import { Prepare } from './setup/prepare';
import { TeamSetup } from './setup/team-setup';

@Component({
  selector: 'app-root',
  imports: [Prepare, TeamSetup, Round, Finale],
  template: `
    <header class="top">
      <h1><span class="wiggle">🎲</span> {{ game.displayTitle() }}</h1>
      <div class="top-actions">
        @if (game.phase() === 'playing' || game.phase() === 'finale') {
          <button class="btn btn-small" type="button" (click)="abort()">🏠 Spiel beenden</button>
        }
        <button
          class="btn btn-small"
          type="button"
          [attr.aria-label]="sound.muted() ? 'Ton an' : 'Ton aus'"
          (click)="sound.toggle()"
        >
          {{ sound.muted() ? '🔇' : '🔊' }}
        </button>
      </div>
    </header>
    <main>
      @switch (game.phase()) {
        @case ('prepare') {
          <app-prepare />
        }
        @case ('teams') {
          <app-team-setup />
        }
        @case ('playing') {
          <app-round />
        }
        @case ('finale') {
          <app-finale />
        }
      }
    </main>
  `,
  styles: `
    :host {
      display: block;
      max-width: 1280px;
      margin: 0 auto;
      padding: 16px;
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 28px;
    }
    h1 {
      font-size: clamp(1.6rem, 4vw, 2.6rem);
      color: #fff;
      text-shadow:
        3px 3px 0 var(--ink),
        -1px -1px 0 var(--ink),
        1px -1px 0 var(--ink),
        -1px 1px 0 var(--ink);
      span {
        display: inline-block;
      }
    }
    .top-actions {
      display: flex;
      gap: 10px;
    }
  `,
})
export class App {
  protected readonly game = inject(GameService);
  protected readonly sound = inject(SoundService);

  constructor() {
    const title = inject(Title);
    effect(() => title.setTitle(this.game.displayTitle()));
  }

  protected abort(): void {
    if (this.game.phase() === 'finale' || confirm('Spiel wirklich beenden? Die Punkte gehen verloren.')) {
      this.game.backToSetup();
    }
  }
}

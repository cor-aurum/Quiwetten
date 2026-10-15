import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { GameService } from '../game/game.service';
import { Team } from '../game/models';
import { rankTeams } from '../game/scoring';
import { SoundService } from '../game/sound.service';
import { Confetti } from '../shared/confetti';
import { Counter } from '../shared/counter';

interface PlaceGroup {
  place: number;
  teams: Team[];
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '🎈' };

@Component({
  selector: 'app-finale',
  imports: [Confetti, Counter],
  templateUrl: './finale.html',
  styleUrl: './finale.scss',
})
export class Finale {
  protected readonly game = inject(GameService);
  private readonly sound = inject(SoundService);
  private readonly confetti = viewChild.required(Confetti);
  private destroyed = false;

  /** Plätze von oben (1) nach unten, gleich viele Punkte teilen sich einen Platz. */
  protected readonly groups = computed<PlaceGroup[]>(() => {
    const groups: PlaceGroup[] = [];
    for (const { team, place } of rankTeams(this.game.teams())) {
      const group = groups.find((g) => g.place === place);
      if (group) {
        group.teams.push(team);
      } else {
        groups.push({ place, teams: [team] });
      }
    }
    return groups;
  });

  /** Wie viele Plätze von unten schon aufgedeckt sind. */
  protected readonly revealed = signal(0);
  protected readonly busy = signal(false);
  protected readonly countdown = signal<number | null>(null);

  protected readonly nextGroup = computed(
    () => this.groups()[this.groups().length - this.revealed() - 1],
  );
  protected readonly done = computed(() => this.revealed() >= this.groups().length);

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.destroyed = true));
  }

  protected medal(place: number): string {
    return MEDALS[place] ?? '🎈';
  }

  protected isRevealed(index: number): boolean {
    return index >= this.groups().length - this.revealed();
  }

  protected async revealNext(): Promise<void> {
    const group = this.nextGroup();
    if (!group || this.busy()) {
      return;
    }
    this.busy.set(true);
    if (group.place === 1) {
      this.sound.drumroll(3.2);
      for (const n of [3, 2, 1]) {
        this.countdown.set(n);
        await wait(1000);
      }
      this.countdown.set(null);
      await wait(250);
    } else {
      this.sound.drumroll(1.6);
      await wait(1800);
    }
    if (this.destroyed) {
      return;
    }
    this.revealed.update((r) => r + 1);
    this.busy.set(false);
    if (group.place === 1) {
      this.sound.fanfare();
      this.confetti().burst();
    } else {
      this.sound.coin();
    }
  }

  protected playAgain(): void {
    this.game.startGame();
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

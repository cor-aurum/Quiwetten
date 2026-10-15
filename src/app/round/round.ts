import { Component, computed, inject, signal } from '@angular/core';
import { GameService } from '../game/game.service';
import { TeamId } from '../game/models';
import { SoundService } from '../game/sound.service';
import { LETTERS, TeamPanel } from './team-panel';

@Component({
  selector: 'app-round',
  imports: [TeamPanel],
  templateUrl: './round.html',
  styleUrl: './round.scss',
})
export class Round {
  protected readonly game = inject(GameService);
  private readonly sound = inject(SoundService);
  protected readonly letters = LETTERS;

  /** Richtige Antwort, die die Spielleitung gerade auswählt bzw. eintippt. */
  protected readonly correct = signal<number | null>(null);

  protected readonly question = computed(() => this.game.current()!);
  protected readonly dots = computed(() => Array.from({ length: this.game.total() }, (_, i) => i));
  protected readonly totalBet = computed(() =>
    Object.values(this.game.bets()).reduce((sum, b) => sum + b.amount, 0),
  );
  protected readonly correctLabel = computed(() => {
    const result = this.game.lastResult();
    const q = this.question();
    if (!result) {
      return '';
    }
    return q.type === 'choice'
      ? `${LETTERS[result.correct]}: ${q.options[result.correct]}`
      : `${result.correct} ${q.unit}`;
  });

  protected outcomeFor(id: TeamId) {
    const result = this.game.lastResult();
    return this.game.step() === 'result' ? result?.outcomes.find((o) => o.teamId === id) : undefined;
  }

  protected lock(): void {
    this.correct.set(null);
    this.sound.drumroll(0.6);
    this.game.lockBets();
  }

  protected setCorrectEstimate(raw: string): void {
    const value = parseFloat(raw.replace(',', '.'));
    this.correct.set(Number.isFinite(value) ? value : null);
  }

  protected resolve(): void {
    const correct = this.correct();
    if (correct === null) {
      return;
    }
    this.game.resolve(correct);
    const outcomes = this.game.lastResult()?.outcomes ?? [];
    if (outcomes.some((o) => o.delta > 0)) {
      this.sound.coin();
    } else if (outcomes.some((o) => o.delta < 0)) {
      this.sound.wahWah();
    }
  }

  protected undo(): void {
    this.correct.set(this.game.lastResult()?.correct ?? null);
    this.game.undoResolve();
  }

  protected next(): void {
    this.correct.set(null);
    this.sound.pop();
    this.game.next();
    if (this.game.phase() === 'playing' && this.game.rescued().length > 0) {
      this.sound.coin();
    }
  }

  protected skip(): void {
    if (confirm('Diese Frage überspringen? Die Einsätze werden nicht gewertet.')) {
      this.next();
    }
  }
}

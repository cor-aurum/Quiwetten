import { Component, computed, inject, input } from '@angular/core';
import { GameService } from '../game/game.service';
import { Question, Team, TeamOutcome } from '../game/models';
import { SoundService } from '../game/sound.service';
import { Counter } from '../shared/counter';

export const LETTERS = 'ABCDEFGH';

@Component({
  selector: 'app-team-panel',
  imports: [Counter],
  templateUrl: './team-panel.html',
  styleUrl: './team-panel.scss',
  host: { '[attr.data-team]': 'team().id' },
})
export class TeamPanel {
  readonly team = input.required<Team>();
  readonly question = input.required<Question>();
  readonly outcome = input<TeamOutcome>();

  protected readonly game = inject(GameService);
  private readonly sound = inject(SoundService);
  protected readonly letters = LETTERS;

  protected readonly bet = computed(
    () => this.game.bets()[this.team().id] ?? { amount: 0, answer: null },
  );
  protected readonly step = this.game.step;
  protected readonly broke = computed(() => this.team().points <= 0);
  protected readonly rescued = computed(() => this.game.rescued().includes(this.team().id));
  protected readonly missingAnswer = computed(
    () => this.bet().amount > 0 && this.bet().answer === null,
  );

  protected readonly quickBets = computed(() => {
    const p = this.team().points;
    return [
      { label: '10', value: 10 },
      { label: '25', value: 25 },
      { label: 'Hälfte', value: Math.floor(p / 2) },
      { label: 'Alles! 🔥', value: p },
    ].filter((q) => q.value > 0 && q.value <= p);
  });

  protected readonly answerLabel = computed(() => {
    const answer = this.bet().answer;
    const q = this.question();
    if (answer === null) {
      return '–';
    }
    return q.type === 'choice' ? `${LETTERS[answer]}: ${q.options[answer]}` : `${answer} ${q.unit}`;
  });

  protected formatFactor(factor: number): string {
    return factor.toLocaleString('de-DE');
  }

  protected setAmount(value: number): void {
    this.game.setAmount(this.team().id, value);
    this.sound.pop();
  }

  protected chooseOption(index: number): void {
    this.game.setAnswer(this.team().id, this.bet().answer === index ? null : index);
    this.sound.pop();
  }

  protected setEstimate(raw: string): void {
    const value = parseFloat(raw.replace(',', '.'));
    this.game.setAnswer(this.team().id, Number.isFinite(value) ? value : null);
  }
}

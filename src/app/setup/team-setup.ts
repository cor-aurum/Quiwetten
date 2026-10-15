import { Component, computed, inject, signal } from '@angular/core';
import { GameService } from '../game/game.service';
import { MAX_TEAMS, MIN_TEAMS, TeamId, isPlayable } from '../game/models';
import { SoundService } from '../game/sound.service';

const EMOJIS = ['🚀', '🐳', '🐸', '⚡', '🦄', '🐯', '🦊', '🐙', '🍕', '🌈', '👑', '🐢', '🦖', '🐝', '🍉', '⭐'];

/** Schritt 2: Teams zusammenstellen. Zeigt keine Fragen und kann allen gezeigt werden. */
@Component({
  selector: 'app-team-setup',
  templateUrl: './team-setup.html',
  styleUrl: './setup.scss',
})
export class TeamSetup {
  protected readonly game = inject(GameService);
  private readonly sound = inject(SoundService);
  protected readonly emojis = EMOJIS;
  protected readonly teamCounts = Array.from(
    { length: MAX_TEAMS - MIN_TEAMS + 1 },
    (_, i) => MIN_TEAMS + i,
  );
  protected readonly emojiPickerFor = signal<TeamId | null>(null);

  protected readonly playableCount = computed(
    () => this.game.questions().filter(isPlayable).length,
  );
  protected readonly teamInfo = computed(() => this.game.teamInfo().trim());

  protected setTeamCount(count: number): void {
    this.game.setTeamCount(count);
    this.emojiPickerFor.set(null);
    this.sound.pop();
  }

  protected rename(id: TeamId, name: string): void {
    this.game.renameTeam(id, name, this.game.team(id).emoji);
  }

  protected pickEmoji(id: TeamId, emoji: string): void {
    this.game.renameTeam(id, this.game.team(id).name, emoji);
    this.emojiPickerFor.set(null);
    this.sound.pop();
  }

  protected back(): void {
    this.game.goToPrepare();
  }

  protected start(): void {
    this.sound.fanfare();
    this.game.startGame();
  }
}

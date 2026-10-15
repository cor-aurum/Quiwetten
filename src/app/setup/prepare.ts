import { Component, computed, inject, signal } from '@angular/core';
import { GameService, newId } from '../game/game.service';
import { DEFAULT_TITLE, MercyRule, Question, isPlayable } from '../game/models';
import { downloadLeaderPdf } from '../game/leader-pdf';
import { cleanMaterials, packingList, parseQuizFile, slug, toQuizFile } from '../game/quiz-file';
import { SAMPLE_QUESTIONS } from '../game/sample-questions';
import { SoundService } from '../game/sound.service';

/** Schritt 1: Titel, Team-Text und Fragen – nur für die Spielleitung. */
@Component({
  selector: 'app-prepare',
  templateUrl: './prepare.html',
  styleUrl: './setup.scss',
})
export class Prepare {
  protected readonly game = inject(GameService);
  private readonly sound = inject(SoundService);
  protected readonly defaultTitle = DEFAULT_TITLE;
  protected readonly importError = signal<string | null>(null);
  protected readonly pdfBusy = signal(false);

  protected readonly playableCount = computed(
    () => this.game.questions().filter(isPlayable).length,
  );

  protected readonly packingList = computed(() => packingList(this.game.questions()));

  protected materialCount(q: Question): number {
    return cleanMaterials(q.materials).length;
  }

  protected hasNotes(q: Question): boolean {
    return !!q.description?.trim() || this.materialCount(q) > 0;
  }

  protected setMercy(change: Partial<MercyRule>): void {
    this.game.mercy.update((m) => {
      const next = { ...m, ...change };
      return { ...next, points: Math.max(1, Math.min(100, Math.round(next.points) || 1)) };
    });
  }

  protected add(type: Question['type']): void {
    const q: Question =
      type === 'choice'
        ? { id: newId(), type, text: '', options: ['', ''] }
        : { id: newId(), type, text: '', unit: '' };
    this.game.questions.update((list) => [...list, q]);
    this.sound.pop();
  }

  protected update(id: string, change: Partial<Question>): void {
    this.game.questions.update((list) =>
      list.map((q) => (q.id === id ? ({ ...q, ...change } as Question) : q)),
    );
  }

  protected setMaterials(id: string, text: string): void {
    this.update(id, { materials: text.split('\n') });
  }

  protected switchType(q: Question, type: Question['type']): void {
    if (q.type === type) {
      return;
    }
    const base = { id: q.id, text: q.text, description: q.description, materials: q.materials };
    const next: Question =
      type === 'choice' ? { ...base, type, options: ['', ''] } : { ...base, type, unit: '' };
    this.game.questions.update((list) => list.map((x) => (x.id === q.id ? next : x)));
  }

  protected setOption(q: Question, index: number, value: string): void {
    if (q.type === 'choice') {
      this.update(q.id, { options: q.options.map((o, i) => (i === index ? value : o)) });
    }
  }

  protected addOption(q: Question): void {
    if (q.type === 'choice') {
      this.update(q.id, { options: [...q.options, ''] });
    }
  }

  protected removeOption(q: Question, index: number): void {
    if (q.type === 'choice') {
      this.update(q.id, { options: q.options.filter((_, i) => i !== index) });
    }
  }

  protected move(index: number, delta: number): void {
    this.game.questions.update((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) {
        return list;
      }
      const copy = [...list];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  protected remove(id: string): void {
    this.game.questions.update((list) => list.filter((q) => q.id !== id));
  }

  protected loadSamples(): void {
    if (confirm('Alle Fragen durch die Beispielfragen ersetzen?')) {
      this.game.questions.set(structuredClone(SAMPLE_QUESTIONS));
    }
  }

  protected exportQuiz(): void {
    const file = toQuizFile(this.game.title(), this.game.teamInfo(), this.game.questions());
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slug(this.game.displayTitle())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  protected async importQuiz(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    try {
      const quiz = parseQuizFile(JSON.parse(await file.text()));
      this.game.questions.set(quiz.questions);
      if (quiz.title !== undefined) {
        this.game.title.set(quiz.title);
      }
      if (quiz.teamInfo !== undefined) {
        this.game.teamInfo.set(quiz.teamInfo);
      }
      this.importError.set(null);
    } catch (e) {
      this.importError.set(e instanceof Error ? e.message : 'Datei konnte nicht gelesen werden.');
    }
  }

  protected async exportPdf(): Promise<void> {
    this.pdfBusy.set(true);
    try {
      await downloadLeaderPdf({
        title: this.game.displayTitle(),
        teamInfo: this.game.teamInfo(),
        mercy: this.game.mercy(),
        questions: this.game.playableQuestions(),
      });
    } finally {
      this.pdfBusy.set(false);
    }
  }

  protected next(): void {
    this.sound.pop();
    this.game.goToTeams();
    window.scrollTo({ top: 0 });
  }
}

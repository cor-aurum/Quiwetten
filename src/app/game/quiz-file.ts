import { newId } from './game.service';
import { Question } from './models';

/** Format der Export-Datei. */
export interface QuizFile {
  title: string;
  teamInfo?: string;
  questions: Question[];
}

/** Bereitet die Konfiguration für den Export auf (ohne interne IDs und leere Materialzeilen). */
export function toQuizFile(title: string, teamInfo: string, questions: Question[]): QuizFile {
  return {
    title,
    ...(teamInfo.trim() ? { teamInfo } : {}),
    questions: questions.map(({ id: _id, ...q }) => {
      const materials = cleanMaterials(q.materials);
      const { materials: _m, description, ...rest } = q;
      return {
        ...rest,
        ...(description?.trim() ? { description } : {}),
        ...(materials.length ? { materials } : {}),
      } as Question;
    }),
  };
}

/** Liest eine Export-Datei. Ältere Exporte bestehen nur aus der Fragenliste. */
export function parseQuizFile(parsed: unknown): Partial<QuizFile> & { questions: Question[] } {
  const quiz = (Array.isArray(parsed) ? { questions: parsed } : parsed) as Record<string, unknown>;
  if (!quiz || !Array.isArray(quiz['questions'])) {
    throw new Error('Die Datei enthält keine Fragenliste.');
  }
  return {
    questions: quiz['questions'].map(toQuestion),
    ...(typeof quiz['title'] === 'string' && quiz['title'].trim() ? { title: quiz['title'] } : {}),
    ...(typeof quiz['teamInfo'] === 'string' ? { teamInfo: quiz['teamInfo'] } : {}),
  };
}

export interface PackingItem {
  name: string;
  /** Fragennummern (ab 1) bezogen auf die übergebene Liste. */
  questions: number[];
}

/** Gesamte Materialliste aller Fragen, gleiche Einträge (ohne Groß/Klein) zusammengefasst. */
export function packingList(questions: readonly Question[]): PackingItem[] {
  const items = new Map<string, PackingItem>();
  questions.forEach((q, i) => {
    for (const name of cleanMaterials(q.materials)) {
      const key = name.toLowerCase();
      const item = items.get(key) ?? { name, questions: [] };
      if (!item.questions.includes(i + 1)) {
        item.questions.push(i + 1);
      }
      items.set(key, item);
    }
  });
  return [...items.values()];
}

export function cleanMaterials(materials: string[] | undefined): string[] {
  return (materials ?? []).map((m) => m.trim()).filter(Boolean);
}

export function slug(title: string): string {
  const umlauts: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };
  return (
    title
      .toLowerCase()
      .replace(/[äöüß]/g, (c) => umlauts[c])
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'wett-quiz'
  );
}

function toQuestion(raw: unknown, i: number): Question {
  const q = raw as Record<string, unknown>;
  if (typeof q?.['text'] !== 'string') {
    throw new Error(`Frage ${i + 1} hat keinen Text.`);
  }
  const notes = {
    ...(typeof q['description'] === 'string' ? { description: q['description'] } : {}),
    ...(Array.isArray(q['materials']) ? { materials: q['materials'].map(String) } : {}),
  };
  if (q['type'] === 'choice') {
    if (!Array.isArray(q['options'])) {
      throw new Error(`Frage ${i + 1} hat keine Antwortmöglichkeiten.`);
    }
    return { id: newId(), type: 'choice', text: q['text'], options: q['options'].map(String), ...notes };
  }
  if (q['type'] === 'estimate') {
    const unit = typeof q['unit'] === 'string' ? q['unit'] : '';
    return { id: newId(), type: 'estimate', text: q['text'], unit, ...notes };
  }
  throw new Error(`Frage ${i + 1} hat einen unbekannten Typ (erlaubt: "choice", "estimate").`);
}

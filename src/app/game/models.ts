export type TeamId =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'orange'
  | 'pink'
  | 'teal';

export interface Team {
  id: TeamId;
  name: string;
  emoji: string;
  points: number;
}

/** Notizen für die Spielleitung, die im Spiel nicht angezeigt werden. */
export interface QuestionNotes {
  description?: string;
  /** Eine Zeile pro Material, so wie eingegeben (kann leere Zeilen enthalten). */
  materials?: string[];
}

export interface ChoiceQuestion extends QuestionNotes {
  id: string;
  type: 'choice';
  text: string;
  options: string[];
}

export interface EstimateQuestion extends QuestionNotes {
  id: string;
  type: 'estimate';
  text: string;
  unit: string;
}

export type Question = ChoiceQuestion | EstimateQuestion;

/** Fragen ohne Text oder Auswahlfragen mit weniger als zwei Möglichkeiten werden nicht gespielt. */
export function isPlayable(q: Question): boolean {
  return !!q.text.trim() && (q.type === 'estimate' || q.options.filter((o) => o.trim()).length >= 2);
}

/** Einsatz und Tipp eines Teams in einer Runde. `answer` ist Options-Index oder Schätzwert. */
export interface Bet {
  amount: number;
  answer: number | null;
}

/** Einsätze der mitspielenden Teams. Die Schlüssel bestimmen, welche Teams gewertet werden. */
export type Bets = Partial<Record<TeamId, Bet>>;

export interface TeamOutcome {
  teamId: TeamId;
  bet: number;
  answer: number | null;
  /** Faktor, mit dem der Einsatz zurückkommt (0 = verloren, 1 = zurück, 2 = verdoppelt). */
  factor: number;
  /** Punkteveränderung gegenüber dem Stand vor der Runde. */
  delta: number;
  /** Nur bei Schätzfragen: Abstand zum richtigen Wert. */
  distance?: number;
  /** Nur bei Schätzfragen: Platz nach Abstand (1 = am nächsten dran). */
  rank?: number;
}

export interface RoundResult {
  questionId: string;
  correct: number;
  outcomes: TeamOutcome[];
}

/** `prepare`: Titel und Fragen (nur Spielleitung), `teams`: Teams zusammenstellen (für alle sichtbar). */
export type Phase = 'prepare' | 'teams' | 'playing' | 'finale';
export type RoundStep = 'betting' | 'resolving' | 'result';

export const START_POINTS = 100;

export const DEFAULT_TITLE = 'Das große Wett-Quiz';

/** Gnadenregel: Wer vor einer Frage unter `points` liegt, wird auf `points` aufgefüllt. */
export interface MercyRule {
  enabled: boolean;
  points: number;
}

export const DEFAULT_MERCY: MercyRule = { enabled: true, points: 10 };

/** Alle möglichen Teams in der Reihenfolge, in der sie dazukommen. */
export const ALL_TEAMS: readonly Omit<Team, 'points'>[] = [
  { id: 'red', name: 'Rote Raketen', emoji: '🚀' },
  { id: 'blue', name: 'Blaue Wale', emoji: '🐳' },
  { id: 'green', name: 'Grüne Frösche', emoji: '🐸' },
  { id: 'yellow', name: 'Gelbe Blitze', emoji: '⚡' },
  { id: 'purple', name: 'Lila Einhörner', emoji: '🦄' },
  { id: 'orange', name: 'Orange Füchse', emoji: '🦊' },
  { id: 'pink', name: 'Pinke Flamingos', emoji: '🦩' },
  { id: 'teal', name: 'Türkise Kraken', emoji: '🐙' },
];

export const MIN_TEAMS = 2;
export const MAX_TEAMS = ALL_TEAMS.length;
export const DEFAULT_TEAM_COUNT = 4;

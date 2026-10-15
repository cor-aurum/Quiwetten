import { Injectable, computed, effect, signal } from '@angular/core';
import {
  Bet,
  Bets,
  DEFAULT_MERCY,
  DEFAULT_TITLE,
  ALL_TEAMS,
  DEFAULT_TEAM_COUNT,
  MAX_TEAMS,
  MIN_TEAMS,
  MercyRule,
  Phase,
  Question,
  RoundResult,
  RoundStep,
  START_POINTS,
  Team,
  TeamId,
  isPlayable,
} from './models';
import { SAMPLE_QUESTIONS } from './sample-questions';
import { applyMercy, score } from './scoring';

const QUESTIONS_KEY = 'wett-quiz.questions';
const GAME_KEY = 'wett-quiz.game';
const MERCY_KEY = 'wett-quiz.mercy';
const TITLE_KEY = 'wett-quiz.title';
const TEAM_INFO_KEY = 'wett-quiz.team-info';

interface GameState {
  teams: Team[];
  phase: Phase;
  /** Fragen des laufenden Spiels, beim Start aus der Konfiguration kopiert. */
  playlist: Question[];
  index: number;
  step: RoundStep;
  bets: Bets;
  history: RoundResult[];
  /** Teams, die vor der aktuellen Frage per Gnadenregel aufgefüllt wurden. */
  rescued: TeamId[];
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function emptyBets(teams: readonly Team[]): Bets {
  return Object.fromEntries(teams.map((t) => [t.id, { amount: 0, answer: null }]));
}

function initialState(teams?: readonly Omit<Team, 'points'>[], phase: Phase = 'prepare'): GameState {
  const fresh = (teams ?? ALL_TEAMS.slice(0, DEFAULT_TEAM_COUNT)).map((t) => ({
    ...t,
    points: START_POINTS,
  }));
  return {
    teams: fresh,
    phase,
    playlist: [],
    index: 0,
    step: 'betting',
    bets: emptyBets(fresh),
    history: [],
    rescued: [],
  };
}

function restore(): GameState {
  const saved = load<Partial<GameState>>(GAME_KEY, {});
  // Ältere Spielstände kannten nur eine gemeinsame Setup-Seite ('setup').
  const phase = (saved.phase as string) === 'setup' ? 'prepare' : saved.phase;
  return { ...initialState(), ...saved, ...(phase ? { phase } : {}) };
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Speichern ist nur Komfort, das Spiel läuft auch ohne.
  }
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly state = signal<GameState>(restore());

  /** Konfigurierte Fragenliste, unabhängig vom laufenden Spiel. */
  readonly questions = signal<Question[]>(load(QUESTIONS_KEY, SAMPLE_QUESTIONS));

  readonly mercy = signal<MercyRule>(load(MERCY_KEY, DEFAULT_MERCY));

  /** Titel des Quiz, wird zusammen mit den Fragen exportiert. */
  readonly title = signal<string>(load(TITLE_KEY, DEFAULT_TITLE));
  readonly displayTitle = computed(() => this.title().trim() || DEFAULT_TITLE);

  /** Optionaler Text, wie sich die Teams zusammensetzen; groß auf der Team-Seite. */
  readonly teamInfo = signal<string>(load(TEAM_INFO_KEY, ''));

  /** Fragen in der Reihenfolge und Form, in der sie gespielt werden. */
  readonly playableQuestions = computed(() =>
    this.questions()
      .filter(isPlayable)
      .map((q) => (q.type === 'choice' ? { ...q, options: q.options.filter((o) => o.trim()) } : q)),
  );

  readonly teams = computed(() => this.state().teams);
  readonly phase = computed(() => this.state().phase);
  readonly step = computed(() => this.state().step);
  readonly bets = computed(() => this.state().bets);
  readonly history = computed(() => this.state().history);
  readonly rescued = computed(() => this.state().rescued);
  /** Spalten für die Teamkarten: bis 4 Teams in einer Reihe, ab 5 auf zwei Reihen verteilt. */
  readonly teamColumns = computed(() => {
    const n = this.teams().length;
    return n <= 4 ? n : Math.ceil(n / 2);
  });
  readonly index = computed(() => this.state().index);
  readonly total = computed(() => this.state().playlist.length);
  readonly current = computed<Question | undefined>(() => this.state().playlist[this.index()]);
  readonly isLast = computed(() => this.index() >= this.total() - 1);
  readonly lastResult = computed<RoundResult | undefined>(() => this.history().at(-1));

  /** Jedes Team mit Einsatz braucht einen Tipp. */
  readonly canLock = computed(() =>
    Object.values(this.bets()).every((bet) => bet.amount === 0 || bet.answer !== null),
  );

  constructor() {
    effect(() => save(GAME_KEY, this.state()));
    effect(() => save(QUESTIONS_KEY, this.questions()));
    effect(() => save(MERCY_KEY, this.mercy()));
    effect(() => save(TITLE_KEY, this.title()));
    effect(() => save(TEAM_INFO_KEY, this.teamInfo()));
  }

  team(id: TeamId): Team {
    return this.teams().find((t) => t.id === id)!;
  }

  /** Ändert die Anzahl der Teams; bestehende Namen und Maskottchen bleiben erhalten. */
  setTeamCount(count: number): void {
    const n = Math.max(MIN_TEAMS, Math.min(MAX_TEAMS, Math.round(count)));
    const current = this.teams();
    this.state.set(
      initialState(
        ALL_TEAMS.slice(0, n).map((t, i) => current[i] ?? t),
        this.phase(),
      ),
    );
  }

  renameTeam(id: TeamId, name: string, emoji: string): void {
    this.patch((s) => ({
      teams: s.teams.map((t) => (t.id === id ? { ...t, name, emoji } : t)),
    }));
  }

  startGame(): void {
    const playlist = this.playableQuestions();
    this.state.set({ ...initialState(this.teams()), phase: 'playing', playlist });
  }

  setAmount(id: TeamId, amount: number): void {
    const max = this.team(id).points;
    const clamped = Math.max(0, Math.min(max, Math.round(Number(amount) || 0)));
    this.patchBet(id, { amount: clamped });
  }

  setAnswer(id: TeamId, answer: number | null): void {
    this.patchBet(id, { answer });
  }

  lockBets(): void {
    if (this.canLock()) {
      this.patch(() => ({ step: 'resolving' }));
    }
  }

  unlockBets(): void {
    this.patch(() => ({ step: 'betting' }));
  }

  resolve(correct: number): void {
    const question = this.current();
    if (!question) {
      return;
    }
    const outcomes = score(question, this.bets(), correct);
    this.patch((s) => ({
      step: 'result',
      teams: s.teams.map((t) => ({
        ...t,
        points: t.points + (outcomes.find((o) => o.teamId === t.id)?.delta ?? 0),
      })),
      history: [...s.history, { questionId: question.id, correct, outcomes }],
    }));
  }

  /** Nimmt die letzte Auflösung zurück, falls das richtige Ergebnis falsch eingegeben wurde. */
  undoResolve(): void {
    const last = this.lastResult();
    if (this.step() !== 'result' || !last) {
      return;
    }
    this.patch((s) => ({
      step: 'resolving',
      teams: s.teams.map((t) => ({
        ...t,
        points: t.points - (last.outcomes.find((o) => o.teamId === t.id)?.delta ?? 0),
      })),
      history: s.history.slice(0, -1),
    }));
  }

  next(): void {
    if (this.isLast()) {
      this.patch(() => ({ phase: 'finale' }));
    } else {
      this.patch((s) => ({
        ...applyMercy(s.teams, this.mercy()),
        index: s.index + 1,
        step: 'betting',
        bets: emptyBets(s.teams),
      }));
    }
  }

  skipQuestion(): void {
    this.next();
  }

  /** Bricht ein Spiel ab und zeigt die Team-Seite, auf der keine Fragen zu sehen sind. */
  backToSetup(): void {
    this.state.set(initialState(this.teams(), 'teams'));
  }

  goToTeams(): void {
    this.patch(() => ({ phase: 'teams' }));
  }

  goToPrepare(): void {
    this.patch(() => ({ phase: 'prepare' }));
  }

  private patchBet(id: TeamId, change: Partial<Bet>): void {
    this.patch((s) => ({ bets: { ...s.bets, [id]: { ...s.bets[id]!, ...change } } }));
  }

  private patch(fn: (s: GameState) => Partial<GameState>): void {
    this.state.update((s) => ({ ...s, ...fn(s) }));
  }
}

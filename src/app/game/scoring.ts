import { Bet, Bets, MercyRule, Question, Team, TeamId, TeamOutcome } from './models';

/**
 * Auswahlfrage: richtiger Tipp verdoppelt den Einsatz, falscher Tipp kostet ihn.
 */
export function scoreChoice(bets: Bets, correctIndex: number): TeamOutcome[] {
  return entries(bets).map(([teamId, { amount, answer }]) => {
    const factor = answer === correctIndex ? 2 : 0;
    return { teamId, bet: amount, answer, factor, delta: amount * factor - amount };
  });
}

/**
 * Schätzfrage: Alle Teams mit Tipp werden nach Abstand zum richtigen Wert verglichen.
 * Das nächste Team bekommt den doppelten Einsatz (Faktor 2), das entfernteste verliert
 * ihn (Faktor 0), alle dazwischen linear nach ihrem Abstand. Liegen alle gleich weit weg,
 * bekommen alle Faktor 2.
 */
export function scoreEstimate(bets: Bets, correctValue: number): TeamOutcome[] {
  const distances = new Map<TeamId, number>();
  for (const [teamId, { answer }] of entries(bets)) {
    if (answer !== null) {
      distances.set(teamId, Math.abs(answer - correctValue));
    }
  }
  const all = [...distances.values()];
  const dMin = Math.min(...all);
  const dMax = Math.max(...all);

  return entries(bets).map(([teamId, { amount, answer }]) => {
    const distance = distances.get(teamId);
    if (distance === undefined) {
      return { teamId, bet: amount, answer, factor: 0, delta: -amount };
    }
    const factor = dMax === dMin ? 2 : round2((2 * (dMax - distance)) / (dMax - dMin));
    const rank = 1 + all.filter((d) => d < distance).length;
    return {
      teamId,
      bet: amount,
      answer,
      factor,
      delta: Math.round(amount * factor) - amount,
      distance,
      rank,
    };
  });
}

export function score(question: Question, bets: Bets, correct: number): TeamOutcome[] {
  return question.type === 'choice' ? scoreChoice(bets, correct) : scoreEstimate(bets, correct);
}

export interface RankedTeam {
  team: Team;
  place: number;
}

/** Platzierung nach Punkten, gleiche Punktzahl teilt sich den Platz. */
export function rankTeams(teams: readonly Team[]): RankedTeam[] {
  return [...teams]
    .sort((a, b) => b.points - a.points)
    .map((team) => ({ team, place: 1 + teams.filter((t) => t.points > team.points).length }));
}

/** Füllt Teams unter der Gnadengrenze auf und meldet, wer gerettet wurde. */
export function applyMercy(
  teams: readonly Team[],
  rule: MercyRule,
): { teams: Team[]; rescued: TeamId[] } {
  if (!rule.enabled || rule.points <= 0) {
    return { teams: [...teams], rescued: [] };
  }
  const rescued = teams.filter((t) => t.points < rule.points).map((t) => t.id);
  return {
    teams: teams.map((t) => (rescued.includes(t.id) ? { ...t, points: rule.points } : t)),
    rescued,
  };
}

function entries(bets: Bets): [TeamId, Bet][] {
  return Object.entries(bets) as [TeamId, Bet][];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

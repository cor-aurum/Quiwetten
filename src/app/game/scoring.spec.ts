import { Bets, Team } from './models';
import { applyMercy, rankTeams, scoreChoice, scoreEstimate } from './scoring';

function bets(partial: Partial<Bets>): Bets {
  const empty = { amount: 0, answer: null };
  return { red: empty, blue: empty, green: empty, yellow: empty, ...partial };
}

describe('scoring', () => {
  it('verdoppelt den Einsatz bei richtiger Auswahl und nimmt ihn bei falscher', () => {
    const result = scoreChoice(
      bets({ red: { amount: 30, answer: 1 }, blue: { amount: 20, answer: 0 } }),
      1,
    );
    expect(result.find((o) => o.teamId === 'red')!.delta).toBe(30);
    expect(result.find((o) => o.teamId === 'blue')!.delta).toBe(-20);
    expect(result.find((o) => o.teamId === 'green')!.delta).toBe(0);
  });

  it('wertet Schätzungen relativ zu den anderen Teams', () => {
    const result = scoreEstimate(
      bets({
        red: { amount: 10, answer: 100 },
        blue: { amount: 10, answer: 90 },
        green: { amount: 10, answer: 80 },
        yellow: { amount: 10, answer: 140 },
      }),
      100,
    );
    const byId = Object.fromEntries(result.map((o) => [o.teamId, o]));
    expect(byId['red'].factor).toBe(2);
    expect(byId['red'].delta).toBe(10);
    expect(byId['blue'].factor).toBe(1.5);
    expect(byId['blue'].delta).toBe(5);
    expect(byId['green'].factor).toBe(1);
    expect(byId['green'].delta).toBe(0);
    expect(byId['yellow'].factor).toBe(0);
    expect(byId['yellow'].delta).toBe(-10);
    expect(byId['yellow'].rank).toBe(4);
  });

  it('gibt allen Faktor 2, wenn alle gleich weit weg liegen', () => {
    const result = scoreEstimate(
      bets({ red: { amount: 10, answer: 90 }, blue: { amount: 5, answer: 110 } }),
      100,
    );
    expect(result.find((o) => o.teamId === 'red')!.delta).toBe(10);
    expect(result.find((o) => o.teamId === 'blue')!.delta).toBe(5);
    expect(result.find((o) => o.teamId === 'red')!.rank).toBe(1);
    expect(result.find((o) => o.teamId === 'blue')!.rank).toBe(1);
  });

  it('füllt Teams unter der Gnadengrenze auf', () => {
    const team = (id: Team['id'], points: number): Team => ({ id, name: id, emoji: '', points });
    const teams = [team('red', 0), team('blue', 7), team('green', 10), team('yellow', 80)];

    const result = applyMercy(teams, { enabled: true, points: 10 });
    expect(result.rescued).toEqual(['red', 'blue']);
    expect(result.teams.map((t) => t.points)).toEqual([10, 10, 10, 80]);

    expect(applyMercy(teams, { enabled: false, points: 10 }).rescued).toEqual([]);
  });

  it('wertet nur die mitspielenden Teams', () => {
    const result = scoreEstimate(
      { red: { amount: 10, answer: 50 }, blue: { amount: 10, answer: 70 } },
      55,
    );
    expect(result.map((o) => [o.teamId, o.delta])).toEqual([
      ['red', 10],
      ['blue', -10],
    ]);
  });

  it('teilt Plätze bei Punktgleichstand', () => {
    const team = (id: Team['id'], points: number): Team => ({ id, name: id, emoji: '', points });
    const ranked = rankTeams([team('red', 50), team('blue', 120), team('green', 50), team('yellow', 10)]);
    expect(ranked.map((r) => [r.team.id, r.place])).toEqual([
      ['blue', 1],
      ['red', 2],
      ['green', 2],
      ['yellow', 4],
    ]);
  });
});

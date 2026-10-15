import { parseQuizFile, toQuizFile } from './quiz-file';

describe('quiz-file', () => {
  it('exportiert Titel, Team-Text und Notizen ohne IDs und leere Materialzeilen', () => {
    const file = toQuizFile('Mein Quiz', 'Kinder gegen Eltern', [
      {
        id: 'x',
        type: 'estimate',
        text: 'Wie viele?',
        unit: 'Stück',
        description: 'Glas zeigen',
        materials: ['Glas', '', '  '],
      },
      { id: 'y', type: 'choice', text: 'A oder B?', options: ['A', 'B'], description: ' ' },
    ]);
    expect(file).toEqual({
      title: 'Mein Quiz',
      teamInfo: 'Kinder gegen Eltern',
      questions: [
        { type: 'estimate', text: 'Wie viele?', unit: 'Stück', description: 'Glas zeigen', materials: ['Glas'] },
        { type: 'choice', text: 'A oder B?', options: ['A', 'B'] },
      ] as never,
    });
  });

  it('liest das neue Format samt Notizen wieder ein', () => {
    const quiz = parseQuizFile(toQuizFile('Mein Quiz', 'Info', [
      { id: 'x', type: 'estimate', text: 'Wie viele?', unit: '', materials: ['Glas'] },
    ]));
    expect(quiz.title).toBe('Mein Quiz');
    expect(quiz.teamInfo).toBe('Info');
    expect(quiz.questions[0].materials).toEqual(['Glas']);
  });

  it('liest alte Exporte, die nur aus der Fragenliste bestehen', () => {
    const quiz = parseQuizFile([{ type: 'choice', text: 'A oder B?', options: ['A', 'B'] }]);
    expect(quiz.title).toBeUndefined();
    expect(quiz.questions.length).toBe(1);
  });
});

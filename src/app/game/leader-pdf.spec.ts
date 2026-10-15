import { jsPDF } from 'jspdf';
import { buildLeaderPdf, pdfText } from './leader-pdf';
import { DEFAULT_MERCY, Question } from './models';
import { SAMPLE_QUESTIONS } from './sample-questions';

describe('leader-pdf', () => {
  it('entfernt Zeichen, die die PDF-Schrift nicht kann, und behält Umlaute', () => {
    expect(pdfText('🎲 Großes Quiz – für Kinder 👨‍👩‍👧')).toBe('Großes Quiz – für Kinder');
  });

  it('enthält Fragen, Beschreibungen und Material', () => {
    const doc = buildLeaderPdf(new jsPDF({ unit: 'mm', format: 'a4' }), {
      title: 'Test-Quiz',
      teamInfo: 'Kinder gegen Eltern',
      mercy: DEFAULT_MERCY,
      questions: SAMPLE_QUESTIONS,
    });
    const raw = doc.output();
    expect(raw.startsWith('%PDF')).toBeTrue();
    expect(raw).toContain('Wie viele Gummib');
    expect(raw).toContain('Glas gut sichtbar');
    expect(raw).toContain('Bauklötze');
    expect(raw).toContain('Packliste');
  });

  it('bricht viele lange Fragen auf mehrere Seiten um', () => {
    const long: Question[] = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      type: 'estimate',
      text: `Frage ${i} `.repeat(20),
      unit: 'cm',
      description: 'Beschreibung '.repeat(30),
      materials: ['Stift', 'Papier'],
    }));
    const doc = buildLeaderPdf(new jsPDF({ unit: 'mm', format: 'a4' }), {
      title: 'Lang',
      teamInfo: '',
      mercy: DEFAULT_MERCY,
      questions: long,
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(5);
  });
});

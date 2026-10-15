import type { jsPDF } from 'jspdf';
import { MercyRule, Question } from './models';
import { cleanMaterials, packingList, slug } from './quiz-file';

export interface LeaderPdfData {
  title: string;
  teamInfo: string;
  mercy: MercyRule;
  /** Fragen in Spielreihenfolge, also nur die spielbaren. */
  questions: readonly Question[];
}

type Rgb = [number, number, number];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const WIDTH = PAGE_W - 2 * MARGIN;
const FOOTER = 10;

const INK: Rgb = [45, 42, 74];
const MUTED: Rgb = [110, 106, 140];
const PURPLE: Rgb = [138, 92, 255];
const PINK: Rgb = [255, 122, 198];
const YELLOW: Rgb = [255, 224, 102];
const LINE: Rgb = [221, 211, 255];
const LETTERS = 'ABCDEFGH';

/** Lädt jsPDF erst bei Bedarf und lädt die Übersicht für die Spielleitung herunter. */
export async function downloadLeaderPdf(data: LeaderPdfData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = buildLeaderPdf(new jsPDF({ unit: 'mm', format: 'a4' }), data);
  doc.save(`${slug(data.title)}-spielleitung.pdf`);
}

/** Schreibt Titel, Packliste und alle Fragen samt Beschreibung und Material in das Dokument. */
export function buildLeaderPdf(doc: jsPDF, data: LeaderPdfData): jsPDF {
  const w = new Writer(doc);

  // Kopf
  doc.setFillColor(...PURPLE);
  doc.roundedRect(MARGIN, MARGIN, WIDTH, 22, 4, 4, 'F');
  w.font(20, 'bold', [255, 255, 255]);
  doc.text(pdfText(data.title), MARGIN + 6, MARGIN + 10, { maxWidth: WIDTH - 12 });
  w.font(10, 'normal', [255, 255, 255]);
  doc.text(
    `Übersicht für die Spielleitung · ${data.questions.length} Fragen · Stand ${new Date().toLocaleDateString('de-DE')}`,
    MARGIN + 6,
    MARGIN + 17,
  );
  w.y = MARGIN + 30;

  if (data.teamInfo.trim()) {
    w.heading('Teams');
    w.paragraph(data.teamInfo);
  }

  w.heading('Spielregeln (Kurzfassung)');
  w.bullet('Jedes Team startet mit 100 Punkten und setzt pro Frage einen Teil davon.');
  w.bullet('Auswahlfrage: richtig = Einsatz verdoppelt, falsch = Einsatz weg.');
  w.bullet(
    'Schätzfrage: das nächste Team bekommt den Einsatz x 2, das entfernteste x 0, alle anderen je nach Abstand dazwischen.',
  );
  if (data.mercy.enabled) {
    w.bullet(
      `Rettungsring: Wer vor einer Frage unter ${data.mercy.points} Punkten liegt, wird auf ${data.mercy.points} aufgefüllt.`,
    );
  }

  const packing = packingList(data.questions);
  if (packing.length > 0) {
    w.heading('Packliste');
    for (const item of packing) {
      w.checkItem(item.name, `Frage ${item.questions.join(', ')}`);
    }
  }

  data.questions.forEach((q, i) => w.question(q, i + 1));

  footer(doc, data.title);
  return doc;
}

class Writer {
  y = MARGIN;

  constructor(private readonly doc: jsPDF) {}

  font(size: number, style: 'normal' | 'bold' | 'italic', color: Rgb = INK): void {
    this.doc.setFont('helvetica', style);
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
  }

  /** Neue Seite, falls `height` mm nicht mehr auf die aktuelle passen. */
  ensure(height: number): void {
    if (this.y + height > PAGE_H - MARGIN - FOOTER) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  heading(text: string): void {
    this.ensure(16);
    this.y += 4;
    this.font(14, 'bold', PURPLE);
    this.doc.text(pdfText(text), MARGIN, this.y + 5);
    this.y += 9;
  }

  /** Umbrechender Text mit Seitenumbruch; Zeilenumbrüche im Text bleiben erhalten. */
  lines(
    text: string,
    opts: { size?: number; style?: 'normal' | 'bold' | 'italic'; color?: Rgb; indent?: number } = {},
  ): void {
    const size = opts.size ?? 11;
    const indent = opts.indent ?? 0;
    this.font(size, opts.style ?? 'normal', opts.color ?? INK);
    const lineHeight = size * 0.3528 * 1.35;
    for (const paragraph of pdfText(text).split('\n')) {
      const wrapped: string[] = this.doc.splitTextToSize(paragraph || ' ', WIDTH - indent);
      for (const line of wrapped) {
        this.ensure(lineHeight);
        this.doc.text(line, MARGIN + indent, this.y + lineHeight * 0.78);
        this.y += lineHeight;
      }
    }
  }

  paragraph(text: string): void {
    this.lines(text);
    this.y += 2;
  }

  bullet(text: string): void {
    this.ensure(6);
    this.doc.setFillColor(...PINK);
    this.doc.circle(MARGIN + 1.5, this.y + 2.6, 1, 'F');
    this.lines(text, { indent: 6 });
    this.y += 1;
  }

  checkItem(text: string, hint?: string, indent = 0): void {
    this.ensure(7);
    this.doc.setDrawColor(...INK);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(MARGIN + indent, this.y + 0.6, 3.8, 3.8, 0.6, 0.6, 'S');
    const start = this.y;
    this.lines(text, { indent: indent + 7 });
    if (hint) {
      // Hinweis hinter einzeilige Einträge setzen, sonst in eine eigene Zeile
      this.font(11, 'normal');
      const x = MARGIN + indent + 7 + this.doc.getTextWidth(pdfText(text)) + 2;
      this.font(9, 'normal', MUTED);
      const label = `(${pdfText(hint)})`;
      if (this.y - start < 6 && x + this.doc.getTextWidth(label) < PAGE_W - MARGIN) {
        this.doc.text(label, x, start + 4.1);
      } else {
        this.lines(label, { size: 9, color: MUTED, indent: indent + 7 });
      }
    }
    this.y += 1.2;
  }

  question(q: Question, number: number): void {
    // Kopf der Frage nicht allein am Seitenende stehen lassen
    this.ensure(34);
    this.y += 5;
    this.doc.setDrawColor(...LINE);
    this.doc.setLineWidth(0.6);
    this.doc.line(MARGIN, this.y, PAGE_W - MARGIN, this.y);
    this.y += 5;

    this.doc.setFillColor(...PINK);
    this.doc.circle(MARGIN + 4.5, this.y + 4.5, 4.5, 'F');
    this.font(12, 'bold', [255, 255, 255]);
    this.doc.text(String(number), MARGIN + 4.5, this.y + 6.2, { align: 'center' });

    this.font(9, 'bold', MUTED);
    this.doc.text(q.type === 'choice' ? 'AUSWAHLFRAGE' : 'SCHÄTZFRAGE', MARGIN + 13, this.y + 3);
    this.y += 4.5;
    const top = this.y;
    this.lines(q.text, { size: 13, style: 'bold', indent: 13 });
    this.y = Math.max(this.y, top + 5) + 2;

    if (q.type === 'choice') {
      q.options.forEach((option, i) => this.checkItem(`${LETTERS[i]}   ${option}`, undefined, 13));
      this.small('Richtige Antwort ankreuzen, sobald sie feststeht.', 13);
    } else {
      this.ensure(9);
      this.font(11, 'normal');
      const label = 'Richtiges Ergebnis:';
      this.doc.text(label, MARGIN + 13, this.y + 4.5);
      const x = MARGIN + 13 + this.doc.getTextWidth(label) + 3;
      this.doc.setDrawColor(...INK);
      this.doc.setLineWidth(0.3);
      this.doc.line(x, this.y + 5.2, x + 45, this.y + 5.2);
      if (q.unit.trim()) {
        this.doc.text(pdfText(q.unit), x + 48, this.y + 4.5);
      }
      this.y += 8;
    }

    if (q.description?.trim()) {
      this.label('Beschreibung', 13);
      this.lines(q.description, { indent: 13 });
    }

    const materials = cleanMaterials(q.materials);
    if (materials.length > 0) {
      this.label('Material', 13);
      materials.forEach((m) => this.checkItem(m, undefined, 13));
    }
  }

  private label(text: string, indent: number): void {
    this.ensure(10);
    this.y += 2;
    this.doc.setFillColor(...YELLOW);
    this.font(9, 'bold');
    const width = this.doc.getTextWidth(text) + 4;
    this.doc.roundedRect(MARGIN + indent, this.y, width, 5, 1.5, 1.5, 'F');
    this.doc.text(text, MARGIN + indent + 2, this.y + 3.6);
    this.y += 6.5;
  }

  private small(text: string, indent: number): void {
    this.lines(text, { size: 9, style: 'italic', color: MUTED, indent });
  }
}

function footer(doc: jsPDF, title: string): void {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(pdfText(title), MARGIN, PAGE_H - MARGIN + 4);
    doc.text(`Seite ${i} von ${pages}`, PAGE_W - MARGIN, PAGE_H - MARGIN + 4, { align: 'right' });
  }
}

/** Zeichen, die die PDF-Standardschrift (WinAnsi) zusätzlich zu Latin-1 kennt. */
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

/**
 * Die eingebaute Helvetica kann nur WinAnsi. Emojis und andere Zeichen würden als
 * Zeichensalat erscheinen und werden deshalb entfernt.
 */
export function pdfText(text: string): string {
  return [...text]
    .filter((c) => c === '\n' || (c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 256) || WIN_ANSI_EXTRA.has(c))
    .join('')
    .trim();
}

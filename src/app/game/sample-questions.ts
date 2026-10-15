import { Question } from './models';

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'sample-1',
    type: 'estimate',
    text: 'Wie viele Gummibärchen sind in dem Glas?',
    unit: 'Stück',
    description:
      'Glas gut sichtbar in die Mitte stellen. Nach dem Setzen zählen alle gemeinsam laut nach.',
    materials: ['Großes Glas mit Deckel', 'Gummibärchen (2–3 Tüten)'],
  },
  {
    id: 'sample-2',
    type: 'choice',
    text: 'Wer gewinnt das Wettrennen um den Garten: Papa oder Oma?',
    options: ['Papa', 'Oma', 'Unentschieden'],
  },
  {
    id: 'sample-3',
    type: 'estimate',
    text: 'Wie viele Sekunden kann Tante Anna auf einem Bein stehen?',
    unit: 'Sekunden',
  },
  {
    id: 'sample-4',
    type: 'choice',
    text: 'Auf welche Seite fällt das Marmeladenbrot?',
    options: ['Marmeladenseite', 'Trockene Seite', 'Es bleibt auf der Kante stehen'],
  },
  {
    id: 'sample-5',
    type: 'estimate',
    text: 'Wie viele Bauklötze hoch wird der Turm, bevor er umfällt?',
    unit: 'Klötze',
    description: 'Ein Kind baut, alle zählen mit. Nur ein Versuch!',
    materials: ['Bauklötze', 'Glatte Unterlage'],
  },
  {
    id: 'sample-6',
    type: 'choice',
    text: 'Welche Farbe hat das erste Auto, das am Fenster vorbeifährt?',
    options: ['Schwarz', 'Weiß / Silber', 'Rot', 'Eine andere Farbe'],
  },
];

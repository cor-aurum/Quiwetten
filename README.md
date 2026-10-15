# Das große Wett-Quiz

Ein Angular-Spiel für 2 bis 8 Teams (einstellbar auf der Startseite), das komplett im Browser läuft (kein Backend). Fragen und
Spielstand werden im `localStorage` gespeichert.

## Starten

```bash
npm install
npm start          # http://localhost:4200
npm run build      # statische Dateien nach dist/wett-quiz/browser
npm test
```

Den Inhalt von `dist/wett-quiz/browser` kann man auf jeden statischen Webserver legen
(z. B. `npx http-server dist/wett-quiz/browser`). Per Doppelklick als `file://` öffnen
funktioniert wegen der ES-Module nicht.

## Deployment auf GitHub Pages

Der Workflow `.github/workflows/deploy.yml` testet und baut die App bei jedem Push auf `main`
und veröffentlicht sie auf GitHub Pages. Manuell starten geht unter Actions → „Deploy to GitHub
Pages“ → „Run workflow“.

Einmalig im Repository einstellen: **Settings → Pages → Build and deployment → Source:
„GitHub Actions“**. Danach ist die App unter `https://<benutzer>.github.io/<repository>/`
erreichbar. Weil `<base href="./">` relativ ist, funktioniert das unter jedem Repository-Namen.

## Ablauf

1. **Vorbereitung** (nur für die Spielleitung): Titel, optionaler Text zur Teamzusammensetzung,
   Rettungsring und Fragen. Jede Frage kann eine Beschreibung und eine Materialliste haben; beides
   taucht im Spiel nicht auf. Unten steht eine Packliste mit dem Material aller Fragen.
   „📄 PDF für die Spielleitung“ erzeugt eine druckbare Übersicht mit Regeln, Packliste und allen
   Fragen samt Beschreibung, Material und Feldern zum Ankreuzen/Eintragen der richtigen Antwort.
   Die Nummern entsprechen der Reihenfolge im Spiel (unfertige Fragen fehlen). jsPDF wird erst
   beim Klick nachgeladen.
2. **Teams** (kann allen gezeigt werden, keine Fragen sichtbar): Text zur Teamzusammensetzung groß,
   Anzahl, Namen und Maskottchen der Teams, Spielregeln.
3. **Spiel** und **Siegerehrung**. „Spiel beenden“ führt zurück zur Team-Seite.

## Regeln

- Jedes Team startet mit 100 Punkten.
- Pro Frage setzt jedes Team Punkte (0 bis zum eigenen Punktestand) und gibt einen Tipp ab.
- Die Spielleitung trägt das richtige Ergebnis erst ein, wenn es feststeht.
- **Auswahlfrage:** richtig = Einsatz verdoppelt, falsch = Einsatz weg.
- **Schätzfrage:** Alle Teams mit Tipp werden nach Abstand verglichen. Das nächste Team
  bekommt den Einsatz × 2, das entfernteste × 0, alle dazwischen linear nach Abstand
  (`Faktor = 2 · (dMax − d) / (dMax − dMin)`). Liegen alle gleich weit weg, gibt es für alle × 2.
  Teams ohne Einsatz zählen beim Vergleich trotzdem mit.
- **Rettungsring (Gnadenregel):** Wer vor einer neuen Frage weniger als 10 Punkte hat, wird auf
  10 aufgefüllt. Grenze und An/Aus lassen sich auf der Startseite einstellen. Vor der
  Siegerehrung wird nicht mehr aufgefüllt.

Die Wertung steckt in `src/app/game/scoring.ts`.

## Fragen-Format (Import/Export)

Der Export enthält Titel, Text zur Teamzusammensetzung und die Fragen. `teamInfo`,
`description` und `materials` sind optional:

```json
{
  "title": "Das große Wett-Quiz",
  "teamInfo": "In jedem Team ist mindestens ein Kind und ein Erwachsener.",
  "questions": [
    { "type": "choice", "text": "Wer gewinnt?", "options": ["Papa", "Oma"] },
    {
      "type": "estimate",
      "text": "Wie viele Gummibärchen?",
      "unit": "Stück",
      "description": "Glas in die Mitte stellen, danach gemeinsam zählen.",
      "materials": ["Großes Glas", "Gummibärchen"]
    }
  ]
}
```

Ältere Exporte, die nur aus der Fragenliste bestehen, lassen sich weiterhin importieren;
der Titel bleibt dann unverändert.

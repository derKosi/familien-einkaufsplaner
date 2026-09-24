---
doc: scope
status: approved
---

# Familien-Einkaufsplaner (Arbeitstitel)

Ein Planer, der aus den echten Wochenangeboten eines Discounters (Penny) einen Essensplan für den ganzen Haushalt baut — mit Einkaufsliste inklusive Mengen für einen einzigen Einkauf.

## The Unique Kernel
Ein Haushalt, ein Plan, ein Einkauf — aber die Personen darin sind unterschiedlich: Maelle (16) isst vegetarisch, Gustav (33) verträgt keine Milch, Verso will mit Kalorienblick abnehmen. Der Plan löst diese Einschränkungen *gleichzeitig* auf, aus echten aktuellen Angeboten, mit konkreten Produkten und Mengen — kein „kauf Karotten", sondern *was*, *wieviel*, *für welche Rezepte*, *zu welchem Preis*. Nebenbei ist der Plan die Verschwendungsprävention: exakte Mengen bedeuten, nichts verdirbt mehr, weil falsch geplant wurde. Kein bestehender Tool verbindet Prospektdaten + personenbezogene Einschränkungen + eine gemeinsame Einkaufsliste.

## Who It's For
Die Demo-Familie: Lune und Verso mit Gustav (33) und Maelle (16). Sie wollen *einen* Wocheneinkauf bei einem Discounter statt hedonistischem Einzelteil-Einkauf oder HelloFresh-Preisen. Der Erbauer selbst ist auch Nutzer: berufstätig (08:00–19:00), kauft donnerstags nach der Arbeit ein, will sonntags wissen, was gekocht wird, und braucht unter der Woche schnell zubereitbare Gerichte. Keine Zeit für aufwendiges Kochen, keine Lust auf Einkaufschaos.

## The Core Loop
Einmal pro Woche: Angebote des gewählten Discounters werden geholt → der Planer baut einen Essensplan für die Woche, der alle Personen und Einschränkungen des Haushalts erfüllt → der Nutzer prüft ihn, passt an (z. B. „Samstag Grillabend mit 5 Nachbarn" einplanen oder „Dienstag/Mittwoch aussetzen") → bekommt die finale Einkaufsliste mit Mengen für den einen Einkauf. Unter der Woche schlägt er nach: Was kocht heute, was ist schnell?

## Inspiration & Identity
Kein explizites Design-Referenzprojekt genannt. Angesetzt: pragmatisch und nüchtern wie ein Discounter-Prospekt, schnell erfassbar nach einem 11-Stunden-Arbeitstag. HellFresh explizit als Preis-Antiheld; Yazio als „ich muss alles selbst eintragen"-Antiprinzip. Tonalität: Ernährung wird behandelt, nicht gepredigt — Kalorien erscheinen dezent pro Person, keine Moralpredigten, Rücksicht auf sensible Vorgeschichten (in der Demo-Familie z. B. eine überwundene Essstörung).

## Why This Matters to the Learner
Er will den eigenen Wocheneinkaufsstress wegoptimieren — hungrig einkaufen mit Pizzen im Warenkorb soll die Vergangenheit sein. Und er will sehen, wie weit spec-driven AI-coding heute kommt: „wie weit es mittlerweile ist und ob es wirklich brauchbare Resultate gibt."

## What "Working" Looks Like
Die 60-Sekunden-Demo: Planer öffnen → Wochenplan für die 4-köpfige Familie sichtbar, jedes Gericht auflösbar in Zutaten mit Mengen → Profil-Umschalter zeigt: Maelles Gericht ist vegetarisch, Gustavs Milchprodukte sind ersetzt, und Versos Kalorienziel ist mit seinem geschätzten Verbrauch aus dem Profil eingerechnet → „Grillabend Samstag, 5 Personen" als Event ergänzt → der Plan und die Einkaufsliste aktualisieren sich → die Liste basiert nachweislich auf echten, aktuellen Angeboten mit Preisen. Der „oh, das ist cool"-Moment: Die Einkaufsliste enthält ein konkretes Aktionsprodukt in genau der Menge, die die Rezepte der Woche brauchen.

## The POC Boundary
**In:** Ein Haushalt (Familie: Lune, Verso, Gustav, Maelle mit den genannten Einschränkungen), pro Person ein optionales Kalorienziel — der Plan rechnet es ein. Beim Anlegen einer Person liefern einfache Onboarding-Fragen (u. a. Beruf/Alltag, wie aktiv ist der Tag) einen geschätzten Tagesverbrauch, der mit in die Kalorienbilanz fließt. Plan für eine Woche. Events/Ausnahmen als einfaches Werkzeug (ein Tag aussetzen oder ein Event-Gericht ergänzen — z. B. der Grillabend mit den Nachbarn). Echte Angebotsdaten von Penny über deren REST/JSON-Angebots-API (Aktualität mindestens eine echte Momentaufnahme der laufenden Woche). Einkaufsliste mit Mengen und Preisen. Profil-Umschalter statt Login (Mama / Papa / Kind-Ansicht). Einschränkungen werden dezent behandelt, nicht gepredigt (siehe Tonalität). Ein fester Haushalt, keine Mandanten-Verwaltung.

## Later
Echte Logins pro Familienmitglied in einem Tenant (gemeinsamer Speicher). Mehrwöchige, flexibel wiederholbare Pläne. Küchenbestand („was ist noch da?"). Saisonale/thematische Rezeptvielfalt als eigenes Feature. Fitness-/Trainingstagebücher pro Person mit detailliertem Tracking (Reps, Gewichte) — der grobe Tagesverbrauch kommt stattdessen schon im PoC aus dem Onboarding-Profil. Küchen-Ausstattungsprofil (was ist verfügbar → Rezeptpool); der PoC nimmt eine normale Vollküche an. Garten-/Überschuss-Einbindung (z. B. eigene Tomaten in den Plan). Resteverwertung als eigenes Feature — die exakten Mengen des PoC sind die erste Stufe der Verschwendungsprävention. Weitere Zielgruppen: z. B. ältere Paare (~70), die gern kochen und mehr Abwechslung wollen. Non-Food (Putzmittel).

## Explicitly Cut
- **Mehrere Läden vergleichen:** Der Wert ist *ein* Laden, *ein* Einkauf — Preisvergleich über Ketten würde PoC und Kernidee sprengen.
- **Login/Authentifizierung:** Beweist den Kernel nicht; der Profil-Umschalter zeigt die Mehrpersonen-Idee im Video. Echte Logins im Tenant kommen später.
- **HelloFresh-artige Kochbox-Funktionen:** Kein Liefermodell, kein Abo — Preise aus dem Prospekt sind der Gegenentwurf.

---
doc: prd
status: approved
---

# Familien-Einkaufsplaner (Arbeitstitel) — Product Requirements

Ein Planer, der aus echten Wochenangeboten eines Discounters einen Essensplan für den ganzen Haushalt baut — mit Einkaufsliste inklusive Mengen für einen einzigen Einkauf. Für Familien mit unterschiedlichen Ernährungsbedürfnissen unter einem Dach.
Quelle: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`.

## The Core Journey

1. **Erstes Öffnen, leere App:** Zwei Wege sichtbar — „Mit Demo-Familie testen" (Haushalt „Expedition 33" vorbefüllt) oder „Eigenen Haushalt anlegen". Quelle: `scope.md > What "Working" Looks Like`.
2. **Haushalt anlegen, Person für Person:** Name, Rolle, Ernährungseinschränkungen, optional Kalorienziel; einfache Onboarding-Fragen (Beruf/Alltag, wie aktiv ist der Tag) liefern den geschätzten Tagesverbrauch. Jede Frage ist überspringbar („Skip/Later") — die Person existiert dann unvollständig und bleibt editierbar. Quelle: `scope.md > The POC Boundary`.
3. **Laden wählen & Plan erzeugen:** Penny (weitere Ketten vorbereitet), pro Woche wählbar. Angebote werden geholt; der Plan für eine Woche entsteht und löst alle Einschränkungen gleichzeitig auf — nach dem konfigurierbaren Mahlzeitenmuster des Haushalts (mit guten Defaults). Quelle: `scope.md > The Core Loop`.
4. **Prüfen & anpassen:** Event hinzufügen („Grillabend Samstag, 5 Personen" — Gerichtvorschläge bewusst aus den aktuellen Angeboten) oder Tage aussetzen. Plan und Einkaufsliste aktualisieren sich sofort. Quelle: `scope.md > The POC Boundary` (Events/Ausnahmen).
5. **Der eine Einkauf:** Einkaufsliste nach Ladenabteilungen gruppiert, Produkte mit Menge, Preis und Angebots-Badge, abhakbar mit Fortschritt.
6. **Unter der Woche:** „Next Meal"-Karte zeigt das nächste Essen und wie viele Mahlzeiten vorbereitet sind; Tagesdetail zeigt, was schnell kochbar ist.

**Erfolg** ist die 60-Sekunden-Demo aus `scope.md > What "Working" Looks Like`: Wochenplan sichtbar, Profil-Umschalter zeigt Maelle vegetarisch / Gustav milchfrei / Versos Kalorienbilanz, Grillabend wird ergänzt, Liste aktualisiert sich, Preise aus echten aktuellen Angeboten.

## Screens and Layout

Vier Oberflächen, keine weiteren:

1. **Hauptbildschirm** (von oben nach unten):
   - Kopfzeile: Haushaltsname („Familie Expedition 33"), **Ladenwahl** (Penny, pro Woche), dezenter Indikator „Plan basiert auf N aktuellen Angeboten".
   - **„Next Meal"-Hero-Karte:** nächstes geplantes Essen, für wie viele Personen, Zähler „X Mahlzeiten vorbereitet" (Meal-Prep-Status).
   - **Wochenstreifen:** 7 Tageskarten Mo–So, heute hervorgehoben; pro Tag Mahlzeiten-Chips (F/M/A) und Event-Marker (Grillabend-Icon). Tipp auf einen Tag → Tagesdetail.
   - **Einkaufslisten-Button**, prominent als Auszahlung der App.
2. **Tagesdetail:** Gerichte des Tages, wer mitisst, „schnell kochbar"-Flag, Einstiegspunkt für Event hinzufügen / Tag aussetzen.
3. **Einkaufsliste:** Zeile = Produkt × Menge (z. B. „500 g Hackfleisch", „2× Zucchini") × Preis × Angebots-Badge; gruppiert nach Ladenabteilung (Obst & Gemüse, Fleisch, Milchprodukte, Trockenware); Abhaken mit Fortschrittsanzeige.
4. **Onboarding & Einstellungen:** Person-für-Person-Flow mit Skip/Later; Einstellungen im PoC nur: Personen editieren und Wochenmuster ändern.

## Look and Feel

- **Light / Dark / System**, umschaltbar.
- **Personenbezogenes Pastell-Theming:** jede Person wählt eine Main+Akzent-Farbkombination (Pastell, nicht knallig); der Profil-Umschalter färbt die Ansicht, sodass sofort klar ist, ob man als Verso oder Maelle schaut.
- **Discounter-Farben nur als Akzent** an den Angebots-Badges der Einkaufsliste — nicht als Primärfarben.
- **Schrift:** Option für große Schrift (Lesbarkeit); Option „wenig Animation".
- **Keine Instagram-Effekte:** keine Hintergrundvideos oder Zier-Animationen — praktisch, nüchtern wie ein Discounter-Prospekt, schnell erfassbar nach einem 11-Stunden-Tag (aus `scope.md > Inspiration & Identity`).
- **Tonalität:** Ernährung wird behandelt, nicht gepredigt — Kalorien dezent pro Person, Rücksicht auf sensible Vorgeschichten (aus `scope.md > Inspiration & Identity`).

## Features and Behavior

### Haushalt & Personen

- Anlegen Person für Person; jede Person: Name, Rolle, Einschränkungen (z. B. vegetarisch, laktoseintolerant), optional Kalorienziel, Aktivitätsangaben (Beruf/Alltag) → geschätzter Tagesverbrauch.
- Skip/Later erlaubt: Person existiert mit Lücken, wird als „unvollständig" markiert, jederzeit editierbar.
- Demo-Haushalt „Expedition 33" vorbefüllt: Lune und Verso (Eltern), Gustav (33), Maelle (16); Maelle vegetarisch, Gustav laktoseintolerant, Verso mit Kalorienziel.
- Profil-Umschalter (Lune/Verso/Gustav/Maelle) wechselt die Ansicht und das Farbschema — Ansicht ohne Login.

### Wochenplan

- Eine Woche, erzeugt aus dem konfigurierbaren Mahlzeitenmuster des Haushalts. Defaults pro Haushaltstyp; E33-Default: werktags Frühstück (to go) + Abendessen für alle, Eltern zusätzlich Mittag (to go), samstags nur Mittag, sonntags alle drei Mahlzeiten.
- Der Plan respektiert: Personen-Einschränkungen, Kalorienziele inkl. Verbrauchsschätzung, Abwechslung (nicht jeden Tag dasselbe), „schnell kochbar"-Kennzeichnung für Werktage.
- **Gemeinsame Gerichte bleiben der Normalfall (Checkpoint-Entscheidung):** Das Basisgericht richtet sich nach dem Tisch, nicht nach der stärksten Einschränkung — Abweichungen (z. B. eine vegetarische Portion, Sahne durch Haferdrink ersetzt) stehen als konkrete Anpassung pro Person am Gericht. Nicht der ganze Tisch isst vegetarisch, nur weil eine Person es ist.
- Mahlzeiten werden beim Zubereiten abgehakt — manuell, weil es beim Kochen auch mal schiefgeht; der Zähler zählt nur Abgehaktes und startet mit jedem neuen Plan bei null.
- Regenerieren ist möglich (neue Angebote → neuer Plan), ersetzt aber sichtbar den bestehenden Plan.
- **Planen und Einkaufen sind entkoppelte Rollen:** Lune plant am Mittwoch, Verso kauft donnerstagmorgens ein — der Profil-Umschalter macht beide Sichten möglich, ohne zweite Logins.

### Events & Ausnahmen

- Tipp auf einen Tag → „Event hinzufügen": Personenanzahl (z. B. 5 Nachbarn), Gerichtvorschläge **aus den aktuellen Angeboten** — freie Eingabe ist auch möglich.
- Nach Bestätigung skalieren sich Plan und Einkaufsliste (z. B. Samstag-Abendessen +5 Portionen).
- „Tag aussetzen": Tage abwählen, betroffene Mahlzeiten und Listenpositionen entfallen.

### Einkaufsliste

- Automatisch aus den Rezepten der Woche aggregiert: gleiche Zutaten über mehrere Rezepte werden zu einer Position zusammengefasst („500 g Hackfleisch" statt 2× 250 g).
- Menge, Preis, Angebots-Badge; Gruppierung nach Ladenabteilung; Abhaken mit Fortschritt für den realen Einkauf.

### Angebots-Basis

- „Plan basiert auf N aktuellen Angeboten" als sichtbarer Beleg für echte Daten.
- Stehendes Sortiment als Rückgrat: Discounter führen Kernprodukte fast immer; stehen keine aktuellen Angebotsdaten bereit, sagt die App es offen („Keine aktuellen Angebote für Penny gefunden") und bietet die letzte gespeicherte Angebotslage mit Datum an — nie still fingiert.

## States and Boundaries

- **Erstnutzung:** Zwei-Wege-Einstieg (Demo-Familie / eigener Haushalt); der Demo-Weg überspringt das Onboarding.
- **Unvollständige Person:** existiert, ist markiert, bleibt editierbar; der Plan arbeitet mit dem, was vorhanden ist.
- **Keine Angebotsdaten:** offene Meldung + Option „letzte Lage vom DD.MM. nutzen"; der Plan ist dann entsprechend gekennzeichnet.
- **Persistenz:** Haushalt, Personen, Plan, Liste und Abhak-Status überleben das Schließen der App — ein fester Haushalt, keine Konten.
- **Identität:** Profil-Umschalter ist Ansichtswechsel ohne Authentifizierung; nichts ist vor anderen Familienmitgliedern verborgen.
- **Tonalität als Grenze:** keine Ernährungs-Moral, keine Kalorien-Nag-Banner; Einschränkungen werden dezent behandelt.
- **Grundvorrat-Annahme:** Salz, Pfeffer, Öl, Essig und Standard-Gewürze werden im Haushalt vorausgesetzt und erscheinen nie automatisch auf der Einkaufsliste (das „Salz-Problem").

## Product Decisions

- **Person-für-Person-Onboarding mit Skip/Later** — Lernerscheidung; Modifizierbarkeit ist Pflicht, echtes Konto samt Übertragung bei Trennung später.
- **Demo-Familie „Expedition 33"** als PoC-Datenbasis; 2–3 weitere Demo-Haushalte in anderen Konstellationen für einen „echten" PoC später.
- **Mahlzeitenmuster einstellbar mit guten Defaults** — deckt Rentner (5 Mahlzeiten inkl. Snacks), Familie (3 Hauptmahlzeiten) und Solo-Dev (Abendessen + Wochenende) ab, ohne drei Produkte zu bauen.
- **Hauptbildschirm-Struktur** (Next-Meal-Hero, Wochenstreifen, Listen-CTA) — Vorschlag des Interviewers, vom Lerner bestätigt; Pantry/History/Sport/Gewicht bleiben „Später".
- **Event-Gerichte aus Angeboten vorschlagen UND freie Eingabe erlauben** — beides bestätigt.
- **Liste nach Abteilungen gruppiert, abhakbar** — bestätigt.
- **Pastell-Theming pro Person, Light/Dark/System, große Schrift, wenig Animation** — Lernerscheidung.
- **Offen statt versteckt bei fehlenden Angebotsdaten; stehendes Sortiment als Annahme** — Lernerscheidung.
- **Erster Eindruck praktisch, keine Hintergrund-Animationen/Videos** — explizit verworfen („wir sind kein Insta").

## What We're Building

- Zwei-Wege-Erststart (Demo-Haushalt vorbefüllt / eigener Haushalt per Person-Flow mit Skip/Later)
- Personenverwaltung (Einschränkungen, Kalorienziel + Verbrauchsschätzung, editierbar) mit personengebundenem Pastell-Theming
- Wochenplan-Generierung nach Mahlzeitenmuster aus echten Angeboten (Penny), mit Abwechslung und schnell-kochbar-Flags
- Events & Ausnahmen mit sofortiger Aktualisierung von Plan und Liste
- Einkaufsliste: aggregierte Mengen, Preise, Angebots-Badges, Abteilungsruppen, Abhaken
- Light/Dark/System, große-Schrift-Option, reduced-motion-Option
- Persistenter fester Haushalt, Profil-Umschalter ohne Auth

## Deferred From the POC

- **Konten & Tenant** (echte Logins pro Person, gemeinsamer Speicher, Konto-Übertragung bei Trennung) — der Profil-Umschalter zeigt die Mehrpersonen-Idee ohne Auth-Kosten.
- **Pantry/Küchenbestand** — inkl. der verknüpften **Favoriten pro Person**, die der Lerner als wichtig für später markiert hat.
- **History** alter Pläne — für den Beweis nicht nötig.
- **Sport-Tracking & Gewichtsverlauf** — der Verbrauch kommt im PoC aus dem Onboarding-Profil (Reps/Gewichte-Tracking wäre zu viel).
- **Weitere Demo-Haushalte** (2–3 Konstellationen) — Material für einen späteren „echten" PoC.
- **Haustierbedarf** (z. B. Katzenfutter) und andere Non-Food-/Vorrats-Positionen — stehendes Sortiment ohne Angebotslogik; gehört zur Non-Food-Erweiterung aus `scope.md > Later`.
- **Küchen-Ausstattungsprofil, Garten-Überschuss, Resteverwertung, saisonale/thematische Rezepte, mehrwöchige Pläne, Non-Food** — aus `scope.md > Later` übernommen.

## Non-Goals

- **Mehrere Läden vergleichen** — der Wert ist ein Laden, ein Einkauf (`scope.md > Explicitly Cut`).
- **Login/Authentifizierung** — beweist den Kernel nicht.
- **HelloFresh-Modell** (Lieferbox/Abo) — kein Liefermodell.
- **Ernährungs-Coaching oder -Moral** — Kalorien sind Information pro Person, kein Druckmittel.
- **Zier-Animationen/Hintergrundvideos** — praktisch schlägt Instagram.

## Open Questions

- **Rezept-Pool des PoC:** Woher kommen die Rezepte (Anzahl, Quellen, Tags wie vegetarisch/milchfrei/schnell)? Arbeitsannahme: ein kuratierter, kleiner Pool discounter-typischer Rezepte wird mit der App mitgeliefert. Muss zu Beginn von `4-spec` entschieden werden.
- **Beschaffung der echten Angebotsdaten** (Scraping vs. gepflegte echte Momentaufnahme) — als größte technische Entscheidung bewusst an `4-spec` verwiesen; blockiert die Produktdefinition nicht.
- **Projektname über „Familien-Einkaufsplaner (Arbeitstitel)" hinaus** — erst für `6-ship` (Demo-Video, Repo) relevant.
- **Monetarisierung („how do we make money")** — vom Lerner angesprochen und bewusst geparkt: kein PoC-Thema, kein Blocking für `4-spec`.

---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Grundgerüst läuft: Demo-Haushalt sichtbar und persistent**
  Becomes usable: `pnpm dev` startet App + API; „Mit Demo-Familie testen“ legt Expedition 33 an; Hauptbildschirm zeigt Haushaltsname und die 4 Personen als Profil-Umschalter mit Pastell-Farben; alles überlebt einen Server-Neustart (SQLite).
  Why now: Bootstrap lebt laut Regel im ersten nutzbaren Slice — und die Personen mit ihren Einschränkungen sind der Rohstoff des Kerns, plus früheste Stelle, an der sich das Persistenz-Schema bewährt oder nicht.
  PRD ref: `prd.md > The Core Journey` (Schritte 1–2), `prd.md > Screens and Layout` (Hauptbildschirm), `prd.md > States and Boundaries` (Persistenz, Identität)
  Spec ref: `spec.md > Components` (apps/web, Persistenz), `spec.md > Data Model`, `spec.md > File Structure`
  Build: Monorepo-Scaffold (pnpm Workspaces: apps/web Vite+React, apps/api Fastify, packages/shared zod), SQLite + Migration, `GET /api/state`, `POST /api/household/demo`, Profil-Umschalter mit Pastell-Paaren, Hauptbildschirm-Gerüst.
  Verify (mechanical): `pnpm dev` startet fehlerfrei; `curl` legt Demo-Haushalt an, `GET /api/state` liefert 4 Personen mit Constraints; API-Neustart → Personen weiterhin da.
  Learner check: App öffnen, Demo-Familie anlegen, Profil-Umschalter durchklicken (Ansicht und Farbe wechseln), API neu starten — Familie noch da?
  Commit: `Scaffold monorepo with demo household, person switcher, SQLite persistence`

- [x] **2. Planner-Risiko-Proof: Claude-Aufruf mit Schema-Zwang und PII-Filter**
  Becomes usable: Technische Naht mit lauffähigem Beweis: `pnpm planner:smoke` druckt einen validierten Wochenplan-Entwurf; Modell-/Preis-/SDK-Fragen aus dem Spec sind verifiziert und notiert.
  Why now: Einziger technischer Einzelschritt nach der Ausnahmeregel — der Spec markiert Anthropic-API-Details als unverifiziert; schlägt die Schema-Zwangsantwort anders aus als angenommen, muss sich der Plan jetzt ändern, bevor UI und Endpunkte darauf bauen.
  PRD ref: `prd.md > Features and Behavior > Wochenplan`
  Spec ref: `spec.md > Components` (llm/planner.ts, context-contract.ts), `spec.md > Decisions and Open Issues` (zu verifizieren), `spec.md > Important Failure Modes`
  Build: Anthropic SDK, Planner mit fester Antwortstruktur, zod-Validierung, max. 2 kontrollierte Retries, PII-Filter (GUIDs, Rollenklassen, Tags, Zahlen — keine Namen/Freitext), Fixture-Kontext (Mini-Rezepte/-Angebote), Smoke-Skript inkl. Miss-Log-Ausgabe.
  Verify (mechanical): `pnpm planner:smoke` endet grün mit validiertem Plan und druckt den tatsächlichen (pseudonymisierten) Kontext; Flash-Mock-Test führt die Invalid-Antwort-Route demonstrativ aus (Retry → Fehlermeldung, letzter guter Plan bleibt); verifizierte Modell-/Preis-Angabe ist im Spec notiert.
  Learner check: Smoke-Ausgabe ansehen: Erkennst du im gedruckten Kontext, dass Claude nur pseudonymisierte Personen sieht — keine Namen?
  Commit: `Add Claude planner smoke path with schema validation and PII filter`

- [x] **3. Echte Datenbasis: Angebots-Snapshots + Rezept-Pool sichtbar**
  Becomes usable: Die Kopfzeile zeigt „Plan basiert auf N aktuellen Angeboten (Stand …)“ mit echten Lidl-/Aldi-Aktionen; Rezept-Pool und Nährwert-Tabelle liegen als Datenbasis; fehlen Snapshots, meldet die App es ehrlich.
  Why now: Der Kernel verspricht echte Angebote — die reale Datenbasis ist die Beweisgrundlage für Slice 4 und selbst riskant (Web-Abzug im Build), also vor dem Plan, nicht danach.
  PRD ref: `prd.md > Features and Behavior > Angebots-Basis`, `prd.md > States and Boundaries` (keine Angebotsdaten)
  Spec ref: `spec.md > Components` (offers/store.ts, data/recipes.json), `spec.md > External Services and Dependencies`
  Build: Abzug von 20–30 realen Aktionen je Kette in `data/offers/*.json` (mit `fetchedAt`/`source`), `recipes.json` (~24 Rezepte mit Tags/Grammaturen), `nutrition.json`, `OfferSource.latest()/refresh()`, Header-Indikator + ehrliche Keine-Daten-Meldung.
  Verify (mechanical): Snapshot-Validierung gegen zod-Schema (Skript); UI zeigt echte Anzahl + Datum; Snapshot temporär entfernen → Meldung „Keine aktuellen Angebote …“ erscheint.
  Learner check: Kopfzeile: Erkennst du eine der Aktionen wieder — z. B. etwas, das diese Woche wirklich im Lidl-/Aldi-Prospekt steht?
  Commit: `Add real offer snapshots, recipe pool, offers indicator`

- [ ] **4. Wochenplan-Generierung Ende-zu-Ende — der Kernel**
  Becomes usable: Laden wählen → „Plan erstellen“ → 7 Tage nach E33-Muster mit Mahlzeiten-Chips, Einschränkungen respektiert, schnell-kochbar-Flags, Next-Meal-Karte; Regenerieren ersetzt sichtbar den Plan.
  Why now: Die Kernel-Regel: früh, nicht zuletzt — jetzt, wo Risiko (Slice 2) und Daten (Slice 3) stehen, beweist ein Aufruf die Kernidee.
  PRD ref: `prd.md > Features and Behavior > Wochenplan`, `prd.md > What "Working" Looks Like` (Demo-Schritte 1–2)
  Spec ref: `spec.md > Components` (planner.ts, routes), `spec.md > Data Model` (week_plan)
  Build: `POST /api/plan/generate { store }` mit Kontextvertrag, Persistenz des Plans, Wochenstreifen-UI (Tageskarten, F/M/A-Chips), Next-Meal-Karte mit Vorbereitet-Zähler.
  Verify (mechanical): Vitest: Plan-Schema-Validierung; `curl` generate → `GET /api/state` enthält 7 Tage; Skript-Assert: Maelles Mahlzeiten vegetarisch, Gustavs milchfrei, `basedOnOffers` > 0.
  Learner check: Plan generieren und gegen die Prüfkriterien lesen: Isst Maelle vegetarisch, Gustav milchfrei? Wirkt die Woche abwechslungsreich — oder doppelt sich was?
  Commit: `Generate weekly meal plan from real offers via validated LLM`

- [ ] **5. Einkaufsliste: aggregiert, abteilungsweise, abhakbar**
  Becomes usable: Einkaufslisten-Button → Liste gruppiert nach Ladenabteilungen, Mengen aus den Wochenrezepten aggregiert, Preise + Angebots-Badges, Abhaken bleibt persistiert.
  Why now: Die Liste ist die Auszahlung des Kerns („was × wieviel × Preis“) und steht komplett auf deterministischer Rechnung — die Tests beweisen das PRD-Versprechen „nachrechenbar“.
  PRD ref: `prd.md > Features and Behavior > Einkaufsliste`, `prd.md > What "Working" Looks Like` (Cool-Moment)
  Spec ref: `spec.md > Components` (domain/aggregation.ts), `spec.md > Data Model` (list_item)
  Build: `aggregation.ts` (Plan × Rezepte → Positionen: Gramm summieren, Stück zählen), Vitest-Fälle für Aggregation + kcal, `GET /api/shopping-list` bzw. Teil von `/state`, `PATCH /api/shopping-list/:itemId`, Listen-UI mit Abteilungsgruppen + Fortschritt.
  Verify (mechanical): Vitest grün, inkl. Fall „500 g Hackfleisch aus zwei Rezepten“ und kcal-Summen; UI-Gegenprobe: 2–3 Positionen handnachgerechnet gegen Plan-Rezepte.
  Learner check: Liste öffnen, 2–3 Positionen anhand der Rezepte nachrechnen, etwas abhaken, neu laden — Haken bleibt?
  Commit: `Deterministic shopping list with departments, prices, check-off`

- [ ] **6. Events & Ausnahmen — der Grillabend**
  Becomes usable: Tagesdetail: „Event hinzufügen“ (Personenanzahl, Gerichtvorschläge aus aktuellen Angeboten oder freie Eingabe) skaliert Plan und Liste sofort; „Tag aussetzen“ entfernt Mahlzeiten und Listenpositionen.
  Why now: Der Demomoment des Videos und der dynamische Teil des Kerns — setzt auf stabilen Plan und Liste auf, deshalb nach Slice 5.
  PRD ref: `prd.md > Features and Behavior > Events & Ausnahmen`, `prd.md > What "Working" Looks Like` (Demo-Schritt 3)
  Spec ref: `spec.md > Components` (routes plan/events, plan/exemptions), `spec.md > Data Model` (event)
  Build: `POST /api/plan/events` (Personenanzahl, Angebots-Vorschläge via Planner oder freie Eingabe), `POST /api/plan/exemptions`, Skalierung + Listen-Neuberechnung, Tagesdetail-UI, Event-Marker im Wochenstreifen.
  Verify (mechanical): Vitest/curl: Grillabend 5 Personen → Samstag-Abendessen auf 9 Portionen skaliert, Liste enthält Zusatzmengen, mind. 1 Event-Gericht trägt Angebotspreis; Di/Mi aussetzen → deren Positionen entfallen.
  Learner check: Grillabend am Samstag mit 5 Nachbarn anlegen — skaliert Plan und Liste? Danach Di+Mi aussetzen — schrumpft die Liste sichtbar?
  Commit: `Add events and day exemptions with list rescaling`

- [ ] **7. Eigener Haushalt: Person-für-Person-Onboarding + Einstellungen**
  Becomes usable: Der Zwei-Wege-Erststart ist komplett: eigener Haushalt anlegen, Personen einzeln mit Skip/Later (unvollständig markiert, editierbar), Einstellungen für Personen und Wochenmuster.
  Why now: Schließt Journey-Schritte 1–2 für echte Nutzer — braucht den stabilen Rest, ändert am Kern aber nichts; daher nach Kernel, Liste und Events.
  PRD ref: `prd.md > Features and Behavior > Haushalt & Personen`, `prd.md > Screens and Layout` (Onboarding & Einstellungen), `prd.md > States and Boundaries` (unvollständige Person)
  Spec ref: `spec.md > Components` (apps/web Onboarding, routes persons), `spec.md > Persistenz`
  Build: Onboarding-Flow Person für Person mit Skip/Later und Unvollständig-Markierung, `POST /api/persons` + `PATCH /api/persons/:id`, Wochenmuster-Editor, „Eigenen Haushalt anlegen“-Pfad.
  Verify (mechanical): curl: Person mit Lücken anlegen → als unvollständig markiert → patchen → vollständig; UI: Flow durchklicken; Plan-Generierung funktioniert mit unvollständiger Person.
  Learner check: Eigenen Haushalt anlegen, eine Person mit Skip anlegen, sie später in den Einstellungen vervollständigen, Wochenmuster ändern und neu planen.
  Commit: `Own-household onboarding with skip/later and settings`

- [ ] **8. Feinschliff + Auslieferung: Light/Dark/System, Optionen, Docker-Demo**
  Becomes usable: Die App erfüllt den Look-and-Feel-Vertrag (Light/Dark/System, große-Schrift-Option, wenig Animation, Prospekt-Nüchternheit, dezent bei Kalorien) und `docker compose up` liefert die Demo auf `:8080`.
  Why now: Polish nach Verhalten, nicht davor — und der Docker-Weg ist der Demo-Aufnahmepfad aus dem Spec, also der letzte Baustein.
  PRD ref: `prd.md > Look and Feel`, `prd.md > What "Working" Looks Like` (komplett)
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Look and Feel`, `spec.md > File Structure` (docker/)
  Build: Theme-Toggles + `prefers-color-scheme`/`prefers-reduced-motion`, große-Schrift-Option, dezenten Kalorienzeilen, UI-Polish-Pass entlang des Specs, Dockerfile + compose.yaml (data-Mount) + README.
  Verify (mechanical): `docker compose up` → `:8080` lädt; Kern-Journey im Container durchspielbar (seed → plan → Liste → Event); Theme-Toggles greifen (sichtbarer Style-Wechsel).
  Learner check: Die komplette 60-Sekunden-Demo aus dem PRD im Container-Build durchspielen — Generalprobe fürs Video.
  Commit: `Polish theming and options, add Docker demo packaging`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — nach Slice 4: Kernel-Feedback (wirkt der Plan richtig? Passen Vorschläge/Mengen-Logik zur Vorstellung?) — dieses Feedback formt Slice 5–7.
- [ ] Final kick-the-tires exploration and feedback completed — nach Slice 8: freie Erkundung + 60-Sekunden-Demo-Generalprobe.

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [offen]
Route and stops: [offen]
Edit outcome: [offen]
Reflection: [offen]
Activity mode: [offen]

## Revisions

- **node:sqlite statt better-sqlite3** — better-sqlite3 ließ sich unter Node 26 nicht installieren (kein vorkompiliertes Binary für die neue Node-ABI, node-gyp-Fallback fehlgeschlagen). Das eingebaute `node:sqlite` eliminiert die native Abhängigkeit komplett; SQLite als Datenbank-Entscheidung bleibt unverändert, nur das Bindings-Paket entfällt. `db.transaction()`-Helfer existiert dort nicht → explizites BEGIN/COMMIT.
- **DB-Pfad korrigiert** — `dataDir` rechnete von `apps/api/src/db` nur drei Ebenen hoch statt vier und legte die Laufzeit-DB unter `apps/data/` statt im Repo-Root. Gefunden über `lsof`: der Server hielt eine Datei offen, die alle Reinigungen nie erreichte (deshalb „überlebte" ein alter Haushalts-Eintrag jeden Reset).
- **zod v4 + SDK 0.128** — Der `zodOutputFormat`-Helper des aktuellen SDKs erwartet zod-v4-Schemata; mit klassischem zod v3 crashte die Schema-Konvertierung (`reading 'def'`). packages/shared und apps/api wurden auf zod 4 gehoben, danach liefen Schema-Zwangsantwort und Validierung. Modell/Preise verifiziert: `claude-opus-5`, $5/$25 pro Mio. Tokens (siehe spec.md > Decisions and Open Issues).
- **z.ai-Endpunkt statt Anthropic, create statt parse** — Lerner-Entscheidung: der LLM-Aufruf läuft über den z.ai-Anthropic-kompatiblen Endpunkt (`ANTHROPIC_BASE_URL`) mit Modell `glm-5.3` (Modell-Code-Liste per `/v1/models` ermittelt). Zwei Anpassungen daran: (1) der Shim erzwingt `output_config`/json_schema NICHT und liefert JSON teils in ```-Fences → der Planner nutzt `messages.create` + eigene JSON-Extraktion + zod-Validierung (Retry-Mechanik unverändert, Härte jetzt vollständig server-seitig); (2) glm-5.3 macht standardmäßig ausgiebiges Thinking und lief ohne es in Timeouts → `thinking: {type: "disabled"}` + harte 60-s-Timeout + maxRetries 0 im Request. Live-Beweis: validierter 7-Tage-Plan aus echtem Aufruf, Miss-Log liefert konstruktive Datenlücken-Feedbacks.
- **Penny-Angebots-API statt Lidl/Aldi-Abzug** — Lerner-Entscheidung im Build (Slice 3): Penny betreibt eine REST/JSON-API (`/.rest/offers/by-category/{kw}/{kategorie}`, Endpunkt aus dem App-Bundle von penny.de extrahiert und live verifiziert). `pnpm offers:fetch` zog 70 echte Aktionen aus 8 Kategorien nach `data/offers/2026-09-24_penny.json` (zod-validiert, `fetchedAt`/`source` dokumentiert) — Zielmarke „20–30" übertroffen, Woche 2026-39. Store-Enum: `penny` zuerst, `aldi-sued`/`lidl` bleiben für spätere Fetcher. Spec/PRD/Scope-Referenzen auf Penny umgestellt; Badge-Farbzitat um Penny-Rot ergänzt. Antwort auf die Groblösungs-Frage: GitHub-Sweep (Marktguru-Ökosystem, Apify-Actor, Einzel-Scraper) fand nichts Wartbares — die First-Party-API macht externe Scraper überflüssig; Marktgurus alte JSON-Endpunkte liefern inzwischen nur SPA-Shells.

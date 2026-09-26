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

- [x] **4. Wochenplan-Generierung Ende-zu-Ende — der Kernel**
  Becomes usable: Laden wählen → „Plan erstellen“ → 7 Tage nach E33-Muster mit Mahlzeiten-Chips, Einschränkungen respektiert, schnell-kochbar-Flags, Next-Meal-Karte; Regenerieren ersetzt sichtbar den Plan.
  Why now: Die Kernel-Regel: früh, nicht zuletzt — jetzt, wo Risiko (Slice 2) und Daten (Slice 3) stehen, beweist ein Aufruf die Kernidee.
  PRD ref: `prd.md > Features and Behavior > Wochenplan`, `prd.md > What "Working" Looks Like` (Demo-Schritte 1–2)
  Spec ref: `spec.md > Components` (planner.ts, routes), `spec.md > Data Model` (week_plan)
  Build: `POST /api/plan/generate { store }` mit Kontextvertrag, Persistenz des Plans, Wochenstreifen-UI (Tageskarten, F/M/A-Chips), Next-Meal-Karte mit Vorbereitet-Zähler.
  Verify (mechanical): Vitest: Plan-Schema-Validierung; `curl` generate → `GET /api/state` enthält 7 Tage; Skript-Assert: Maelles Mahlzeiten vegetarisch, Gustavs milchfrei, `basedOnOffers` > 0.
  Learner check: Plan generieren und gegen die Prüfkriterien lesen: Isst Maelle vegetarisch, Gustav milchfrei? Wirkt die Woche abwechslungsreich — oder doppelt sich was?
  Commit: `Generate weekly meal plan from real offers via validated LLM`

- [x] **5. Einkaufsliste: aggregiert, abteilungsweise, abhakbar**
  Becomes usable: Einkaufslisten-Button → Liste gruppiert nach Ladenabteilungen, Mengen aus den Wochenrezepten aggregiert, Preise + Angebots-Badges, Abhaken bleibt persistiert.
  Why now: Die Liste ist die Auszahlung des Kerns („was × wieviel × Preis“) und steht komplett auf deterministischer Rechnung — die Tests beweisen das PRD-Versprechen „nachrechenbar“.
  PRD ref: `prd.md > Features and Behavior > Einkaufsliste`, `prd.md > What "Working" Looks Like` (Cool-Moment)
  Spec ref: `spec.md > Components` (domain/aggregation.ts), `spec.md > Data Model` (list_item)
  Build: `aggregation.ts` (Plan × Rezepte → Positionen: Gramm summieren, Stück zählen), Vitest-Fälle für Aggregation + kcal, `GET /api/shopping-list` bzw. Teil von `/state`, `PATCH /api/shopping-list/:itemId`, Listen-UI mit Abteilungsgruppen + Fortschritt.
  Verify (mechanical): Vitest grün, inkl. Fall „500 g Hackfleisch aus zwei Rezepten“ und kcal-Summen; UI-Gegenprobe: 2–3 Positionen handnachgerechnet gegen Plan-Rezepte.
  Learner check: Liste öffnen, 2–3 Positionen anhand der Rezepte nachrechnen, etwas abhaken, neu laden — Haken bleibt?
  Commit: `Deterministic shopping list with departments, prices, check-off`

- [x] **6. Events & Ausnahmen — der Grillabend**
  Becomes usable: Tagesdetail: „Event hinzufügen“ (Personenanzahl, Gerichtvorschläge aus aktuellen Angeboten oder freie Eingabe) skaliert Plan und Liste sofort; „Tag aussetzen“ entfernt Mahlzeiten und Listenpositionen.
  Why now: Der Demomoment des Videos und der dynamische Teil des Kerns — setzt auf stabilen Plan und Liste auf, deshalb nach Slice 5.
  PRD ref: `prd.md > Features and Behavior > Events & Ausnahmen`, `prd.md > What "Working" Looks Like` (Demo-Schritt 3)
  Spec ref: `spec.md > Components` (routes plan/events, plan/exemptions), `spec.md > Data Model` (event)
  Build: `POST /api/plan/events` (Personenanzahl, Angebots-Vorschläge via Planner oder freie Eingabe), `POST /api/plan/exemptions`, Skalierung + Listen-Neuberechnung, Tagesdetail-UI, Event-Marker im Wochenstreifen.
  Verify (mechanical): Vitest/curl: Grillabend 5 Personen → Samstag-Abendessen auf 9 Portionen skaliert, Liste enthält Zusatzmengen, mind. 1 Event-Gericht trägt Angebotspreis; Di/Mi aussetzen → deren Positionen entfallen.
  Learner check: Grillabend am Samstag mit 5 Nachbarn anlegen — skaliert Plan und Liste? Danach Di+Mi aussetzen — schrumpft die Liste sichtbar?
  Commit: `Add events and day exemptions with list rescaling`

- [x] **7. Eigener Haushalt: Person-für-Person-Onboarding + Einstellungen**
  Becomes usable: Der Zwei-Wege-Erststart ist komplett: eigener Haushalt anlegen, Personen einzeln mit Skip/Later (unvollständig markiert, editierbar), Einstellungen für Personen und Wochenmuster.
  Why now: Schließt Journey-Schritte 1–2 für echte Nutzer — braucht den stabilen Rest, ändert am Kern aber nichts; daher nach Kernel, Liste und Events.
  PRD ref: `prd.md > Features and Behavior > Haushalt & Personen`, `prd.md > Screens and Layout` (Onboarding & Einstellungen), `prd.md > States and Boundaries` (unvollständige Person)
  Spec ref: `spec.md > Components` (apps/web Onboarding, routes persons), `spec.md > Persistenz`
  Build: Onboarding-Flow Person für Person mit Skip/Later und Unvollständig-Markierung, `POST /api/persons` + `PATCH /api/persons/:id`, Wochenmuster-Editor, „Eigenen Haushalt anlegen“-Pfad.
  Verify (mechanical): curl: Person mit Lücken anlegen → als unvollständig markiert → patchen → vollständig; UI: Flow durchklicken; Plan-Generierung funktioniert mit unvollständiger Person.
  Learner check: Eigenen Haushalt anlegen, eine Person mit Skip anlegen, sie später in den Einstellungen vervollständigen, Wochenmuster ändern und neu planen.
  Commit: `Own-household onboarding with skip/later and settings`

- [x] **8. Feinschliff + Auslieferung: Light/Dark/System, Optionen, Docker-Demo**
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
- [x] Final kick-the-tires exploration and feedback completed — nach Slice 8: freie Erkundung + 60-Sekunden-Demo-Generalprobe (26.09., Docker auf :8085, Feedback in Revisions).

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
- **Constraint-Prüfung in die Planner-Retry-Schleife verdrahtet (Slice 4)** — Der erste Live-Lauf lieferte einen echten Verstoß (Gustav, milchfrei, saß an der Sahne-Soße), den die Pool-Prüfung (nur IDs/Refs) nicht fängt. `validateConstraints` ergänzt: jede Mahlzeit gegen die Constraints aller Mitesser, Verstoßtext (nur GUIDs — Kontextvertrag gilt auch im Retry) geht in den nächsten Aufruf. Beweise: Flash-Test (Verstoß → Retry → grün, ohne Netz) in `test/planner-retry.test.ts`; danach Live-Regenerierung mit 0 Verstößen.
- **Vorbereitet-Zähler als automatischer Wochenfortschritt (Slice 4)** — „X von Y Mahlzeiten vorbereitet" rechnet der Server aus dem Slot-Zeitfortschritt (Vergangenes = vorbereitet); ein nutzer-Abhakbarer Meal-Prep-Status bräuchte eigene Persistenz und ist hier bewusst nicht gebaut. Checkpoint-Feedback entscheidet, ob das eine Interaktion werden muss (wäre Revision mit Datenmodell-Folge).
- **AppState trägt Rezept-Projektion + Next-Meal (Slice 4)** — UI bekommt Titel/Quick-Flags und das server-seitig berechnete nächste Essen direkt im State (spec.md > Core Journey 5: kein zweiter LLM-Aufruf); `week_plan` persistiert als Einzelzeile (Regenerieren ersetzt per `ON CONFLICT`).
- **Checkpoint-Runde 1 (nach Slice 4) — drei Lerner-Entscheidungen umgesetzt:**
  1. **Anpassung statt Restriktion** (Kernel-Verhalten, Lerner-Entscheidung): „Es ist immer alles vegan oder vegetarisch … zu restriktiv." Der Planner wählt jetzt fleisch-/milchhaltige Basisgerichte für den Tisch und löst Einschränkungen über `adaptations[] { personRef, note }` — Live-Beweis: 7 von 18 Mahlzeiten mit konkreten Anpassungen (Linsen statt Hack, Tofu statt Hähnchen, Omelett-Portion ohne Gouda), 0 ungedeckte Verstöße. `validateConstraints` und `checkPlanConstraints` akzeptieren gedeckte Verstöße; Prompt zeigt es explizit an. PRD + Spec nachgezogen.
  2. **Tagesansicht klickbar + Wochenstreifen-Überlauf gefixt** („die Tage gehen rechts raus, ich kann nichts klicken"): Grid-Shrink-Bug (`minmax(0,1fr)`), Tageskarten als Buttons, DayDetail mit Gerichten, Mitessern, Tags, Zubereitung.
  3. **Manueller Zubereit-Abhak** („Mahlzeiten müssen beim Zubereiten abgeharkt werden, denn es kann ja auch was schief gehen"): `prepared` in StoredMeal, `PATCH /api/plan/meal { day, slot, prepared }`, Zähler zählt nur Abgehaktes (automatische Zeitlogik entfernt), Regenerieren setzt zurück. Roundtrip per curl bewiesen.
  Weiterer Befund: Einkaufsliste/Zubereitung fehlten sichtbar (Zubereitung jetzt in der Tagesansicht; Liste = Slice 5, jetzt Priorität). Mobile-Feinschliff bleibt Slice 8 (Erste-Hilfe-Wrap ist drin).
- **Checkpoint-Runde 2 — drei Präzisierungen des Lerners umgesetzt:**
  1. **Allergien ≠ Anpassung („du kannst die Erdnüsse nicht später aus der Erdnussbutter rausnehmen"):** `Person.allergies[]` als hartes Feld neben den weichen `constraints[]` (DB-Spalte per ALTER nachgezogen). Prompt + `validateConstraints` + `checkPlanConstraints`: für Allergien gilt keine Anpassung als Deckung — das Basisgericht muss das Allergen von sich aus meiden. Beweis: Vitest (Anpassung deckt weiche Einschränkung, aber nie die Allergie) und Planner-Retry-Test (ALLERGIKER am Tisch → Anpassung genügt nicht, Retry verlangt allergenfreies Gericht). Demo-Haushalt bleibt ohne Allergien (Gustav ist unverträglich, nicht allergisch) — der Onboarding-Flow (Slice 7) erfasst den Unterschied.
  2. **Meal-Prep-Logik im Prompt:** Wiederholung gilt pro Gericht, nicht pro Zutat — Komponenten (vorgekochtes Hähnchen, Reis) dürfen mehrfach auftreten, Reste-Warm-up ist erlaubt (größere Portion, quick-Flag); frisch gekochte Hauptgerichte wechseln weiterhin (kein identisches Gericht < 3 Tage).
  3. **Essens-Zähler: Hilfe statt Knast:** `prepared` ist jetzt `auto | ja | nein` (alte true/false-Pläne laden weiter). „auto" fragt die Uhrzeit (vergangene Slots gelten als gegessen), „ja"/„nein" ist die manuelle Korrektur und gewinnt. Regenerieren setzt auf auto zurück.
  Build-Nebenbefund: `tsc` hatte trotz Fehlern emitted (`noEmitOnError` fehlte) — jetzt hartes Build-Versagen bei Typfehlern, `demo-seed.ts` nachgezogen.
- **Checkpoint-Runde 3 — Einkaufsliste mit Mengen-Intelligenz (Lerner-Entscheidung):** „Achte auf Einkaufsgrößen vs. Rezeptgrößen … genug für die Rezepte, aber verderbliches nicht viel zu viel. Deswegen auch der Rezept-Nachrücker, da waren fast nie Mengen mit drin." Neues `data/purchase.json` (45 Kaufgebinder: Packungsgröße, Verderblichkeits-Flag, Grundpreis, Gramm-Äquivalente für Stück-Zutaten). `aggregation.ts` rechnet Bedarf am Gebinde hoch, weist Reste aus — verderblich mit **Rezept-Nachrückern inkl. konkreter Mengen** („160 ml übrig → Kartoffel-Gemüse-Auflauf nutzt 100 ml für 2 Portionen"), haltbar als Vorrat. Angebots-Matching per Token-Match (Angebotspreis ersetzt Packungspreis — Näherung, dokumentiert). Abhak persistiert in `list_item`, Regenerieren leert sie (neue Woche, neuer Stand). kcal-Wochenbilanz je Person aus Planbeteiligung gerechnet (Anzeige dezent in Slice 8). Beweise: 8 Vitest-Fälle (u. a. der 500-g-Hackfleisch-Fall), Live-Liste aus dem echten Plan: 36 Positionen, 285,39 €, 4 echte Angebots-Treffer, Abhak-Roundtrip per curl.
- **Backlog angelegt (Lerner-Entscheidung „nicht komplett fallen lassen"):** `devpost/backlog.md` — Planungswerkbank, Favoriten, Rezept-Tiefe, Person-Level-Kalorienkorrektur, Mobile-Feinschliff; mit Kostenabschätzung und Entscheidungsregel (erst PoC-Demo, dann bewerten).
- **Checkpoint-Runde 4 (nach Slice 5) — Vorschläge, Preis/kcal, UI-Breite; Verifizierung adaptiert:**
  - **Portionspreis + kcal am Gericht** (Lerner-Wunsch „geil wäre … den Portionspreis (etwa) ggfls. kcal zu sehen"): `RecipeSummary` trägt `portionPriceCents` (anteilige Packungskosten — „etwa"-Näherung, dokumentiert) und `kcalPerPortion`; sichtbar an Tagesgerichten, Event-Vorschlägen und Event-Markern.
  - **Slice-6-Verify adaptiert:** Das E33-Muster hat samstags nur Mittag — der Event skaliert die **Hauptmahlzeit des Tages** (bevorzugt Abendessen, sonst erste geplante). „Samstag-Abendessen auf 9 Portionen" wird zu „Sa-Hauptmahlzeit auf 9 Portionen"; Vitest beweist +5 Portionen → Gebinde-Sprung (Karotten 240 g → 540 g = 2× 500 g).
  - **Ehrlicher Freitext-Fallback:** Ein Event-Hinweis, der kein Rezept trifft („grill"), bleibt Freititel mit recipeId null — kein stillschweigender Ersatz durch den Top-Vorschlag; nur ohne Hinweis greift der Autoselect.
  - **UI-Breite** („mittelbreit in der Mitte"): .main zurück auf 880 px. **Slice 7 nimmt zwei Lerner-Wünsche auf:** Budget-Rahmen (1–3 Münzen) in den Einstellungen, gewichtet die Vorschlags-Sortierung; Onboarding erfasst Geräte (Tiefkühlfach ja/nein) und Koch-Level 1–3, Rezept-Pool bekommt leichte Skill-/Geräte-Tags („ein Student wird kaum ganze Hühner verarbeiten").
  - **2-Wochen-Planung bleibt Backlog** (Plan-Historie + listenübergreifende Gebinde-Optimierung, 1–2 Slices) — dokumentiert, nicht stillschweigend gebaut.
- **Checkpoint-Runde 5 (nach Slice 6) — Lerner-Meldungen „Summe aktualisiert nicht / Zurück tot / Liste volle Breite":** In einer frischen Session (eigene Safari-Fenster via AppleScript gefahren, weil Playwright auf diesem Mac nicht läuft) war keiner der drei Defekte reproduzierbar — Zurück navigiert, Summen laufen („Korb 3,89 € · Rest 355,68 €"), Liste 832 px zentriert. Ursache war jeweils eine über viele HMR-Updates angestaubte Session. Trotzdem produktiv gemacht: **Einkaufsliste** bekommt den echten `.main`-Container, eine **laufende Summe** (Korb/Rest statt nur Gesamt) und eine **Ersparnis-Zeile** (`basePriceCents` je Position, „~X € gespart" gegenüber Packungspreis); **Gerichte** zeigen Preis/kcal jetzt im aufklappbaren **„Zutaten & Preise"-Panel** (je Portion und gesamt, Angebots-Zutaten markiert) statt als unübersichtliche Volltextzeile — exakt der Lerner-Vorschlag. Neue Route `GET /api/recipes/:id/prices?servings=N`. Lern-Hinweis: bei merged Zuständen nach vielen Änderungen hart neu laden (⌘⇧R).
- **Slice 7 erweitert um Checkpoint-Wünsche:** Einstellungen enthalten **Budget-Münzen (1–3)** — gewichtet die Vorschlags-Sortierung (Budget 1 = Preis vor Angebot), **Geräte** (Tiefkühlfach ja/nein) und **Koch-Level 1–3** („ein Student wird kaum ganze Hühner verarbeiten") — Rezept-Pool trägt `skill` + `equipment`, der Planner-Kontext die Haushaltsregeln; **Einkaufstag** verankert den Wochenstart (`shoppingWeekStart`), **Kochtage** gehen als Frische-Fokus in den Prompt.
- **Slice 7 Live-Fund — PII-Guard-Fehlalarm:** Testperson „Max" + Angebotsprodukt „MAXI…" → substring-basierte PII-Prüfung warf fälschlich 500er. Prüfung auf Wortgrenzen umgestellt (`\b`-Regex); Regression im Live-Loop bestanden (Generate mit „Max" → 200, 7 Tage).
- **Checkpoint-Runde 6 (nach Slice 6) — Tagesansicht-UX:** Die Tagesansicht gefällt noch nicht (Layout, Zurück-Bedienung, aufklappbares Panel, Mengen-Anzeige) — Lerner-Entscheidung: **Aufwertung in den Slice-8-Look-and-Feel-Pass** verschoben, dort mit Redesign der Tagesansicht.
- **Wegwerf-DB-Verifikationsmuster:** Slice-7-Flow lief gegen `FEP_DATA_DIR=/tmp/fep-test-data` (Kopien der JSON-Datenkataloge inklusive) — der Demo-Haushalt blieb unberührt; Muster für künftige Flow-Tests.
- **Slice 8 umgesetzt entlang der Look-and-Feel-Vertrags + Checkpoint-Notizen:**
  - **Theming:** Light/Dark/System über `data-theme` am Wurzel-Element (`theme.ts`, localStorage, matchMedia-Listener für System); Dark-Palette mit entsättigten Personen-Pastellen. **Große-Schrift-Option** (`data-fontsize="large"` → zoom 1.15) und **„wenig Animation“** (`data-motion="reduced"` + `prefers-reduced-motion`) — alles in den Einstellungen unter „Darstellung“.
  - **Kalorien dezent** (PRD-Tonalität): Zeile unter dem Profil-Umschalter — „~X kcal diese Woche · Ziel Y kcal/Tag“, nur wenn Ziel gesetzt.
  - **Tagesansicht-Redesign (Checkpoint-Runde 6):** klebriger Zurück-Kopf („← Woche“), schlankere Karten-Hierarchie, Preis-Panel mit Portionszahl im Titel.
  - **Mobile-Nachreich:** Muster-Tabelle scrollt, Listenzeilen umbrechen, Topbar stapelt.
  - **Docker-Demo:** Multi-Stage-freier Single-Stage-Build (`docker/Dockerfile`, node:22-alpine), SPA-Serving durch den API-Container (`FEP_WEB_DIST` + Notfound-Fallback auf index.html), `compose.yaml` am Root mit `data/`-Mount und optionalem `.env`. Fund im Container-Build: `tsconfig.base.json` fehlte im COPY-Set (extends-Auflösung schlug fehl) — nachgetragen. Verify: `docker compose up --build` → :8080, SPA 200, State 200 (Haushalt, 70 Angebote, 39 Listenzeilen), Route-Fallback 200, `data-theme`-Regeln im gebauten CSS.
- **Rezept-Tiefe (Zeiten/Reihenfolgen) bleibt Backlog-Item 3** — bewusst nicht in diesen Slice gezogen, Content-Pass nach dem finalen Review bewerten.
- **Hands-on-UI-Testrunde (Safari, Wegwerf-DB) — Funde und Fixes nach Slice 8:**
  1. **Demo-Button tot im Browser:** `lib/api.ts` schickte `content-type: application/json` auch ohne Body; Fastify 5 antwortet 400. Alle Browser-Pfade des Demo-Einstiegs waren kaputt (Verifies liefen über curl). Fix: Header nur bei Body.
  2. **Dark Mode faktisch unbenutzbar:** `data-theme` saß auf `<html>`, `data-person` auf `<body>` — die Dark-Paar-Selektoren `[data-theme="dark"][data-person="…"]` matchten nie, im Dark gewannen die hellen Light-Paare. Fix: `data-person` auf die Wurzel. Zusätzlich harte Hex-Farben (`#fff` auf `--ink`, Tag-Grün/Blau, Angebots-Rot) durch Theme-Variablen ersetzt (`--on-ink`, `--on-accent`, `--ok-green`, `--tag-blue`, `--offer-red`).
  3. **zod-Defaults-Falle (Muster-Bug, zweimal):** `Schema.partial()` injiziert `.default()`-Werte fehlender Felder — `PATCH /api/settings` überschrieb jeden Teil-Patch die übrigen Felder mit Defaults (Einkaufstag setzen löschte Kochtage usw.); gleiches Muster im Personen-Patch löschte bei `{"complete": …}` Constraints/Allergien (Gustavs „milchfrei" im Test real verloren, Wegwerf-DB). Fix: eigene Patch-Schemata ohne Defaults (`HouseholdSettingsPatch`, `PersonPatch`).
  4. **Preis-Rechner-Einheitenbrücke nur zur Hälfte gebaut:** `recipeCostPerPortion`/`recipePriceRows` konvertierten Rezept-Gramm auf Stück-Karten nicht (60 g Eisbergsalat = „60 Köpfe à 1,19 €" = 71,40 €/Portion; Nutzer sah 289 € für 4). Der Checkpoint-6-Fix lebte nur in `buildShoppingList`. Fix: gemeinsame `portionInPackUnits`-Brücke + 3 Regressionstests (u. a. Katalog-Sweep: kein Rezept > 5 €/Portion).
  5. **Wochenmuster: Abwählen unmöglich** — der Entfernen-Zweig war toter Code, der Tooltip versprach eine nicht existierende Interaktion; nach Reset zeigte die Maske leere Zellen statt des Server-Standards. Fix: 3-Stufen-Zyklus (+ → Erwachsene → alle → aus) und Anzeige-Fallback.
  - **Neue Features aus Lerner-Feedback:** mehrere Einkaufstage (`shoppingDays`, Wochenanker = letzter Einkauf rückwärts — Zukunft-Bug in `shoppingWeekStart` mitgefixt), Koch-/Prep-Tage mit sichtbarer Vorbereitung (`mealPrep`-Schalter → `prepNote` je Mahlzeit, grüne Box im Tagesdetail), Wiederholungen-Politik (normal/streng), Rezept-Zeiten (`minutes` für 24 Rezepte, Badge am Gericht), Kochmengen-Panel („Rezept": Mengen links, „für 4 Portionen" + Zubereitung rechts, Preise bewusst nur in Liste und Meta-Zeile), Personen-Bearbeiten-Formular in den Einstellungen (gemeinsame `PersonForm`-Komponente, Onboarding nutzt sie weiter).
  - **Bekannt, nicht gefixt:** Serien-Klick-Race in Settings-Radios (zweiter Klick baut auf stale Props); Zeitzonen-Rand in `nowTick`-Kanten; latenter Hook-Ordnungs-Verstoß in Settings.tsx (`useState` nach Early-Return); aktive Person sprang in einem Testlauf unerklärt um.
- **Generalprobe-Runde (26.09., Docker-Demo auf :8085 nach `FEP_PORT`-Umbau, DB davor zurückgesetzt für die echte Erstsituation):**
  1. **Gerichte entfernen/tauschen fehlt** („Grillabend mit Nachbarn, oder?") — echtes neues PRD-Verhalten, kein Politzug vor dem Ship → **Backlog 8**.
  2. **Packungsmenge saß im Kleintext** („bedarf X → kaufen Y" in 13,5px muted — „ich kann auf dem Handy nicht lesen, wie viele Packungen Haferflocken"): Kaufmenge in eigene prominente Zeile „Kaufen: 2× 500 g" (`.list-buy`, 15,5px, volle Tinte, durchgestrichen im Abhak); Kleintext bleibt für Bedarf/Reste.
  3. **Rezept-Panel: Mengen begannen je Karte an anderer x-Position** — `.price-table` hatte gar kein CSS, Browser-Auto-Layout maß Spalten nach Inhalt. Fix: fester Raster nach Lerner-Vorschlag „Bootstrap 3, 2, 7" — Zutat 3 : Menge 2 : Zubereitung 7 (`table-layout: fixed`, 60/40 in der Mengentabelle; `.recipe-columns` 5fr/7fr statt 5fr/4fr — Zubereitung bekommt mehr Raum).
  4. **Vorlesen/Timer** („muss nur das Rezept vorlesen") → **Backlog 9**. **Mobile-Design-Sorge allgemein** → **Backlog 5** ergänzt. **Playwright-E2E auf Zweitrechner** → **Backlog 10**.

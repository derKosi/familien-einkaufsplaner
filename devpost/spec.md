---
doc: spec
status: approved
---

# Familien-Einkaufsplaner (Arbeitstitel) — Technical Spec

## How This Works, In Plain Language

Ein Browser, ein Server, eine Datei, ein KI-Aufruf — mehr ist es nicht:

Du öffnest die Seite, dann lädt der Browser eine **React-App** (Vite baut sie). Die App kennt selbst keine Geschäftslogik — sie fragt den **Fastify-Server** per REST/JSON. Der Server liest und schreibt eine **SQLite-Datei** (im Docker-Container an `data/` gemountet): Haushalt, Personen, der aktuelle Wochenplan, die Einkaufsliste.

Der interessante Moment ist die **Planerzeugung**: Du wählst Aldi Süd oder Lidl und drückst „Plan erstellen". Der Server sammelt dann vier Dinge — die Personen mit ihren Einschränkungen und Kalorienzielen, das Wochenmuster (wer isst wann was), den Rezept-Pool mit Tags und Grammaturen, und die neueste **Angebots-Momentaufnahme** (echte, datierte JSON-Dateien). Alles zusammen geht in einen einzigen Aufruf an die **Claude-API** mit fester Antwortstruktur — wobei Personen vorher **pseudonymisiert** werden: GUIDs statt Namen, Rollenklassen statt Alter, keine Freitext-PII (fest vertraglich in `context-contract.ts`). Die Antwort wird gegen ein Schema geprüft (zod), bei Murks maximal zweimal nachgefordert, und erst wenn sie sauber ist, wird der Plan gespeichert. Die **Einkaufsliste rechnet der Server selbst aus** — Zutaten der geplanten Rezepte zusammenaggregiert, Preise aus den Angeboten, kcal aus einem Nährwert-Werkblatt pro Zutat. Das LLM wählt und kombiniert; rechnen tut der Rechner.

Warum diese Form: Eine Sprache (TypeScript) von der Datenbank bis zur UI heißt für den agenten-getriebenen Build weniger Bruchstellen, und REST + JSON statt Protobuf/SignalR heißt Debuggen mit curl statt mit Spezialwerkzeug. SQLite statt Cloud-DB ist dieselbe Datenform ohne zweiten Dienst — und läuft später auf deiner Azure-VM hinter Caddy, wenn du willst.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`.

1. **Erststart** → Browser lädt die SPA, `GET /api/state` liefert: kein Haushalt vorhanden → Zwei-Wege-Bildschirm. „Demo-Familie" ruft `POST /api/household/demo` (seedet Expedition 33), „eigener Haushalt" startet den Person-Flow (`POST /api/persons`, beliebig oft, Skip/Later = Person mit Lücken).
2. **Laden wählen, Plan erzeugen** → `POST /api/plan/generate { store }` → Planner sammelt Kontext, ruft Claude (validiert, mit Retry), persistiert den Plan, rechnet daraus die Liste → `GET /api/state` zeigt Hauptbildschirm mit Wochenstreifen und „basiert auf N Angeboten".
3. **Anpassen** → Tagesdetail: `POST /api/plan/events { day, personCount, dishHint? }` — ohne `dishHint` schlägt der Planner Gerichte aus den aktuellen Angeboten vor → `POST /api/plan/exemptions { days }` entfernt Mahlzeiten → beides rechnet die Liste sofort neu.
4. **Einkaufen** → `GET /api/state` enthält die Liste nach Abteilungen gruppiert; Abhaken = `PATCH /api/shopping-list/:itemId { checked }`, Fortschritt bleibt persistiert.
5. **Unter der Woche** → Hauptbildschirm „Next Meal"-Karte rechnet der Server aus dem Plan + Vorbereitet-Zähler aus; nichts davon braucht einen erneuten LLM-Aufruf.
6. **Nächste Woche** → neuer `POST /api/plan/generate` mit frischem Snapshot; alter Plan wird ersetzt (History kommt später).

## Stack

| Baustein | Wahl | Warum (und Tradeoff) — mit sauberer Zuschreibung: **Lerner** = eigene Idee, **bestätigt** = Agent-Empfehlung, die der Lerner akzeptiert hat |
|---|---|---|
| Sprache | TypeScript überall (**bestätigt**) | Agent-Empfehlung; weniger Bruchstellen im Agenten-Build. Tradeoff: kein Python/.NET, obwohl .NET-Erfahrung vorhanden — bewusst „langweilig statt vertraut". |
| Repo-Form | Monorepo mit Workspaces (**Lerner**, vom Agenten bekräftigt) | Agent hat Zwei-Repos-Split explizit verworfen: geteilte zod-Typen würden zum Kopier-Drift, zwei CIs für einen Container. `packages/shared` ist das Herz der typisierten Endpunkte. |
| Frontend | Vite + React (**Lerner-Intuition**, vom Agenten bestätigt) | HTMX (Lerner-Idee) wurde erwogen und verworfen (Client-Interaktivität: Theming-Switch, Abhaken, Wochenstreifen). docs: https://vite.dev, https://react.dev |
| Backend | Node + Fastify (**bestätigt**) | Agent-Empfehlung: börsenreif, gute Doku, wenig Magie. docs: https://fastify.dev |
| DB | SQLite via better-sqlite3 (**bestätigt**; GCP-Idee des Lerners verworfen) | Eine Datei auf einem Docker-Mount statt Cloud-DB — gleiche Datenform, kein zweiter Dienst. docs: https://github.com/WiseLibs/better-sqlite3 |
| Schemas | zod in `packages/shared` (**Lerner**: „typisierte Antworten") | Dieselben Schemas validieren die LLM-Ausgabe. docs: https://zod.dev |
| LLM | Anthropic TS SDK, server-seitig (**Lerner-Scope**, Agent-Ausgestaltung) | Aufgaben begrenzt: Rezeptauswahl, Constraint-Check, Wochenplanzusammenstellung, Portionierung; plus PII-Filter vor dem Aufruf. docs: https://github.com/anthropics/anthropic-sdk-typescript, API-Ref: https://docs.anthropic.com |
| Transport | REST + JSON (**bestätigt**; Protobuf/SignalR-Idee verworfen) | Debuggen mit curl statt Spezialwerkzeug; Real-Time löst ein Problem, das der PoC nicht hat. |
| Tests | Vitest (**bestätigt**) | Für Aggregation, Kalorienrechnung, Schema-Validierung, PII-Filter. docs: https://vitest.dev |
| Auslieferung | Docker, ein Container (**Lerner**: „eh in Docker mit Mount") | Fastify serviert die gebaute SPA statisch mit; `data/` ist ein Bind-Mount. |

**Unverifiziert, zu Beginn des Builds prüfen:** aktuelles Anthropic-Modell + Preis für strukturierte Ausgaben (Kosten für den PoC: Cent-Beträge, aber die Angabe ist von mir heute nicht live geprüft); genaue SDK-API für Schema-Zwangsantworten („structured outputs"/Tool-Use) variiert nach SDK-Version.

## Where It Runs and How Someone Tries It

- **Entwicklung:** `pnpm install`, `pnpm dev` — API auf `:3001`, Vite-Dev-Server auf `:5173` (Proxy eingerichtet). `ANTHROPIC_API_KEY` in `.env` (nur Server; `.env.example` ohne Geheimnis wird committet, `.env` ist ge-ignored).
- **Demo-Aufnahme (Pflichtweg):** `docker compose up` → `http://localhost:8080` öffnen, E33-Haushalt seeden, Plan generieren, 60-Sekunden-Demo aus `prd.md > What "Working" Looks Like` abfilmen. Einreicherung erfordert Demo-Video + öffentliches GitHub-Repo; beides muss ohne Deployment funktionieren.
- **Optionales Deployment (Ziel, kein PoC-Bestandteil):** Azure-Ubuntu-VM des Lerners, ein Container, `data/`-Mount, Subdomain hinter bestehendem Caddy. Entscheidungen dazu trifft `6-ship`.

## Look and Feel

Aus `prd.md > Look and Feel` übernommen, in Baubegriffe übersetzt:

- **Theming über CSS-Custom-Properties:** Light/Dark/System via `prefers-color-scheme` + Toggle; große-Schrift-Option als Wurzel-Klasse; `prefers-reduced-motion` respektieren + eigene „wenig Animation"-Option. Kein CSS-Framework — ein kleines eigenes Custom-Property-System ist hier wartbarer als Dependency-Gewicht.
- **Personen-Pastelle:** pro Person ein Main+Akzent-Paar (definierte Pastell-Palette, 4 Kombis für E33); der Profil-Umschalter tauscht die CSS-Variablen auf `:root`.
- **Angebots-Badges** dürfen Discounter-Farbzitate (Lidl-Gelb, Aldi-Blau) tragen — sonst nüchtern: Papierweiß/Anthrazit, kompakte Prospekt-Dichte, keine Zier-Animationen.
- **Tonalität der Texte:** sachlich, keine Ernährungs-Moral (Kalorien als dezente Zeile pro Person, kein Banner).

## Components

### `apps/web` — die vier Oberflächen
SPA mit React Router-freier Ansichtsumschaltung (4 Zustände, keine tiefen URLs nötig): Hauptbildschirm (Kopfzeile mit Ladenwahl + Angebots-Indikator, Next-Meal-Hero, Wochenstreifen, Listen-CTA), Tagesdetail, Einkaufsliste, Onboarding/Einstellungen.
Implementiert `prd.md > Screens and Layout`.

### `apps/api` — Fastify-REST
Endpoints: `GET /api/state`, `POST /api/household/demo`, `POST /api/persons`, `PATCH /api/persons/:id`, `POST /api/plan/generate`, `POST /api/plan/events`, `POST /api/plan/exemptions`, `PATCH /api/shopping-list/:itemId`, `GET /api/offers/latest`, `POST /api/offers/refresh`. Alle Antworten über `packages/shared`-Schemas typisiert.
Implementiert `prd.md > Features and Behavior` (alle Bereiche).

### `apps/api/src/llm/planner.ts` — der Kopf
Baut den Kontext (Personen, Muster, Rezept-Pool, aktuelle Angebote), ruft Claude mit fester Antwortstruktur, validiert mit zod (max. 2 kontrollierte Retries mit Fehlermeldung im Kontext), schreibt den validierten Plan. Aufgaben laut Lerner-Entscheidung: Rezeptauswahl, Allergie-/Constraint-Check, Wochenplanzusammenstellung, Portionierung.
Implementiert `prd.md > Wochenplan`.

### `apps/api/src/llm/context-contract.ts` — der PII-Filter
**LLM-Kontextvertrag:** Was den Server Richtung Claude-API verlässt, wird erst pseudonymisiert: Personen erscheinen als GUID + Rollenklasse („Erwachsener", „Jugendlicher") + Constraint-Tags + reine Zahlen (Kalorienziel, Portionen) — niemals echte Namen, Haushaltsname oder der Beruf/Alltag-Freitext aus dem Onboarding. Rezept-Pool, Angebotsliste und Wochenmuster sind nicht-personenbezogen und gehen vollständig. Umsetzung: Der Planner erhält nur die gefilterte Projektion; das Mapping GUID↔Person passiert in `context-contract.ts`, der Plan wird nach der Validierung re-pseudonymisiert zurückübersetzt. Start mit dem Minimal-Kern; server-seitiges Log zählt, wenn der Planner Informationen vermisst — Qualitätsverlust = Vertrag um ein Feld erweitern (reversibel), nie umgekehrt. Im PoC gibt es einen festen Haushalt (kein Tenant-Begriff), aber die GUID-Pseudonymisierung ist die Form, die später auf Multi-Tenant vererbt.
Lerner-Anstoß (PII-Minimierung), Ausgestaltung Agent-Empfehlung, im Spec festgehalten.

### `apps/api/src/domain/aggregation.ts` — der Rechner
Deterministisch: aggregiert Zutaten der Wochenrezepte zu Listenpositionen (Grammaturen summieren, Stück aufpacken: „2× Zucchini"), zieht Preise + Angebots-Badges aus dem Snapshot, gruppiert nach Abteilung, rechnet kcal aus `data/nutrition.json`. Hier liegen die Vitest-Tests, denn „nachrechenbar" ist eine Prüfkriterium-Anforderung.
Implementiert `prd.md > Einkaufsliste`.

### `apps/api/src/offers/store.ts` — die Angebotsnaht
`OfferSource`-Interface: `latest()` liefert den neuesten Snapshot aus `data/offers/*.json` (date-stamp im Dateinamen + `fetchedAt`/`source` im File). `refresh()` scannt erneut (später: echter Fetcher/Cron dahinter). Snapshot-Erzeugung im Build: Agent liest die aktuellen Lidl-/Aldi-Süd-Angebotsseiten und überführt 20–30 reale Aktionen in JSON — echte Daten, Herkunft dokumentiert.
Implementiert `prd.md > Angebots-Basis`.

### `data/recipes.json` — der Rezept-Pool
~24 kuratierte discounter-typische Rezepte mit Zutaten (Gramm/Stück), Tags (`vegetarisch`, `milchfrei`, `schnell`), Kurz-Anleitung, Abteilungen. Handautoriert im Build; externe Rezept-DBs sind später-Thema (Lerner-Hinweis: FOSS-Rezept-DBs existieren — für den PoC Overhead).
Erfüllt die Arbeitsannahme aus `prd.md > Open Questions`.

### Persistenz
SQLite-Tabellen: `household`, `person`, `week_plan` (inkl. Tage/Mahlzeiten als JSON-Spalte, gültig gegen zod), `list_item`, `event`. Alles überlebt Neustart (Bind-Mount); einziger Schreibprozess ist der API-Container — kein Locking-Thema.
Erfüllt `prd.md > States and Boundaries` (Persistenz).

## Data Model

Datenfluss: **Herkunft** — Personen/Muster: Nutzereingabe im Onboarding; Angebote: datierte Snapshots (Build/Agent, später Fetcher); Rezepte: kuratierte Datei; Plan: LLM-Ausgabe nach Validierung; Liste: deterministisch aus Plan×Rezepten. **Speicher** — alles in SQLite unter `data/app.db`; Snapshots/Rezepte/Nährwerte als JSON-Dateien daneben. **Transport** — REST/JSON, Typen aus `packages/shared`. **Rückkehr** — beim Wiederöffnen lädt `GET /api/state` den kompletten Stand: Haushalt, letzter Plan, Liste samt Abhak-Status. Kernobjekte (zod): `Person { id, name, role, colorPair, constraints[], calorieGoal?, activityProfile? }`, `Offer { id, store, product, amount, priceCents, wasOffer: boolean, department }`, `WeekPlan { weekOf, store, days[7] { meals[] { slot, recipeId, servings, persons[] , quick?: boolean } }, basedOnOffers: number, offersDated }`, `ListItem { id, department, product, amount, priceCents?, offer?: boolean, checked }`.

## File Structure

```
familien-einkaufsplaner/
├── apps/
│   ├── web/                      # Vite + React SPA
│   │   └── src/
│   │       ├── views/            # Main, DayDetail, ShoppingList, Onboarding, Settings
│   │       ├── components/       # WeekStrip, NextMealCard, ListRow, PersonSwitcher, OfferBadge
│   │       ├── theme/            # pastell-palette.css, theme.ts (Light/Dark/System, Font-Size, Motion)
│   │       └── lib/api.ts        # typisierter Client auf packages/shared
│   └── api/
│       └── src/
│           ├── routes/           # state, household, persons, plan, shoppingList, offers
│           ├── llm/planner.ts    # Claude-Aufruf, Structured Output, Retry
│           ├── domain/           # aggregation.ts, nutrition.ts, weeklogic.ts
│           ├── offers/store.ts   # OfferSource: Snapshots laden/refreshen
│           └── db/               # sqlite.ts, migrate.ts
├── packages/
│   └── shared/                   # zod-Schemas + Typen (Person, Offer, WeekPlan, ListItem, …)
├── data/                         # Docker-Bind-Mount
│   ├── app.db                    # SQLite
│   ├── offers/                   # 2026-09-23_aldi-sued.json, 2026-09-23_lidl.json …
│   ├── recipes.json              # kuratierter Pool (~24)
│   └── nutrition.json            # kcal je Zutat
├── docker/                       # Dockerfile, compose.yaml (Mount data/)
├── devpost/                      # Learning-Workspace (scope, prd, spec …)
├── .env.example                  # ohne Geheimnis; .env bleibt ge-ignored
└── README.md
```

## External Services and Dependencies

- **Anthropic API** — einziger externer Dienst. Aufruf: Messages-Endpoint mit Schema-Zwangsantwort, server-seitig, Key aus `.env`. Doku: https://docs.anthropic.com · SDK: https://github.com/anthropics/anthropic-sdk-typescript. Kosten: Cent-Beträge für den PoC (genaue Preise zu Build-Beginn verifizieren — heute nicht live geprüft). Rate Limits für diesen Anwendungsfall unkritisch (einzelne Aufrufe, kein Loop).
- **Lidl/Aldi-Süd-Websites** — *nicht* zur Laufzeit der App: Quelle für die Momentaufnahme, die im Build (vom Agenten) in `data/offers/` überführt wird. Kein Scraping-Code im Produkt.
- Alles Weitere (React, Fastify, better-sqlite3, zod, Vitest) ist Paketabhängigkeit, kein Dienst.

## Important Failure Modes

- **LLM liefert unbrauchbaren Plan** (Schema-Verletzung, vegetarisches Gericht für Maelle trotz Check) → Validierung fängt es: max. 2 Retries mit Fehlerkontext, danach klare Fehlermeldung „Plan konnte nicht erzeugt werden" — der bisherige Plan bleibt unangetastet.
- **Kein aktueller Angebots-Snapshot** → offene Meldung mit Datum der letzten Lage + Option „trotzdem planen" (Plan wird als „ohne aktuelle Angebote" markiert); stehendes Sortiment trägt die Grundversorgung.
- **Anthropic-API langsam/erreichbar** → Ladeanzeige, Timeout-Meldung; Plan/Liste bleiben nutzbar, Liste aus bestehendem Plan neu berechenbar ohne LLM.

## What Was Simplified and Why

- **Datierte echte Snapshots** statt Live-Scraper — echte Daten ohne die fragilste Komponente; der spätere Fetcher dockt an `OfferSource` an. (Kern-Idee „echte Angebote" bleibt intakt — die Daten *sind* echt.)
- **Refresh beim Laden/per Knopf** statt nächtlichem Cron-Job (Lerner-Idee, bewusst auf „nach erstem Deploy" verschoben) — sichtbares Timing statt Hintergrundmagie.
- **Voller Angebots-Payload beim Start** statt Delta-Protokoll — ein paar KB JSON; Delta lohnt ab tausenden Positionen.
- **SQLite-Datei** statt Cloud-DB (GCP wurde erwogen) — ein Dienst weniger, gleiche Datenform.
- **Profil-Umschalter** statt Auth (aus PRD) — die Mehrpersonen-Idee ohne Kontosystem.
- **Kuratieter Rezept-Pool** statt externer Rezept-DB — Rezepte sind Produktionsdetail, nicht Beweis.
- **kcal aus Nährwert-Tabelle** statt LLM-Schätzung — nachrechenbar schlägt geführt.

## Decisions and Open Issues

**Lerner-Entscheidungen:** Docker + `data/`-Mount; Monorepo; typisierte Antworten Ende-zu-Ende; server-seitiges LLM mit begrenztem Aufgabenscope (Rezeptauswahl, Allergiecheck, Wochenplan, Kalorienabschätzung); PII-Minimierung am LLM-Aufruf („nur IDs/GUIDs, kein PII"); Planen und Einkaufen als entkoppelte Rollen (keine Architektur-Folgen — der Profil-Umschalter ist ein reiner Ansichtswechsel). Ideen, die im Gespräch verworfen wurden: HTMX, GCP-Cloud-DB, Protobuf/SignalR, nächtlicher Cron (verschoben), Delta-Protokoll.

**Agent-Empfehlungen, vom Lerner bestätigt:** TypeScript überall, Fastify, SQLite, REST+JSON, Snapshot-Strategie statt Scraper, Nährwert-Tabelle statt LLM-Schätzung, Monorepo statt Zwei-Repos-Split (auf explizite Nachfrage des Lerners mit Begründung bekräftigt: geteilte Typen schlagen Repos-Grenzen).

**LLM-Kontextvertrag (offen gewesene Stelle, jetzt entschieden):** Der Lerner war unsicher zwischen „nur Kerne" und vollständigem Kontext. Entscheidung: Minimal-Kern pseudonymisiert starten (GUIDs, Rollenklassen, Tags, Zahlen) + server-seitiges Miss-Log; Qualitätsverlust wird durch kontrolliertes Erweitern des Vertrags beantwortet, nie durch PII-Nachschub. Beleg im Build: Planner-Testlauf mit/ohne einzelne Vertragsfelder.

**Ein echtes Unbekanntes, das im Interview geklärt wurde:** Wie zuverlässig bekommt das LLM eine *validierbare* Planstruktur? Geklärt durch: Schema-Zwangsantwort auf API-Ebene + zod-Validierung server-seitig + max. 2 kontrollierte Retries + „letzter guter Plan bleibt stehen". Im Build zu belegen: ein Testfall, der die Invalid-Antwort-Route demonstrativ durchläuft (geflasher Mock), damit der Fallback nicht nur behauptet, sondern gezeigt ist.

**Offen (blockiert Freigabe nicht):** Exaktes Anthropic-Modell + Preis + SDK-Schema-API zu Build-Beginn verifizieren (oben markiert). Caddy/Subdomain-Details bewusst an `6-ship` delegiert. Rezept-Pool-Quelle fürs PoC geklärt (kuratiert, handautoriert); FOSS-Rezept-DBs als spätere Anreicherung notiert.

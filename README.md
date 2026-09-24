# Familien-Einkaufsplaner

Ein Haushalt, ein Plan, ein Einkauf: Aus den **echten Wochenangeboten eines
Discounters** (Penny, über deren Angebots-API) baut ein LLM-Planner einen
Essensplan für den ganzen Haushalt — mit Einschränkungen pro Person (unverträglich
→ Anpassung am Gericht, Allergie → allergenfreies Basisgericht), nachrechenbarer
Einkaufsliste mit Kaufgebinde-Restverwertung und Events, die Plan und Liste sofort
skalieren (der Grillabend mit den Nachbarn).

Built With AI: Basics — Devpost-Lern-Hackathon. Geplant in `devpost/`
(Scope, PRD, Spec, Build-Checkliste mit Revisionsprotokoll).

## Schnellstart (Entwicklung)

```bash
pnpm install
cp .env.example .env        # ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL eintragen
pnpm dev                    # API auf :3001, Web auf :5173
```

Erster Start: „Mit Demo-Familie testen“ (Familie Expedition 33) oder eigener
Haushalt, Person für Person. Dann Laden wählen → „Plan erstellen“ (~30 s,
echter LLM-Aufruf) → Wochenstreifen, Tagesansicht, Einkaufsliste.

## Schnellstart (Docker — Demo-Pflichtweg)

```bash
docker compose up
# → http://localhost:8080
```

`data/` ist als Bind-Mount eingehängt (SQLite + Angebots-Snapshots + Rezept-Pool);
die gebaute SPA serviert der API-Container selbst.

## Nützliche Skripte

| Befehl | Was passiert |
|---|---|
| `pnpm dev` | beides im Watch-Modus |
| `pnpm build` / `pnpm test` | Build / Vitest (29 Fälle) |
| `pnpm offers:fetch` | frische Penny-Angebote der Woche ziehen (Build-Zeit, nie zur App-Laufzeit) |
| `pnpm offers:validate` | Datenbasis gegen zod-Schemata prüfen |
| `pnpm plan:assert` | laufenden Plan gegen die Prüfregeln attestieren (7 Tage, Constraints, Angebotsbasis) |

## Architektur in einem Absatz

Vite + React SPA → Fastify-REST-API (typisierte Endpunkte über gemeinsame
zod-Schemata in `packages/shared`) → SQLite-Datei im `data/`-Mount. Der Planner
sammelt Personen (pseudonymisiert: GUIDs statt Namen — was den Server verlässt,
wird in `context-contract.ts` hart bewacht), Rezept-Pool, Wochenmuster und den
jüngsten Angebots-Snapshot in einen einzigen LLM-Aufruf; die Antwort wird per zod
validiert (max. 3 Versuche mit Fehlerkontext inkl. Constraint-Prüfung), die
Einkaufsliste rechnet ein deterministischer Aggregator aus Rezepten × Kaufgebinden
× Nährwert-Tabelle — kein LLM.

## Struktur

```
apps/web        React-SPA (Ansichten: Haupt, Tag, Liste, Onboarding/Einstellungen)
apps/api        Fastify + Planner + Aggregation + Angebots-/Listen-Store
packages/shared zod-Schemata & Typen für alle Endpunkte
data/           SQLite, Angebots-Snapshots, Rezept-Pool, Kaufgebinde, Nährwerte
devpost/        Planungs- und Lern-Workspace (Scope, PRD, Spec, Checkliste, Backlog)
```

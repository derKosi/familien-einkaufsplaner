import Anthropic from "@anthropic-ai/sdk";
import type { PlannerOutput, Person, Store } from "@fep/shared";
import { buildPlannerContext, type PlannerContext } from "../src/llm/context-contract.js";
import { generateWeekPlan, PlannerError, type PlanClient } from "../src/llm/planner.js";

/**
 * Planner-Risiko-Proof (checklist.md > Slice 2).
 *
 *   pnpm planner:smoke          → PII-Check + beide Mock-Routen (Retry→Erfolg, Retry→Fehler)
 *   pnpm planner:smoke --live   → echter Claude-Aufruf (braucht ANTHROPIC_API_KEY)
 *
 * Der Kontext im Output ist exakt das, was der Server Richtung Claude schickt —
 * Namen dürfen dort keine auftauchen.
 */

// ─── Fixture: Mini-Ausgabe des echten Datenbestands ───

const FIXTURE_PERSONS: Person[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Lune",
    roleClass: "Erwachsener",
    colorPair: "salbei",
    constraints: [],
    calorieGoal: null,
    activityProfile: "Planung und Kochen, viel unterwegs",
    complete: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Verso",
    roleClass: "Erwachsener",
    colorPair: "aprikot",
    constraints: [],
    calorieGoal: 2000,
    activityProfile: "Bürojob, eher wenig Bewegung",
    complete: true,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Gustav",
    roleClass: "Erwachsener",
    colorPair: "himmel",
    constraints: ["milchfrei"],
    calorieGoal: null,
    activityProfile: null,
    complete: true,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Maelle",
    roleClass: "Jugendlicher",
    colorPair: "lavendel",
    constraints: ["vegetarisch"],
    calorieGoal: null,
    activityProfile: null,
    complete: true,
  },
];

const E33_PATTERN: PlannerContext["weekPattern"] = [
  ...[0, 1, 2, 3, 4].flatMap((day) => [
    { day, slot: "Frühstück" as const, personRefs: FIXTURE_PERSONS.map((p) => p.id) },
    { day, slot: "Mittag" as const, personRefs: [FIXTURE_PERSONS[0].id, FIXTURE_PERSONS[1].id] },
    { day, slot: "Abendessen" as const, personRefs: FIXTURE_PERSONS.map((p) => p.id) },
  ]),
  { day: 5, slot: "Mittag" as const, personRefs: FIXTURE_PERSONS.map((p) => p.id) },
  ...(["Frühstück", "Mittag", "Abendessen"] as const).map((slot) => ({
    day: 6,
    slot,
    personRefs: FIXTURE_PERSONS.map((p) => p.id),
  })),
];

const FIXTURE_RECIPES: PlannerContext["recipes"] = [
  { id: "r-haferfruehstueck", title: "Haferbrei mit Obst", tags: ["vegetarisch"], quick: true, servingsBase: 4 },
  { id: "r-beerenmuesli", title: "Beeren-Müsli mit Joghurt", tags: ["vegetarisch"], quick: true, servingsBase: 4 },
  { id: "r-linsenbolognese", title: "Linsen-Bolognese", tags: ["vegetarisch", "milchfrei"], quick: false, servingsBase: 4 },
  { id: "r-putengeschnetzeltes", title: "Putengeschnetzeltes mit Reis", tags: [], quick: false, servingsBase: 4 },
  { id: "r-ofengemuese-kaese", title: "Ofengemüse mit Feta", tags: ["vegetarisch"], quick: false, servingsBase: 4 },
  { id: "r-haehnchenwrap", title: "Hähnchenwraps", tags: [], quick: true, servingsBase: 2 },
  { id: "r-tofupfanne", title: "Tofu-Gemüse-Pfanne", tags: ["vegetarisch", "milchfrei", "vegan"], quick: true, servingsBase: 4 },
];

const FIXTURE_OFFERS: PlannerContext["offers"] = [
  { store: "aldi-sued", product: "Haferflocken", amount: "500 g", priceCents: 85 },
  { store: "aldi-sued", product: "Rote Linsen", amount: "500 g", priceCents: 129 },
  { store: "aldi-sued", product: "Putengeschnetzeltes", amount: "400 g", priceCents: 349 },
  { store: "aldi-sued", product: "Feta", amount: "200 g", priceCents: 149 },
  { store: "lidl", product: "Tofu", amount: "2× 200 g", priceCents: 199 },
  { store: "lidl", product: "Geflügelfleisch", amount: "400 g", priceCents: 329 },
  { store: "lidl", product: "Beeren-Mix (TK)", amount: "300 g", priceCents: 199 },
  { store: "aldi-sued", product: "Joghurt natur", amount: "500 g", priceCents: 99 },
];

function fixtureContext(): PlannerContext {
  return buildPlannerContext({
    weekPattern: E33_PATTERN,
    persons: FIXTURE_PERSONS,
    recipes: FIXTURE_RECIPES,
    offers: FIXTURE_OFFERS,
  });
}

// ─── PII-Nachweis ───

function piiCheck(): void {
  const context = fixtureContext();
  const json = JSON.stringify(context);
  const leaked = FIXTURE_PERSONS.filter(
    (p) => json.includes(p.name) || (p.activityProfile !== null && json.includes(p.activityProfile)),
  );
  if (leaked.length > 0) {
    throw new Error(`PII-Check FEHLGESCHLAGEN: ${leaked.map((p) => p.name).join(", ")} im Kontext.`);
  }
  console.log("✓ PII-Check: Kontext enthält keine Namen und keine Aktivitätsprofile.");
  console.log("  Personen im Kontext:", context.persons.map((p) => `${p.personRef.slice(0, 8)}… (${p.roleClass}${p.constraints.length ? ", " + p.constraints.join("/") : ""}${p.calorieGoal ? ", " + p.calorieGoal + " kcal" : ""})`).join(" · "));
}

// ─── Flash-Mocks (deterministisch, ohne Key) ───

/** Antworten als Textblöcke — so wie der echte Client sie liefert (Fences inklusive). */
let scripted: Array<{ content: Array<{ type: string; text?: string }> }>;

function textResponse(payload: unknown | string): { content: Array<{ type: string; text?: string }> } {
  const text = typeof payload === "string" ? payload : "```json\n" + JSON.stringify(payload, null, 2) + "\n```";
  return { content: [{ type: "text", text }] };
}

function mockClient(): PlanClient {
  return {
    messages: {
      async create() {
        const next = scripted.shift();
        if (!next) throw new Error("Mock-Skript erschöpft");
        return next;
      },
    },
  };
}

const VALID_PLAN: PlannerOutput = {
  days: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    meals: E33_PATTERN.filter((e) => e.day === day && e.personRefs.length > 0).map((entry) => ({
      slot: entry.slot,
      recipeId: entry.slot === "Abendessen" ? "r-linsenbolognese" : "r-haferfruehstueck",
      personRefs: entry.personRefs,
      servings: entry.personRefs.length,
      quick: entry.slot !== "Abendessen",
    })),
  })),
  missingInfo: ["Vorlieben der Kinder (z. B. süß vs. herzhaft)"],
};

async function mockRecoveryRoute(): Promise<void> {
  scripted = [
    // Versuch 1: Schema-Verletzung (nur 3 Tage statt 7), höflich im Fence
    textResponse({ days: VALID_PLAN.days.slice(0, 3), missingInfo: [] }),
    // Versuch 2: fachlicher Fehler (unbekannte recipeId)
    textResponse({
      ...VALID_PLAN,
      days: VALID_PLAN.days.map((d) => ({
        ...d,
        meals: d.meals.map((m) => ({ ...m, recipeId: "r-existiert-nicht" })),
      })),
    }),
    // Versuch 3: sauber — diesmal ausgerechnet OHNE Fence, fällt unter Extraktion
    textResponse(JSON.stringify(VALID_PLAN)),
  ];

  const { plan, attempts } = await generateWeekPlan(mockClient(), fixtureContext());
  if (attempts.length !== 2) throw new Error(`Erwartete 2 Retries, got ${attempts.length}`);
  console.log(`✓ Retry-Route: 2 Fehler abgefangen, 3. Versuch sauber.`);
  console.log(`  Fehler im Kontext der Retries: ${attempts.map((a) => `"${a.slice(0, 60)}…"`).join(" | ")}`);
  console.log(`  Plan: ${plan.days.length} Tage, missingInfo: ${plan.missingInfo.length} Eintrag/Einträge`);
}

async function mockFailureRoute(): Promise<void> {
  scripted = [
    textResponse("Ich habe leider keinen Plan für dich. [{]}"),
    textResponse({ days: [], missingInfo: [] }),
    textResponse("woops"),
  ];

  try {
    await generateWeekPlan(mockClient(), fixtureContext());
    throw new Error("Erwartete PlannerError — Plan wurde aber akzeptiert!");
  } catch (e) {
    if (!(e instanceof PlannerError)) throw e;
    console.log(`✓ Fehler-Route: nach 3 Versuchen sauber abgelehnt.`);
    console.log(`  Meldung: ${e.message} Gründe: ${e.attempts.length}`);
  }
}

// ─── Echter Aufruf ───

async function liveRoute(): Promise<void> {
  const client = new Anthropic(); // löst ANTHROPIC_API_KEY selbst auf
  console.log("… Echter Aufruf läuft (das kann einige Sekunden dauern) …");
  const { plan, attempts } = await generateWeekPlan(client, fixtureContext());
  console.log(`✓ Echter Aufruf erfolgreich${attempts.length ? ` (nach ${attempts.length} Retries)` : ""}.`);
  const slots = plan.days.flatMap((d) => d.meals.map((m) => `${d.day} ${m.slot}: ${m.recipeId} ×${m.servings}`));
  console.log(slots.join("\n"));
  console.log(`missingInfo: ${plan.missingInfo.length ? plan.missingInfo.join(" | ") : "—"}`);
}

// ─── Haupt ───

const live = process.argv.includes("--live");
piiCheck();
await mockRecoveryRoute();
await mockFailureRoute();
if (live) await liveRoute();
else console.log("ℹ Live-Aufruf übersprungen (--live fehlt oder kein Key).");

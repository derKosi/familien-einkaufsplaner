import { buildPlannerContext } from "../src/llm/context-contract.js";

/** Zeigt den exakten Prompt, den der Planner an die API schickt (Fixtures, ohne Aufruf). */
const FIXTURE_PERSONS = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Lune", roleClass: "Erwachsener", colorPair: "salbei", constraints: [], calorieGoal: null, activityProfile: "Planung und Kochen, viel unterwegs", complete: true },
  { id: "22222222-2222-4222-8222-222222222222", name: "Verso", roleClass: "Erwachsener", colorPair: "aprikot", constraints: [], calorieGoal: 2000, activityProfile: "Bürojob, eher wenig Bewegung", complete: true },
  { id: "33333333-3333-4333-8333-333333333333", name: "Gustav", roleClass: "Erwachsener", colorPair: "himmel", constraints: ["milchfrei"], calorieGoal: null, activityProfile: null, complete: true },
  { id: "44444444-4444-4444-8444-444444444444", name: "Maelle", roleClass: "Jugendlicher", colorPair: "lavendel", constraints: ["vegetarisch"], calorieGoal: null, activityProfile: null, complete: true },
] as const;

const pattern = [
  ...[0, 1, 2, 3, 4].flatMap((day) => [
    { day, slot: "Frühstück", personRefs: FIXTURE_PERSONS.map((p) => p.id) },
    { day, slot: "Mittag", personRefs: FIXTURE_PERSONS.slice(0, 2).map((p) => p.id) },
    { day, slot: "Abendessen", personRefs: FIXTURE_PERSONS.map((p) => p.id) },
  ]),
  { day: 5, slot: "Mittag", personRefs: FIXTURE_PERSONS.map((p) => p.id) },
  ...(["Frühstück", "Mittag", "Abendessen"] as const).map((slot) => ({ day: 6, slot, personRefs: FIXTURE_PERSONS.map((p) => p.id) })),
];

const context = buildPlannerContext({
  weekPattern: pattern,
  persons: FIXTURE_PERSONS.map((p) => ({ ...p })),
  recipes: [
    { id: "r-haferfruehstueck", title: "Haferbrei mit Obst", tags: ["vegetarisch"], quick: true, servingsBase: 4 },
    { id: "r-beerenmuesli", title: "Beeren-Müsli mit Joghurt", tags: ["vegetarisch"], quick: true, servingsBase: 4 },
    { id: "r-linsenbolognese", title: "Linsen-Bolognese", tags: ["vegetarisch", "milchfrei"], quick: false, servingsBase: 4 },
    { id: "r-putengeschnetzeltes", title: "Putengeschnetzeltes mit Reis", tags: [], quick: false, servingsBase: 4 },
    { id: "r-ofengemuese-kaese", title: "Ofengemüse mit Feta", tags: ["vegetarisch"], quick: false, servingsBase: 4 },
    { id: "r-haehnchenwrap", title: "Hähnchenwraps", tags: [], quick: true, servingsBase: 2 },
    { id: "r-tofupfanne", title: "Tofu-Gemüse-Pfanne", tags: ["vegetarisch", "milchfrei", "vegan"], quick: true, servingsBase: 4 },
  ],
  offers: [
    { store: "aldi-sued", product: "Haferflocken", amount: "500 g", priceCents: 85 },
    { store: "aldi-sued", product: "Rote Linsen", amount: "500 g", priceCents: 129 },
    { store: "aldi-sued", product: "Putengeschnetzeltes", amount: "400 g", priceCents: 349 },
    { store: "aldi-sued", product: "Feta", amount: "200 g", priceCents: 149 },
    { store: "lidl", product: "Tofu", amount: "2× 200 g", priceCents: 199 },
    { store: "lidl", product: "Geflügelfleisch", amount: "400 g", priceCents: 329 },
    { store: "lidl", product: "Beeren-Mix (TK)", amount: "300 g", priceCents: 199 },
    { store: "aldi-sued", product: "Joghurt natur", amount: "500 g", priceCents: 99 },
  ],
});

console.log(`=== SYSTEM (regeln) + KONTEXT, gesamt ~${Math.ceil(JSON.stringify(context).length / 3.5)} Token Kontext-JSON ===`);
console.log(`model: ${process.env.FEP_MODEL ?? "claude-opus-5"} · max_tokens: 16000 · output_config: {format: zodOutputFormat(PlannerOutput)}`);
console.log(JSON.stringify(context, null, 2));

import { z } from "zod";

// Reihenfolge ist hier Abhängigkeitsordnung — AppState (alles-umfassend) steht zuletzt.

/** Rollenklasse — die einzige Personenangabe, die später den Server Richtung LLM verlässt (Kontextvertrag). */
export const RoleClass = z.enum(["Erwachsener", "Jugendlicher", "Kind"]);
export type RoleClass = z.infer<typeof RoleClass>;

/** Bekannte Einschränkungs-Tags; erweiterbar, aber fest benannt für Planner und Filter. */
export const ConstraintTag = z.enum(["vegetarisch", "milchfrei", "vegan", "glutenfrei"]);
export type ConstraintTag = z.infer<typeof ConstraintTag>;

/** Pastell-Paar (Main + Akzent) — identifiziert die Person in der Ansicht. */
export const ColorPair = z.enum(["salbei", "aprikot", "lavendel", "himmel"]);
export type ColorPair = z.infer<typeof ColorPair>;

export const Person = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  roleClass: RoleClass,
  colorPair: ColorPair,
  /** Weiche Einschränkungen (Unverträglichkeit/Präferenz) — per Anpassung am Basisgericht lösbar. */
  constraints: z.array(ConstraintTag).default([]),
  /**
   * Harte Allergien (Checkpoint „Erdnussbutter"): lassen sich am fertigen Gericht
   * NICHT rausnehmen — das Basisgericht muss das schon erfüllen, keine Anpassung.
   */
  allergies: z.array(ConstraintTag).default([]),
  /** Optionales Tages-Kalorienziel; der Plan rechnet es ein, die UI zeigt es dezent. */
  calorieGoal: z.number().int().positive().nullable().default(null),
  /** Freitext aus dem Onboarding (Beruf/Alltag) — verlässt den Server nie (PII-Filter). */
  activityProfile: z.string().nullable().default(null),
  /** Skip/Later: eine Person mit Lücken bleibt im Haushalt, wird markiert und später vervollständigt. */
  complete: z.boolean().default(true),
});
export type Person = z.infer<typeof Person>;

export const Household = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  persons: z.array(Person),
});
export type Household = z.infer<typeof Household>;

// ─── Angebots-Basis (spec.md > offers/store.ts, prd.md > Angebots-Basis) ───

/** Discounter-Auswahl für Plan und Snapshots — Penny ist die verdrahtete Quelle. */
export const Store = z.enum(["penny", "aldi-sued", "lidl"]);
export type Store = z.infer<typeof Store>;

/** Ladenabteilungen für Listen-Gruppierung und Rezept-Zutaten (spec.md > aggregation.ts). */
export const Department = z.enum([
  "Obst & Gemüse",
  "Fleisch & Wurst",
  "Kühlregal",
  "Grundnahrung",
  "Getränke",
  "Süßwaren",
  "Tiefkühl",
  "Drogerie & Haushalt",
  "Aktionen",
]);
export type Department = z.infer<typeof Department>;

/** Eine Angebotsposition aus einem Snapshot (spec.md > Data Model > Offer). */
export const Offer = z.object({
  /** Produkt-GUID der Quelle — bei Penny die ID aus der Angebots-API. */
  id: z.string().min(1),
  store: Store,
  product: z.string().min(1),
  /** Mengenangabe als Text der Quelle („je 10 x 50 g") — keine Rechenmenge. */
  amount: z.string().nullable(),
  priceCents: z.number().int().nonnegative(),
  /** Regulärer Preis, falls geliefert — Basis für Anzeige „-31%". */
  listPriceCents: z.number().int().nonnegative().nullable(),
  department: Department,
});
export type Offer = z.infer<typeof Offer>;

/** Eine datierte Momentaufnahme — eine Datei in data/offers/ (spec.md > offers/store.ts). */
export const OffersSnapshot = z.object({
  store: Store,
  /** ISO-Kalenderwoche der Quelle, z. B. „2026-39". */
  week: z.string().regex(/^\d{4}-\d{2}$/),
  fetchedAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "kein ISO-Datum"),
  /** Herkunft dokumentiert (spec.md: „echte Daten, Herkunft dokumentiert"). */
  source: z.string().min(1),
  offers: z.array(Offer).min(1),
});
export type OffersSnapshot = z.infer<typeof OffersSnapshot>;

/** Kompakte Angebots-Lage für Kopfzeile und AppState — ohne vollen Payload. */
export const OffersSummary = z.object({
  store: Store,
  fetchedAt: z.string(),
  count: z.number().int().positive(),
});
export type OffersSummary = z.infer<typeof OffersSummary>;

/** GET /api/offers/latest */
export const LatestOffersResponse = z.object({
  snapshot: OffersSnapshot.nullable(),
});
export type LatestOffersResponse = z.infer<typeof LatestOffersResponse>;

/** POST /api/offers/refresh */
export const RefreshOffersResponse = z.object({
  offers: OffersSummary.nullable(),
});
export type RefreshOffersResponse = z.infer<typeof RefreshOffersResponse>;

// ─── Planner: Wochenplan-Generierung (spec.md > llm/planner.ts, context-contract.ts) ───

export const MealSlot = z.enum(["Frühstück", "Mittag", "Abendessen"]);
export type MealSlot = z.infer<typeof MealSlot>;

/**
 * Anpassung für eine Person am Basisgericht (Checkpoint-Entscheidung):
 * Gemeinsame Gerichte bleiben der Normalfall — Einschränkungen löst der Plan
 * über konkrete Zubereitungs-Anpassungen, nicht durch Restriktion für alle.
 */
export const MealAdaptation = z.object({
  personRef: z.string().uuid(),
  /** Konkrete Abwandlung, z. B. „Käse nur auf die anderen Portionen". */
  note: z.string().min(3).max(140),
});
export type MealAdaptation = z.infer<typeof MealAdaptation>;

/** Eine Mahlzeit im Plan — Personen nur als GUID-Referenz (Kontextvertrag: keine Namen). */
export const PlannerMeal = z.object({
  slot: MealSlot,
  recipeId: z.string().min(1),
  personRefs: z.array(z.string().uuid()).min(1),
  servings: z.number().int().positive(),
  /** Schnellkochbar für Werktage (prd.md > Wochenplan). */
  quick: z.boolean(),
  /** Nur wenn das Basisgericht eine weiche Einschränkung verletzt — sonst leer. */
  adaptations: z.array(MealAdaptation).default([]),
});
export type PlannerMeal = z.infer<typeof PlannerMeal>;

export const PlannerDay = z.object({
  /** 0 = Montag … 6 = Sonntag */
  day: z.number().int().min(0).max(6),
  meals: z.array(PlannerMeal),
});
export type PlannerDay = z.infer<typeof PlannerDay>;

/** Die vom LLM erwartete Antwortstruktur — wird server-seitig gegen das Rezept-Pool geprüft. */
export const PlannerOutput = z.object({
  days: z.array(PlannerDay).min(7).max(7),
  /** Miss-Log: Felder, die im Kontext für eine bessere Planung fehlen (spec.md > Kontextvertrag). */
  missingInfo: z.array(z.string()),
});
export type PlannerOutput = z.infer<typeof PlannerOutput>;

// ─── Wochenplan (spec.md > Data Model > week_plan) ───

/**
 * Zubereitungs-/Essens-Status (Checkpoint-Runde 2): „auto" lässt die Uhrzeit
 * entscheiden (Vergangenes gilt als gegessen — Vorschlag, kein Knast), „ja"/
 * „nein" ist die manuelle Korrektur, die gewinnt. Alte Pläne mit true/false
 * werden beim Laden überführt.
 */
export const PreparedState = z.preprocess(
  (v) => (v === true ? "ja" : v === false ? "nein" : v ?? "auto"),
  z.enum(["auto", "ja", "nein"]),
);
export type PreparedState = z.infer<typeof PreparedState>;

/** Gespeicherte Mahlzeit — Personen als GUID-Liste, übersetzt aus dem Planner-Output. */
export const StoredMeal = z.object({
  slot: MealSlot,
  recipeId: z.string().min(1),
  servings: z.number().int().positive(),
  /** GUIDs der Mitesser (PlannerMeal.personRefs, unverändert persistiert). */
  persons: z.array(z.string().uuid()).min(1),
  quick: z.boolean(),
  adaptations: z.array(MealAdaptation).default([]),
  prepared: PreparedState.default("auto"),
});
export type StoredMeal = z.infer<typeof StoredMeal>;

export const StoredDay = z.object({
  /** 0 = Montag … 6 = Sonntag */
  day: z.number().int().min(0).max(6),
  meals: z.array(StoredMeal),
});
export type StoredDay = z.infer<typeof StoredDay>;

/** Ein persistierter Wochenplan — genau einer pro Haushalt; Regenerieren ersetzt ihn. */
export const WeekPlan = z.object({
  /** Montag der Planwoche, ISO-Datum. */
  weekOf: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "kein ISO-Datum"),
  store: Store,
  basedOnOffers: z.number().int().nonnegative(),
  /** Datum der Angebotslage — null = Plan ohne aktuelle Angebote (ehrlich markiert). */
  offersDated: z.string().nullable(),
  days: z.array(StoredDay).min(7).max(7),
  /** Miss-Log des Planner-Laufs — Transparenz statt Magie. */
  missingInfo: z.array(z.string()).default([]),
});
export type WeekPlan = z.infer<typeof WeekPlan>;

/** POST /api/plan/generate */
export const GeneratePlanRequest = z.object({
  store: Store,
  /** Ohne Angebots-Snapshot trotzdem planen (Plan wird ehrlich markiert). */
  allowNoOffers: z.boolean().default(false),
});
export type GeneratePlanRequest = z.infer<typeof GeneratePlanRequest>;

/** Fehlertexte der API für den typisierten Client. */
export const ApiError = z.object({
  error: z.string(),
  code: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiError>;

// ─── Rezept-Pool & Nährwerte (spec.md > data/recipes.json, data/nutrition.json) ───

/** Rezept-Tags: Constraint-Tags für den Planner-Check plus „schnell" für Werktage. */
export const RecipeTag = z.enum(["vegetarisch", "milchfrei", "vegan", "glutenfrei", "schnell"]);
export type RecipeTag = z.infer<typeof RecipeTag>;

export const Unit = z.enum(["g", "ml", "Stück", "EL", "TL", "Prise"]);
export type Unit = z.infer<typeof Unit>;

/** Zutat mit Rechenmenge — **Mengen sind pro Portion**, der Plan skaliert via servings. */
export const RecipeIngredient = z.object({
  /** Schlüssel in nutrition.json — identisch geschrieben. */
  item: z.string().min(1),
  amount: z.number().positive(),
  unit: Unit,
  department: Department,
});
export type RecipeIngredient = z.infer<typeof RecipeIngredient>;

export const Recipe = z.object({
  /** Slug, referenziert vom Wochenplan (PlannerMeal.recipeId). */
  id: z.string().min(1),
  title: z.string().min(1),
  tags: z.array(RecipeTag),
  ingredients: z.array(RecipeIngredient).min(1),
  /** Kurz-Anleitung, 2–4 Schritte (PoC-Tiefe). */
  steps: z.array(z.string()).min(1),
});
export type Recipe = z.infer<typeof Recipe>;

export const RecipesFile = z.object({
  recipes: z.array(Recipe).min(1),
});
export type RecipesFile = z.infer<typeof RecipesFile>;

/** kcal-Basis einer Zutat — nachrechenbar statt geschätzt (spec.md > What Was Simplified). */
export const NutritionEntry = z.object({
  kcal: z.number().positive(),
  basis: z.enum(["100g", "100ml", "Stück"]),
  /** Gramm je Stück/EL/TL, wenn basis „100g" ist und Rezepte in diesen Einheiten rechnen. */
  gramsPerUnit: z.number().positive().optional(),
});
export type NutritionEntry = z.infer<typeof NutritionEntry>;

export const NutritionTable = z.record(z.string(), NutritionEntry);
export type NutritionTable = z.infer<typeof NutritionTable>;

// ─── Einkaufsliste (spec.md > aggregation.ts, prd.md > Einkaufsliste) ───

/**
 * Kaufgebinde einer Zutat (Checkpoint: „genug für die Rezepte, aber verderbliches
 * nicht viel zu viel"): Packungsgröße, Verderblichkeits-Flag, Grundpreis, und für
 * Stück-rechnende Zutaten das Gramm-Äquivalent.
 */
export const PurchaseEntry = z.object({
  packAmount: z.number().positive(),
  packUnit: z.enum(["g", "ml", "Stück"]),
  perishable: z.boolean().default(false),
  /** Grundpreis der Packung — Angebotspreise überschreiben. */
  priceCents: z.number().int().nonnegative(),
  /** Gramm je Stück, wenn Rezepte in Stück rechnen und das Gebinde in g/ml sein kann. */
  gramsPerUnit: z.number().positive().optional(),
});
export type PurchaseEntry = z.infer<typeof PurchaseEntry>;

export const PurchaseTable = z.record(z.string(), PurchaseEntry);
export type PurchaseTable = z.infer<typeof PurchaseTable>;

/** Eine Listen-Position: Bedarf, Kaufmenge am Gebinde, Reste-Hinweis, Preis. */
export const ListItem = z.object({
  /** Stabiler Schlüssel = Zutaten-Schlüssel (Abhak überlebt Neuberechnung). */
  id: z.string().min(1),
  department: Department,
  product: z.string().min(1),
  /** Summe der Rezept-Bedarfe, menschlich lesbar („145 g", „3 Stück"). */
  needed: z.string(),
  /** Was tatsächlich gekauft wird, am Gebinde aufgerundet („1× 500 g"). */
  purchase: z.string(),
  packs: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
  /** Angebots-Treffer (Badge + Preis aus dem Snapshot). */
  offer: z.boolean().default(false),
  offerProduct: z.string().nullable().default(null),
  /** Differenz Kaufmenge − Bedarf; bei Verderblichem mit Nachrücker-Idee verknüpfbar. */
  leftover: z.string().nullable().default(null),
  leftoverIsStock: z.boolean().default(false),
  /** Rezept-Vorschläge, die den Rest verwerten (Rezept-Nachrücker, Checkpoint). */
  leftoverUses: z.array(z.object({ recipeId: z.string(), title: z.string(), uses: z.string() })).default([]),
  checked: z.boolean().default(false),
  kcal: z.number().nonnegative().default(0),
});
export type ListItem = z.infer<typeof ListItem>;

/** kcal-Wochenbilanz je Person — aus Planbeteiligung gerechnet, dezent angezeigt. */
export const PersonCalories = z.object({
  personId: z.string(),
  weekKcal: z.number().nonnegative(),
});
export type PersonCalories = z.infer<typeof PersonCalories>;

// ─── GET /api/state — der komplette Stand beim Öffnen der App ───

/** Leichte Rezept-Projektion für UI (Chips/Next-Meal/DayDetail) — Zutaten bleiben draußen. */
export const RecipeSummary = z.object({
  id: z.string(),
  title: z.string(),
  quick: z.boolean(),
  tags: z.array(RecipeTag),
  /** Kurz-Anleitung für die Tagesansicht (Checkpoint: „Zubereitung nirgends sichtbar"). */
  steps: z.array(z.string()),
});
export type RecipeSummary = z.infer<typeof RecipeSummary>;

export const NextMeal = z.object({
  day: z.number().int().min(0).max(6),
  slot: MealSlot,
  recipeId: z.string(),
  title: z.string(),
  servings: z.number().int().positive(),
  personCount: z.number().int().positive(),
  quick: z.boolean(),
});
export type NextMeal = z.infer<typeof NextMeal>;

export const AppState = z.object({
  household: Household.nullable(),
  /** Angebots-Lage für die Kopfzeile — null = ehrlich „keine aktuellen Angebote". */
  offers: OffersSummary.nullable().default(null),
  recipes: z.array(RecipeSummary).default([]),
  weekPlan: WeekPlan.nullable().default(null),
  /** Server-seitig berechnet (spec.md > Core Journey 5) — kein zweiter LLM-Aufruf. */
  nextMeal: NextMeal.nullable().default(null),
  /** Meal-Prep-Status: wie viele Mahlzeiten der Woche zeitlich schon hinter uns liegen. */
  mealsPrepared: z.number().int().nonnegative().default(0),
  mealsTotal: z.number().int().nonnegative().default(0),
  /** Deterministisch aus Plan × Rezepten gerechnet (spec.md > aggregation.ts). */
  shoppingList: z.array(z.lazy(() => ListItem)).default([]),
  /** kcal-Wochenbilanz je Person (Planbeteiligung) — Anzeige dezent (Slice 8). */
  personCalories: z.array(z.lazy(() => PersonCalories)).default([]),
});
export type AppState = z.infer<typeof AppState>;

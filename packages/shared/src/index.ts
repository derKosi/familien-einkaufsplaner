import { z } from "zod";

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
  constraints: z.array(ConstraintTag).default([]),
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

/** GET /api/state — der komplette Stand beim Öffnen der App. */
export const AppState = z.object({
  household: Household.nullable(),
  /** Angebots-Lage für die Kopfzeile — null = ehrlich „keine aktuellen Angebote". */
  offers: OffersSummary.nullable().default(null),
});
export type AppState = z.infer<typeof AppState>;

// ─── Planner: Wochenplan-Generierung (spec.md > llm/planner.ts, context-contract.ts) ───

export const MealSlot = z.enum(["Frühstück", "Mittag", "Abendessen"]);
export type MealSlot = z.infer<typeof MealSlot>;

/** Eine Mahlzeit im Plan — Personen nur als GUID-Referenz (Kontextvertrag: keine Namen). */
export const PlannerMeal = z.object({
  slot: MealSlot,
  recipeId: z.string().min(1),
  personRefs: z.array(z.string().uuid()).min(1),
  servings: z.number().int().positive(),
  /** Schnellkochbar für Werktage (prd.md > Wochenplan). */
  quick: z.boolean(),
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

import {
  ListItem,
  NutritionTable,
  PurchaseTable,
  type Department,
  type Event,
  type ListItem as ListItemT,
  type NutritionTable as NutritionTableT,
  type PersonCalories,
  type PurchaseTable as PurchaseTableT,
  type WeekPlan,
} from "@fep/shared";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dataDir } from "../paths.js";
import { loadRecipes, recipeById } from "./recipes.js";
import { latestOfferSnapshot } from "../offers/store.js";

/**
 * Der Rechner (spec.md > domain/aggregation.ts): deterministisch — Plan ×
 * Rezepte → Listenpositionen. Kein LLM. Checkpoint-Anforderungen:
 *  - Bedarf am Kaufgebinde ausrichten („genug für die Rezepte, verderbliches
 *    nicht viel zu viel“) — Aufkaufung auf Packungen mit Reste-Ausweis.
 *  - Rezept-Nachrücker: Restmengen werden Rezepten zugeordnet, die sie
 *    verwerten können — mit konkreten Mengen.
 *  - Nachrechenbar: jede Zahl kommt aus recipes.json/nutrition.json/purchase.json.
 */

let purchaseCache: PurchaseTableT | null = null;
let nutritionCache: NutritionTableT | null = null;

export function loadPurchaseTable(): PurchaseTableT {
  if (!purchaseCache) {
    purchaseCache = PurchaseTable.parse(
      JSON.parse(readFileSync(join(dataDir, "purchase.json"), "utf8")),
    );
  }
  return purchaseCache;
}

export function loadNutrition(): NutritionTableT {
  if (!nutritionCache) {
    nutritionCache = NutritionTable.parse(
      JSON.parse(readFileSync(join(dataDir, "nutrition.json"), "utf8")),
    );
  }
  return nutritionCache;
}

const DEPARTMENT_ORDER: Department[] = [
  "Obst & Gemüse",
  "Fleisch & Wurst",
  "Kühlregal",
  "Grundnahrung",
  "Getränke",
  "Süßwaren",
  "Tiefkühl",
  "Drogerie & Haushalt",
  "Aktionen",
];

interface Needed {
  /** Bedarf in g bzw. ml (Stück-Zutaten sind konvertiert oder separiert). */
  amount: number;
  unit: "g" | "ml" | "Stück";
  /** Original-Stückzahl, wenn Rezepte in Stück rechnen. */
  pieces?: number;
  kcal: number;
}

/** EL/TL → Gramm über nutrition.gramsPerUnit; Stück bleibt Stück. */
function normalizeIngredient(
  item: string,
  amount: number,
  unit: string,
  servings: number,
  nutrition: NutritionTableT,
): { grams?: number; pieces?: number; kcal: number } {
  const entry = nutrition[item];
  const total = amount * servings;

  if (unit === "Stück") {
    return { pieces: total, kcal: entry ? kcalOf(entry, total) : 0 };
  }
  if (unit === "g" || unit === "ml") {
    const kcal = entry && entry.basis !== "Stück" ? (entry.kcal / 100) * total : 0;
    return { grams: total, kcal };
  }
  // EL/TL/Prise: über gramsPerUnit in Gramm überführen (Öl 10 g/EL, Sojasauce 15 g/EL).
  const gPer = entry?.gramsPerUnit ?? (unit === "TL" ? 5 : 0);
  if (!gPer) return { kcal: 0 };
  const grams = total * gPer;
  const kcal = entry && entry.basis === "100g" ? (entry.kcal / 100) * grams : 0;
  return { grams, kcal };
}

/** kcal einer Stück-Anzahl, egal ob Basis 100g (mit gramsPerUnit?) oder Stück. */
function kcalOf(entry: { kcal: number; basis: "100g" | "100ml" | "Stück"; gramsPerUnit?: number }, pieces: number): number {
  if (entry.basis === "Stück") return entry.kcal * pieces;
  // Stück ohne Stück-Basis: über Grundnäherung 65 g/Stück (Doku in purchase.json)
  return (entry.kcal / 100) * 65 * pieces;
}

function formatAmount(amount: number, unit: string): string {
  const rounded = Math.round(amount * 10) / 10;
  // de-DE: Komma statt Punkt („0,6 übrig", nicht „0.6")
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
  return `${text} ${unit}`;
}

/** Angebots-Treffer: konservatives Token-Matching (mindestens ein Token ≥ 4 Zeichen). */
function matchOffer(product: string, offers: Array<{ product: string; priceCents: number; id: string }>) {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");
  const tokens = new Set(normalize(product).split(/[^a-z0-9]+/).filter((t) => t.length >= 4));
  if (tokens.size === 0) return null;
  for (const offer of offers) {
    const offerTokens = normalize(offer.product).split(/[^a-z0-9]+/);
    if (offerTokens.some((t) => tokens.has(t))) return offer;
  }
  return null;
}

/** Rezept-Nachrücker: Rezepte, die die Restmenge verwerten können (bis zu 3). */
function leftoverUses(item: string, leftover: number, unit: "g" | "ml" | "Stück") {
  const suggestions: Array<{ recipeId: string; title: string; uses: string }> = [];
  for (const recipe of loadRecipes()) {
    const ing = recipe.ingredients.find((i) => i.item === item);
    if (!ing) continue;
    // Zwei Portionen sollen aus der Restmene wirtschaften.
    const needFor2 = ing.amount * 2;
    if (needFor2 > leftover) continue;
    suggestions.push({
      recipeId: recipe.id,
      title: recipe.title,
      uses: `${formatAmount(needFor2, ing.unit)} für 2 Portionen`,
    });
    if (suggestions.length === 3) break;
  }
  return suggestions;
}

export function buildShoppingList(plan: WeekPlan, now: Date, events: Event[] = []): {
  list: ListItemT[];
  personCalories: PersonCalories[];
} {
  const nutrition = loadNutrition();
  const purchase = loadPurchaseTable();
  const snapshot = latestOfferSnapshot();
  const offers = (snapshot?.offers ?? []).map((o) => ({ product: o.product, priceCents: o.priceCents, id: o.id }));

  // Bedarf sammeln — Mengen in recipes.json sind pro Portion, Mahlzeiten skalieren.
  const needed = new Map<string, Needed>();
  const kcalByPerson = new Map<string, number>();

  for (const day of plan.days) {
    if (plan.exemptDays.includes(day.day)) continue; // ausgesetzt = keine Mahlzeiten, kein Bedarf
    const bonus = eventBonusFor(day.day, day.meals, events);
    for (const meal of day.meals) {
      const recipe = recipeById(meal.recipeId);
      if (!recipe) continue;
      const servings = meal.servings + (meal.slot === bonus.slot ? bonus.personCount : 0);
      let mealKcal = 0;
      for (const ing of recipe.ingredients) {
        const norm = normalizeIngredient(ing.item, ing.amount, ing.unit, servings, nutrition);
        mealKcal += norm.kcal;
        const row = needed.get(ing.item) ?? { amount: 0, unit: norm.pieces !== undefined ? "Stück" : norm.grams !== undefined ? (ing.unit === "ml" ? "ml" : "g") : (ing.unit === "ml" ? "ml" : "g"), kcal: 0 };
        if (norm.pieces !== undefined) {
          row.pieces = (row.pieces ?? 0) + norm.pieces;
          row.amount = row.pieces;
          row.unit = "Stück";
        } else if (norm.grams !== undefined) {
          row.amount += norm.grams;
        }
        row.kcal += norm.kcal;
        needed.set(ing.item, row);
      }
      // Gleichmäßige Portionen am Tisch: anteilig auf die Mitesser (Events inklusive).
      const perPerson = mealKcal / (meal.persons.length + (meal.slot === bonus.slot ? bonus.personCount : 0));
      for (const personId of meal.persons) {
        kcalByPerson.set(personId, (kcalByPerson.get(personId) ?? 0) + perPerson);
      }
    }
  }

  const list: ListItemT[] = [];
  for (const [item, row] of needed) {
    const pack = purchase[item];
    const neededText = row.unit === "Stück" ? formatAmount(row.pieces ?? row.amount, "Stück") : formatAmount(row.amount, row.unit);

    let packs = 1;
    let priceCents = 0;
    let basePriceCents = 0;
    let purchaseText = neededText;
    let leftover: string | null = null;
    let leftoverIsStock = false;
    let restAmount = 0;
    let restUnit: "g" | "ml" | "Stück" = row.unit;
    let kcal = row.kcal;
    let perishable = false;

    if (pack) {
      perishable = pack.perishable;
      // Einheitenbrücke in BEIDE Richtungen (Bug-Note Checkpoint 6): Rezept in Stück
      // + Gewichtsgebinde (Tomaten → 500-g-Karte) rechnet in Gramm; Rezept in Gramm
      // + Stückgebinde (Eisbergsalat 60 g → 1 Kopf à 400 g) rechnet in Stück.
      let needInPackUnits = row.amount;
      let piecesInPackUnits = row.pieces ?? 0;
      if (pack.gramsPerUnit !== undefined) {
        if (row.unit === "Stück") {
          needInPackUnits = (row.pieces ?? 0) * pack.gramsPerUnit;
        } else if (pack.packUnit === "Stück") {
          piecesInPackUnits = row.amount / pack.gramsPerUnit;
          needInPackUnits = row.amount;
        }
      }
      packs = pack.packUnit === "Stück"
        ? Math.max(1, Math.ceil(piecesInPackUnits / pack.packAmount))
        : Math.max(1, Math.ceil(needInPackUnits / pack.packAmount));
      priceCents = packs * pack.priceCents;
      basePriceCents = priceCents;

      const purchasedAmount = packs * pack.packAmount;
      if (pack.packUnit === "Stück") {
        purchaseText = pack.packAmount === 1 ? `${purchasedAmount} Stück` : `${packs}× ${pack.packAmount} Stück`;
        restAmount = Math.round((purchasedAmount - piecesInPackUnits) * 10) / 10;
        restUnit = "Stück";
      } else {
        purchaseText = `${packs}× ${pack.packAmount} ${pack.packUnit}`;
        restAmount = Math.round(purchasedAmount - needInPackUnits);
        restUnit = pack.packUnit;
      }
      if (restAmount > 0) {
        leftover = restUnit === "Stück"
          ? `${restAmount} übrig`
          : `${restAmount} ${restUnit} übrig`;
        leftoverIsStock = !pack.perishable;
      }
    } else {
      // Nicht katalogisiert: ehrlich Bedarf = Kaufmenge, ohne Preis.
      priceCents = 0;
    }

    // kcal der Zutat in Gramm ausdrücken (Stück-Basis × pieces).
    if (pack?.gramsPerUnit !== undefined && row.unit === "Stück") {
      const entry = nutrition[item];
      if (entry && entry.basis !== "Stück") kcal = (entry.kcal / 100) * (row.pieces ?? 0) * pack.gramsPerUnit;
    }

    const offer = matchOffer(item, offers);
    if (offer) {
      // Angebotspreis ersetzt den Packungspreis (Karte ≈ Angebot); Basis bleibt für die Ersparnis.
      priceCents = offer.priceCents;
    }

    list.push(ListItem.parse({
      id: item,
      department: departmentFor(item),
      product: item,
      needed: neededText,
      purchase: purchaseText,
      packs,
      priceCents,
      basePriceCents,
      offer: offer !== null,
      offerProduct: offer?.product ?? null,
      leftover,
      leftoverIsStock,
      perishable,
      leftoverUses: pack?.perishable && restAmount > 0 ? leftoverUses(item, restAmount, restUnit) : [],
      checked: false,
      kcal: Math.round(kcal),
    }));
  }

  list.sort((a, b) => {
    const d = DEPARTMENT_ORDER.indexOf(a.department) - DEPARTMENT_ORDER.indexOf(b.department);
    return d !== 0 ? d : a.product.localeCompare(b.product, "de");
  });

  const personCalories = [...kcalByPerson.entries()]
    .map(([personId, weekKcal]) => ({ personId, weekKcal: Math.round(weekKcal) }))
    .sort((a, b) => a.personId.localeCompare(b.personId));

  return { list, personCalories };
}

/** Abteilung einer Zutat — aus dem Rezept-Pool abgeleitet (einheitlich gepflegt). */
function departmentFor(item: string): Department {
  for (const recipe of loadRecipes()) {
    const ing = recipe.ingredients.find((i) => i.item === item);
    if (ing) return ing.department;
  }
  return "Grundnahrung";
}

/**
 * Events skalieren die Hauptmahlzeit des Tages (spec.md > Core Journey 3):
 * bevorzugt das Abendessen, sonst die erste geplante Mahlzeit. Rückgabe
 * personCount = 0 heißt: kein Event betreffen diese Mahlzeiten.
 */
function eventBonusFor(day: number, meals: Array<{ slot: string }>, events: Event[]): { slot: string; personCount: number } {
  const dayEvents = events.filter((e) => e.day === day);
  if (dayEvents.length === 0) return { slot: "", personCount: 0 };
  const target =
    meals.find((m) => m.slot === "Abendessen")?.slot ?? meals[0]?.slot ?? "";
  if (!target) return { slot: "", personCount: 0 };
  return {
    slot: target,
    personCount: dayEvents.reduce((n, e) => n + e.personCount, 0),
  };
}

/** Einheitenbrücke Rezeptportion → Kaufgebinde, in BEIDE Richtungen
 *  (Bug-Note Checkpoint 6 — jetzt auch in den Rezeptkosten, nicht nur in der
 *  Aggregation): Rezept in Stück + Gewichtsgebinde rechnet in Gramm; Rezept in
 *  Gramm + Stückgebinde rechnet in Stück. Ohne gramsPerUnit: unverändert. */
function portionInPackUnits(pack: PurchaseTableT[string], item: { amount: number; unit: string }): number {
  if (pack.gramsPerUnit === undefined) return item.amount;
  if (item.unit === "Stück") return item.amount * pack.gramsPerUnit;
  if (pack.packUnit === "Stück") return item.amount / pack.gramsPerUnit;
  return item.amount;
}

/** „Etwa“-Preis je Portion: anteilige Packungskosten über die Zutaten. */
export function recipeCostPerPortion(recipeId: string): number {
  const recipe = recipeById(recipeId);
  if (!recipe) return 0;
  const purchase = loadPurchaseTable();
  let cents = 0;
  for (const ing of recipe.ingredients) {
    const pack = purchase[ing.item];
    if (!pack) continue;
    cents += (portionInPackUnits(pack, ing) / pack.packAmount) * pack.priceCents;
  }
  return Math.round(cents);
}

/** kcal je Portion, aus der Nährwert-Tabelle gerechnet. */
export function recipeKcalPerPortion(recipeId: string): number {
  const recipe = recipeById(recipeId);
  if (!recipe) return 0;
  const nutrition = loadNutrition();
  let kcal = 0;
  for (const ing of recipe.ingredients) {
    kcal += normalizeIngredient(ing.item, ing.amount, ing.unit, 1, nutrition).kcal;
  }
  return Math.round(kcal);
}

/** Angebots-Treffer der Rezept-Zutaten — Grundlage der Event-Vorschläge. */
export function recipeOfferProducts(recipeId: string): string[] {
  const recipe = recipeById(recipeId);
  if (!recipe) return [];
  const snapshot = latestOfferSnapshot();
  const offers = (snapshot?.offers ?? []).map((o) => ({ product: o.product, priceCents: o.priceCents, id: o.id }));
  const hits = new Set<string>();
  for (const ing of recipe.ingredients) {
    const match = matchOffer(ing.item, offers);
    if (match) hits.add(match.product);
  }
  return [...hits];
}

/**
 * Event-Vorschläge (prd.md > Events & Ausnahmen): Rezepte mit den stärksten
 * Angebots-Treffern zuerst — mit Portionspreis und kcal (Checkpoint-Wunsch).
 * Budget 1 sortiert preisgünstig zuerst (Slice 7, Einstellungen).
 */
export function eventSuggestions(limit = 4, budget = 2) {
  return loadRecipes()
    .map((r) => ({
      recipeId: r.id,
      title: r.title,
      kcalPerPortion: recipeKcalPerPortion(r.id),
      portionPriceCents: recipeCostPerPortion(r.id),
      offerProducts: recipeOfferProducts(r.id),
    }))
    .sort(
      (a, b) =>
        b.offerProducts.length - a.offerProducts.length ||
        a.portionPriceCents - b.portionPriceCents,
    )
    .sort((a, b) => (budget === 1 ? a.portionPriceCents - b.portionPriceCents : 0))
    .slice(0, limit);
}

/** Zutatenzeilen mit anteiligen Packungskosten — Grundlage des aufklappbaren Panels. */
export function recipePriceRows(recipeId: string, servings: number) {
  const recipe = recipeById(recipeId);
  if (!recipe) return { recipeId, title: recipeId, servings, kcalPerPortion: 0, rows: [] };
  const purchase = loadPurchaseTable();
  const nutrition = loadNutrition();
  const snapshot = latestOfferSnapshot();
  const offers = (snapshot?.offers ?? []).map((o) => ({ product: o.product, priceCents: o.priceCents, id: o.id }));

  const rows = recipe.ingredients.map((ing) => {
    const pack = purchase[ing.item];
    // Anteilige Packungskosten je Portion („etwa"-Näherung, wie recipeCostPerPortion).
    let portionPriceCents = 0;
    if (pack) portionPriceCents = Math.round((portionInPackUnits(pack, ing) / pack.packAmount) * pack.priceCents);
    const offer = matchOffer(ing.item, offers);
    return {
      item: ing.item,
      amount: formatAmount(ing.amount, ing.unit),
      // Kochmenge: was tatsächlich für die geplanten Portionen im Topf landet.
      totalAmount: formatAmount(ing.amount * servings, ing.unit),
      portionPriceCents,
      totalPriceCents: portionPriceCents * servings,
      offerProduct: offer?.product ?? null,
    };
  });

  return {
    recipeId,
    title: recipe.title,
    servings,
    kcalPerPortion: recipeKcalPerPortion(recipeId),
    rows,
  };
}

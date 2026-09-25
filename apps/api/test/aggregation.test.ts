import { describe, expect, it } from "vitest";
import { WeekPlan, type Event, type Person, type WeekPlan as WeekPlanT } from "@fep/shared";
import { buildShoppingList, eventSuggestions, recipeCostPerPortion, recipePriceRows } from "../src/domain/aggregation.js";
import { loadRecipes } from "../src/domain/recipes.js";

/**
 * Nachrechenbar-Beweis (checklist.md Slice 5): Aggregation und kcal —
 * deterministisch, mit echten Daten aus data/ (recipes, nutrition, purchase).
 */

const LUNE = "11111111-1111-4111-8111-111111111111";
const GUSTAV = "33333333-4333-4333-8333-333333333333";

function meal(day: number, slot: "Frühstück" | "Mittag" | "Abendessen", recipeId: string, persons: string[], servings = persons.length) {
  return { day, meals: [{ slot, recipeId, servings, persons, quick: false, prepared: "auto" as const }] };
}

const plan: WeekPlanT = WeekPlan.parse({
  weekOf: "2026-09-21",
  store: "penny",
  basedOnOffers: 70,
  offersDated: "2026-09-24T11:32:11.661Z",
  days: [
    meal(0, "Abendessen", "spaghetti-bolognese", [LUNE, GUSTAV]),
    meal(1, "Abendessen", "linsen-bolognese", [LUNE, GUSTAV]),
    meal(2, "Abendessen", "schweinefilet-champignonsoße", [LUNE]),
    meal(3, "Mittag", "roter-linsen-dal", [LUNE, GUSTAV]),
    meal(4, "Mittag", "kartoffelsuppe", [LUNE, GUSTAV]),
    meal(5, "Mittag", "gemuese-pfanne-mit-feta", [LUNE, GUSTAV]),
    {
      day: 6,
      meals: [
        { slot: "Frühstück", recipeId: "bananen-haferflocken", servings: 2, persons: [LUNE, GUSTAV], quick: false, prepared: "auto" },
        { slot: "Mittag", recipeId: "bunter-tellersalat-mit-feta", servings: 1, persons: [LUNE], quick: true, prepared: "auto" },
      ],
    },
  ],
  missingInfo: [],
});

const now = new Date(2026, 8, 22, 12, 0);
const { list, personCalories } = buildShoppingList(plan, now);

function row(item: string) {
  const r = list.find((l) => l.id === item);
  if (!r) throw new Error(`${item} fehlt auf der Liste`);
  return r;
}

describe("Aggregation: Mengen", () => {
  it("summiert Hackfleisch aus zwei Rezepten zu einer Position (500-g-Beweis)", () => {
    // 2 Portionen bolognese × 125 g + 2 Portionen linsen-bolognese × 0 = 250 g
    expect(row("Hackfleisch gemischt").needed).toBe("250 g");
    // Gebinde: 500 g → 1 Packung reicht, Rest wird ausgewiesen
    expect(row("Hackfleisch gemischt").packs).toBe(1);
    expect(row("Hackfleisch gemischt").purchase).toBe("1× 500 g");
  });

  it("weist perishablen Rest aus und schlägt Nachrücker-Rezepte vor", () => {
    // Sahne: schweinefilet (nur Lune am Tisch) 40 ml × 1 Portion → 1× 200 ml, 160 ml übrig
    const sahne = row("Sahne");
    expect(sahne.needed).toBe("40 ml");
    expect(sahne.leftover).toBe("160 ml übrig");
    expect(sahne.leftoverIsStock).toBe(false);
    // Nachrücker: Rezepte, die ≤ 160 ml Sahne für 2 Portionen brauchen (50 bzw. 60 ml)
    expect(sahne.leftoverUses.length).toBeGreaterThan(0);
    for (const use of sahne.leftoverUses) {
      expect(use.uses).toMatch(/\d+ ml für 2 Portionen/);
    }
  });

  it("stück-rechnende Zutaten werden auf ganze Stücke aufgerundet", () => {
    // Kartoffelsuppe: 250 g/Portion → g; Tomaten (Stück): bolognese 0 …
    const zucchini = row("Zucchini");
    expect(zucchini.needed).toMatch(/Stück/);
    expect(Number.parseInt(zucchini.needed)).toBeGreaterThan(0);
  });

  it("nicht Verderbliches kennzeichnet den Rest als Vorrat", () => {
    // Kartoffeln: 200 g (Filet) + 500 g (Suppe) = 700 g → 2-kg-Netz, Rest = Vorrat
    const kartoffeln = row("Kartoffeln");
    expect(kartoffeln.needed).toBe("700 g");
    expect(kartoffeln.leftoverIsStock).toBe(true);
  });

  it("Gramm-Bedarf am Stück-Gebinde: 60 g Salat sind 1 Kopf, nicht 200 (Regression)", () => {
    const salat = row("Eisbergsalat");
    expect(salat.needed).toBe("60 g");
    expect(salat.packs).toBe(1);
    expect(salat.priceCents).toBe(119);
  });

  it("preise kommen aus dem Gebindekatalog und sind ganzzahlig in Cent", () => {
    for (const item of list) {
      expect(item.priceCents).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(item.priceCents)).toBe(true);
    }
    expect(row("Hackfleisch gemischt").priceCents).toBe(349);
  });

  it("gruppiert nach Ladenabteilungen", () => {
    const departments = new Set(list.map((l) => l.department));
    expect(departments.size).toBeGreaterThan(3);
  });
});

describe("Aggregation: kcal", () => {
  it("teilt Mahlzeiten-kcal gleich auf die Mitesser auf", () => {
    const lune = personCalories.find((p) => p.personId === LUNE);
    const gustav = personCalories.find((p) => p.personId === GUSTAV);
    expect(lune).toBeDefined();
    expect(gustav).toBeDefined();
    // Lune ist an 3 Mahlzeiten, Gustav an 2 — mehr Wochen-kcal.
    expect(lune!.weekKcal).toBeGreaterThan(gustav!.weekKcal);
    // Nachrechenbar grob: Bolognese für 2 ≈ 2 × (Spaghetti 125 g + Hack 125 g + …)
    expect(lune!.weekKcal).toBeGreaterThan(1500);
    expect(lune!.weekKcal).toBeLessThan(6000);
  });

  it("listet kcal je Position (Grundlage der dezenten Anzeige)", () => {
    expect(row("Spaghetti").kcal).toBeGreaterThan(0);
  });
});

describe("Events & Ausnahmen (Slice 6)", () => {
  it("Grillabend: Event mit 5 Personen skaliert die Hauptmahlzeit des Tages", () => {
    const grillabend: Event = {
      id: "event-1",
      day: 4,
      personCount: 5,
      recipeId: "kartoffelsuppe",
      title: "Nachbargrill",
    };
    const before = buildShoppingList(plan, now).list.find((l) => l.id === "Karotten")!;
    const after = buildShoppingList(plan, now, [grillabend]).list.find((l) => l.id === "Karotten")!;
    // Tag 4 (kartoffelsuppe): 60 g × 2 + Event +5 Portionen × 60 g = +300 g Bedarf
    expect(Number.parseInt(after.needed)).toBe(Number.parseInt(before.needed) + 300);
    // 500-g-Pack: 240 g → 1 Packung, 540 g → 2 Packungen — das Gebinde springt
    expect(before.packs).toBe(1);
    expect(after.packs).toBe(2);
  });

  it("ausgesetzte Tage entfallen aus Bedarf, Zählern und Next-Meal", () => {
    const exemptPlan: WeekPlanT = WeekPlan.parse({ ...plan, exemptDays: [1, 2] });
    const { list: reduced } = buildShoppingList(exemptPlan, now);
    // Tag 2 ist das Schweinefilet — ohne Tag 2 keine Filet-Position
    expect(reduced.find((l) => l.id === "Schweinefilet")).toBeUndefined();
    // Tag 1 entfällt (linsen-bolognese), Tag 0 bleibt
    expect(reduced.find((l) => l.id === "Hackfleisch gemischt")).toBeDefined();
  });

  it("Event-Vorschläge tragen Portionspreis, kcal und Angebots-Treffer", () => {
    const suggestions = eventSuggestions(4);
    expect(suggestions).toHaveLength(4);
    for (const s of suggestions) {
      expect(s.portionPriceCents).toBeGreaterThan(0);
      expect(s.kcalPerPortion).toBeGreaterThan(0);
    }
    // Sortiert: die meisten Angebots-Treffer zuerst
    expect(suggestions[0].offerProducts.length).toBeGreaterThanOrEqual(
      suggestions[suggestions.length - 1].offerProducts.length,
    );
  });
});

describe("Rezept-Portionskosten (Preis-Panel, Vorschläge, Rezept-Projektion)", () => {
  it("Rezept-Gramm auf Stück-Karte: 60 g Salat sind 0,15 Kopf (~18 ct), nicht 60 Köpfe (Regression)", () => {
    const { rows } = recipePriceRows("bunter-tellersalat-mit-feta", 4);
    const salat = rows.find((r) => r.item === "Eisbergsalat");
    expect(salat).toBeDefined();
    // 60 g / 400 g pro Kopf × 119 ct = 17,85 → 18 ct je Portion
    expect(salat!.portionPriceCents).toBe(18);
    expect(salat!.totalPriceCents).toBe(72);
  });

  it("Kochmenge = Portion × Servings (480 g statt 4× rechnen), Komma de-DE", () => {
    const { rows } = recipePriceRows("bunter-tellersalat-mit-feta", 4);
    const salat = rows.find((r) => r.item === "Eisbergsalat");
    expect(salat!.totalAmount).toBe("240 g"); // 60 g × 4 — die Menge, die tatsächlich im Topf landet
    const gurke = rows.find((r) => r.item === "Gurke");
    expect(gurke!.totalAmount).toBe("1 Stück"); // 0,25 × 4 = glatt 1 (Anzeige „0,3" war gerundet)
  });

  it("Rezept-Stück auf Gewichts-Karte: 1 Tomate (~65 g) kostet ~19 ct aus der 500-g-Karte", () => {
    const { rows } = recipePriceRows("bunter-tellersalat-mit-feta", 4);
    const tomate = rows.find((r) => r.item === "Tomaten");
    expect(tomate).toBeDefined();
    // 1 × 65 g / 500 g × 149 ct = 19,37 → 19 ct je Portion (Brücke in beide Richtungen)
    expect(tomate!.portionPriceCents).toBe(19);
  });

  it("kein Rezept kostet absurd viel je Portion — Einheitenbrücken-Falle komplett", () => {
    for (const r of loadRecipes()) {
      const cents = recipeCostPerPortion(r.id);
      expect(cents, `${r.id}: ${cents} ct/Portion`).toBeLessThan(500);
    }
  });
});

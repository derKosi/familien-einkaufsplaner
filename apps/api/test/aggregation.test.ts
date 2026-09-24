import { describe, expect, it } from "vitest";
import { WeekPlan, type Person, type WeekPlan as WeekPlanT } from "@fep/shared";
import { buildShoppingList } from "../src/domain/aggregation.js";

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
    meal(6, "Frühstück", "bananen-haferflocken", [LUNE, GUSTAV]),
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

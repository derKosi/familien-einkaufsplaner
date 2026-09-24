import { describe, expect, it } from "vitest";
import {
  ConstraintTag,
  WeekPlan,
  type Person,
  type WeekPlan as WeekPlanT,
} from "@fep/shared";
import { checkPlanConstraints, countAdaptations, recipeSatisfies } from "../src/domain/planrules.js";
import { computeNextMeal, countPreparedMeals, defaultWeekPattern } from "../src/domain/weeklogic.js";

// Beweis-Stücke (checklist.md Slice 4 Verify): Schema-Validierung, Constraint-Regeln,
// Wochenlogik — alles ohne Haushalt, ohne LLM, ohne Snapshot.

const LUNE = "11111111-1111-4111-8111-111111111111";
const GUSTAV = "33333333-4333-4333-8333-333333333333";
const MAELLE = "44444444-4444-4444-8444-444444444444";

const persons: Person[] = [
  { id: LUNE, name: "Lune", roleClass: "Erwachsener", colorPair: "salbei", constraints: [], allergies: [], calorieGoal: null, activityProfile: null, complete: true },
  { id: GUSTAV, name: "Gustav", roleClass: "Erwachsener", colorPair: "himmel", constraints: ["milchfrei"], allergies: [], calorieGoal: null, activityProfile: null, complete: true },
  { id: MAELLE, name: "Maelle", roleClass: "Jugendlicher", colorPair: "lavendel", constraints: ["vegetarisch"], allergies: [], calorieGoal: null, activityProfile: null, complete: true },
];

const recipeTags = new Map<string, string[]>([
  ["bolognese", []], // Hackfleisch, Sahne — nichts davon
  ["linsen-dal", ["vegetarisch", "vegan", "milchfrei", "schnell"]],
  ["kaese-omelett", ["vegetarisch", "schnell"]], // Käse → nicht milchfrei
]);

function meal(
  day: number,
  slot: "Frühstück" | "Mittag" | "Abendessen",
  recipeId: string,
  persons: string[],
  extra: Record<string, unknown> = {},
) {
  return {
    day,
    meals: [{ slot, recipeId, servings: persons.length, persons, quick: false, ...extra }],
  };
}

const validPlan: WeekPlanT = WeekPlan.parse({
  weekOf: "2026-09-21",
  store: "penny",
  basedOnOffers: 70,
  offersDated: "2026-09-24T11:32:11.661Z",
  days: [
    meal(0, "Abendessen", "linsen-dal", [LUNE, GUSTAV, MAELLE]),
    meal(1, "Mittag", "bolognese", [LUNE]),
    meal(2, "Abendessen", "kaese-omelett", [LUNE, MAELLE]),
    meal(3, "Abendessen", "linsen-dal", [LUNE, GUSTAV, MAELLE]),
    meal(4, "Abendessen", "bolognese", [LUNE]),
    meal(5, "Mittag", "linsen-dal", [LUNE, GUSTAV, MAELLE]),
    meal(6, "Frühstück", "linsen-dal", [LUNE, GUSTAV, MAELLE]),
  ],
  missingInfo: [],
});

describe("WeekPlan-Schema", () => {
  it("akzeptiert 7 Tage", () => {
    expect(validPlan.days).toHaveLength(7);
  });

  it("lehnt 6 Tage ab", () => {
    const sixDays = { ...validPlan, days: validPlan.days.slice(0, 6) };
    expect(WeekPlan.safeParse(sixDays).success).toBe(false);
  });

  it("lehnt negative basedOnOffers ab", () => {
    expect(WeekPlan.safeParse({ ...validPlan, basedOnOffers: -1 }).success).toBe(false);
  });
});

describe("Planregeln: Constraints", () => {
  it("vegan erfüllt vegetarisch und milchfrei", () => {
    expect(recipeSatisfies(["vegan"], "vegetarisch")).toBe(true);
    expect(recipeSatisfies(["vegan"], "milchfrei")).toBe(true);
    expect(recipeSatisfies(["vegetarisch"], "vegan")).toBe(false);
  });

  it("Maelle isst im Testplan durchgehend vegetarisch", () => {
    const violations = checkPlanConstraints(validPlan, persons, recipeTags).filter(
      (v) => v.personId === MAELLE,
    );
    expect(violations).toEqual([]);
  });

  it("Gustavs Mahlzeiten sind milchfrei — Bolognese läuft nur ohne ihn", () => {
    const violations = checkPlanConstraints(validPlan, persons, recipeTags).filter(
      (v) => v.personId === GUSTAV,
    );
    expect(violations).toEqual([]);
  });

  it("findet den Verstoß, wenn Maelle ohne Anpassung an Bolognese-Tisch landet", () => {
    const badPlan: WeekPlanT = WeekPlan.parse({
      ...validPlan,
      days: [meal(0, "Abendessen", "bolognese", [LUNE, MAELLE]), ...validPlan.days.slice(1)],
    });
    const violations = checkPlanConstraints(badPlan, persons, recipeTags);
    expect(violations).toContainEqual({
      personId: MAELLE,
      constraint: "vegetarisch",
      day: 0,
      slot: "Abendessen",
      recipeId: "bolognese",
    });
  });

  it("Allergien sind NICHT per Anpassung gedeckt (Erdnussbutter-Regel)", () => {
    const allergicGustav = { ...persons[1], allergies: ["milchfrei" as const] };
    const adaptedPlan: WeekPlanT = WeekPlan.parse({
      ...validPlan,
      days: [
        meal(0, "Abendessen", "bolognese", [LUNE, GUSTAV], {
          adaptations: [{ personRef: GUSTAV, note: "Sahne → Haferdrink" }],
        }),
        ...validPlan.days.slice(1),
      ],
    });
    const violations = checkPlanConstraints(adaptedPlan, [persons[0], allergicGustav, persons[2]], recipeTags);
    expect(violations).toContainEqual({
      personId: GUSTAV,
      constraint: "milchfrei",
      day: 0,
      slot: "Abendessen",
      recipeId: "bolognese",
    });
  });

  it("deckt eine konkrete Anpassung den Verstoß (gemeinsames Gericht bleibt)", () => {
    const adaptedPlan: WeekPlanT = WeekPlan.parse({
      ...validPlan,
      days: [
        meal(0, "Abendessen", "bolognese", [LUNE, MAELLE], {
          adaptations: [{ personRef: MAELLE, note: "Hackfleisch separat — für diese Portion Linsen" }],
        }),
        ...validPlan.days.slice(1),
      ],
    });
    expect(checkPlanConstraints(adaptedPlan, persons, recipeTags)).toEqual([]);
    expect(countAdaptations(adaptedPlan)).toBe(1);
  });
});

describe("Wochenlogik", () => {
  it("E33-Default: werktags F+A für alle, Mittag nur Erwachsene, Sa nur Mittag, So alles", () => {
    const pattern = defaultWeekPattern(persons);
    const fruehstueck = pattern.filter((e) => e.slot === "Frühstück");
    const mittag = pattern.filter((e) => e.slot === "Mittag");
    const abend = pattern.filter((e) => e.slot === "Abendessen");

    expect(fruehstueck.map((e) => e.day).sort()).toEqual([0, 1, 2, 3, 4, 6]);
    expect(abend.map((e) => e.day).sort()).toEqual([0, 1, 2, 3, 4, 6]);
    // Sa (5): nur Mittag, für alle
    expect(mittag.filter((e) => e.day === 5).map((e) => e.personRefs)).toEqual([
      [LUNE, GUSTAV, MAELLE],
    ]);
    // werktags Mittag: nur Erwachsene
    const mittagMontag = mittag.find((e) => e.day === 0);
    expect(mittagMontag?.personRefs).toEqual([LUNE, GUSTAV]);
  });

  it("Next Meal: Dienstag 12 Uhr zeigt auf das heutige Mittagessen (Slot 14 Uhr)", () => {
    const next = computeNextMeal(
      validPlan,
      (id) => ({ "linsen-dal": "Roter Linsen-Dal", bolognese: "Bolognese" })[id],
      new Date(2026, 8, 22, 12, 0), // Dienstag 22.09.2026, 12:00
    );
    expect(next?.day).toBe(1);
    expect(next?.recipeId).toBe("bolognese");
  });

  it("Essens-Zähler: auto fragt die Uhr, ja/nein gewinnt", () => {
    const tuesdayNoon = new Date(2026, 8, 22, 12, 0);
    const withChecks: WeekPlanT = WeekPlan.parse({
      ...validPlan,
      days: validPlan.days.map((d, i) => ({
        ...d,
        meals: d.meals.map((m) => ({ ...m, prepared: i === 0 ? "ja" : i === 1 ? "nein" : "auto" })),
      })),
    });
    // Tag 0: „ja" zählt (1). Tag 1: Mittag liegt zeitlich hinter 12:00, aber „nein" gewinnt (0).
    // Tag 2+: auto — alle Slots liegen in der Zukunft (0).
    expect(countPreparedMeals(withChecks, tuesdayNoon)).toBe(1);
    expect(countPreparedMeals(validPlan, tuesdayNoon)).toBe(1); // nur Montag-Abendessen (auto, vergangen)
  });
});

describe("ConstraintTag", () => {
  it("kennt die vier Demo-relevanten Tags", () => {
    expect(ConstraintTag.options).toEqual(["vegetarisch", "milchfrei", "vegan", "glutenfrei"]);
  });
});

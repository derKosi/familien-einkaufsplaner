/**
 * Live-Prüfung des generierten Wochenplans (checklist.md Slice 4 Verify):
 *   pnpm dev            # in einem Terminal
 *   pnpm plan:assert    # in einem zweiten
 *
 * Erwartet einen laufenden Server und einen generierten Plan; prüft:
 * 7 Tage, basedOnOffers > 0, Maelle vegetarisch, Gustav milchfrei,
 * schnell-kochbar-Flags vorhanden.
 */
import {
  checkPlanConstraints,
  recipeSatisfies,
} from "../src/domain/planrules.js";
import { AppState, type Person } from "@fep/shared";

const base = process.env.FEP_BASE_URL ?? "http://localhost:3001";

const res = await fetch(`${base}/api/state`);
if (!res.ok) throw new Error(`Server antwortete ${res.status} — läuft pnpm dev?`);
const state = AppState.parse(await res.json());

let failures = 0;
function check(ok: boolean, message: string) {
  console.log(`  ${ok ? "✓" : "✗"} ${message}`);
  if (!ok) failures++;
}

const plan = state.weekPlan;
check(plan !== null, "Ein Wochenplan existiert");
if (!plan) process.exit(1);

check(plan.days.length === 7, `7 Tage im Plan (${plan.days.length})`);
check(plan.basedOnOffers > 0, `basedOnOffers > 0 (${plan.basedOnOffers})`);
check(
  plan.offersDated !== null,
  `Plan trägt die Angebotslage (${plan.offersDated})`,
);

const persons: Person[] = state.household?.persons ?? [];
const recipeTags = new Map(state.recipes.map((r) => [r.id, r.tags]));
const violations = checkPlanConstraints(plan, persons, recipeTags);
check(violations.length === 0, `Keine Constraint-Verstöße (${violations.length})`);
for (const v of violations) {
  const who = persons.find((p) => p.id === v.personId)?.name ?? v.personId;
  console.error(`    Tag ${v.day} ${v.slot}: ${who} (${v.constraint}) an ${v.recipeId}`);
}

// Die Demo-Constraints explizit beim Namen (checklist-Formulierung):
const maelle = persons.find((p) => p.name === "Maelle");
const gustav = persons.find((p) => p.name === "Gustav");
if (maelle) {
  const allVeg = plan.days
    .flatMap((d) => d.meals)
    .filter((m) => m.persons.includes(maelle.id))
    .every((m) => recipeSatisfies(recipeTags.get(m.recipeId) ?? [], "vegetarisch"));
  check(allVeg, "Maelles Mahlzeiten sind durchgehend vegetarisch");
}
if (gustav) {
  const allMf = plan.days
    .flatMap((d) => d.meals)
    .filter((m) => m.persons.includes(gustav.id))
    .every((m) => recipeSatisfies(recipeTags.get(m.recipeId) ?? [], "milchfrei"));
  check(allMf, "Gustavs Mahlzeiten sind durchgehend milchfrei");
}

const quickCount = plan.days.flatMap((d) => d.meals).filter((m) => m.quick).length;
check(quickCount > 0, `schnell-kochbar-Flags gesetzt (${quickCount} Mahlzeiten)`);
check(plan.days.flatMap((d) => d.meals).length === state.mealsTotal, `Mahlzeiten-Zähler konsistent (${state.mealsTotal})`);

console.log(`\nPlan: ${plan.weekOf}, ${plan.store}, Stand Angebotslage ${plan.offersDated ?? "—"};
${state.mealsTotal} Mahlzeiten, Next Meal: ${state.nextMeal ? `Tag ${state.nextMeal.day} ${state.nextMeal.slot} — ${state.nextMeal.title}` : "—"}`);

if (failures > 0) {
  console.error(`\n${failures} Prüfpunkt(e) fehlgeschlagen.`);
  process.exit(1);
}
console.log("\nPlan-Asserts vollständig bestanden.");

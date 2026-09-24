import type { ConstraintTag, Person, WeekPlan } from "@fep/shared";

/**
 * Planregeln (spec.md > planner.ts „fachliche Prüfung“): reine Funktionen,
 * damit Vitest sie ohne Haushalt und ohne LLM beweisen kann — und der
 * Assert-Skript-Lauf dieselben Regeln auf den echten Plan anwendet.
 */

/** Erfüllt ein Rezept-Tag-Set die Einschränkung? ( vegan schließt vegetarisch/milchfrei mit ein.) */
export function recipeSatisfies(recipeTags: readonly string[], constraint: ConstraintTag): boolean {
  switch (constraint) {
    case "vegetarisch":
      return recipeTags.includes("vegetarisch") || recipeTags.includes("vegan");
    case "milchfrei":
      return recipeTags.includes("milchfrei") || recipeTags.includes("vegan");
    case "vegan":
      return recipeTags.includes("vegan");
    case "glutenfrei":
      return recipeTags.includes("glutenfrei");
  }
}

export interface PlanViolation {
  personId: string;
  constraint: ConstraintTag;
  day: number;
  slot: string;
  recipeId: string;
}

/**
 * Prüft jeden Plan-Tag gegen die Constraints aller beteiligten Personen.
 * Eine Verletzung durch das Basisgericht ist okay, wenn für die Person eine
 * Anpassung existiert (Checkpoint: Anpassung schlägt Restriktion) — gezählt
 * werden nur ungedeckte Verstöße.
 */
export function checkPlanConstraints(
  plan: WeekPlan,
  persons: Person[],
  recipeTags: ReadonlyMap<string, readonly string[]>,
): PlanViolation[] {
  const byId = new Map(persons.map((p) => [p.id, p]));
  const violations: PlanViolation[] = [];

  for (const day of plan.days) {
    for (const meal of day.meals) {
      const tags = recipeTags.get(meal.recipeId);
      if (!tags) continue; // unbekannte Rezept-IDs fängt die Pool-Prüfung im Planner
      for (const personId of meal.persons) {
        const person = byId.get(personId);
        if (!person) continue;
        for (const constraint of person.constraints) {
          if (recipeSatisfies(tags, constraint)) continue;
          const adapted = meal.adaptations.some((a) => a.personRef === personId);
          if (!adapted) {
            violations.push({
              personId,
              constraint,
              day: day.day,
              slot: meal.slot,
              recipeId: meal.recipeId,
            });
          }
        }
      }
    }
  }
  return violations;
}

/** Anzahl der Mahlzeiten, die per Anpassung an gemeinsamen Gerichten teilnehmen. */
export function countAdaptations(plan: WeekPlan): number {
  return plan.days.reduce((n, d) => n + d.meals.filter((m) => m.adaptations.length > 0).length, 0);
}

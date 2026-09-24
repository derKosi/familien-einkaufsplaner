import type { ConstraintTag, Person, Store } from "@fep/shared";

/**
 * LLM-Kontextvertrag (spec.md > llm/context-contract.ts):
 * Was den Server Richtung Claude verlässt, wird hier pseudonymisiert.
 * - Personen nur als GUID (personRef), Rollenklasse, Constraint-Tags, reine Zahlen.
 * - Niemals: Name, Haushaltsname, activityProfile-Freitext.
 * Das Mapping personRef → Person passiert nach der Validierung hier im Haus.
 */

export interface ContractPerson {
  personRef: string;
  roleClass: Person["roleClass"];
  constraints: ConstraintTag[];
  calorieGoal: number | null;
}

export interface PatternEntry {
  /** 0 = Montag … 6 = Sonntag */
  day: number;
  slot: "Frühstück" | "Mittag" | "Abendessen";
  personRefs: string[];
}

export interface PlannerContext {
  weekPattern: PatternEntry[];
  persons: ContractPerson[];
  recipes: Array<{
    id: string;
    title: string;
    tags: string[];
    quick: boolean;
    servingsBase: number;
  }>;
  offers: Array<{ store: Store; product: string; amount: string; priceCents: number }>;
}

/** Eine Person → ihre vertraglich erlaubte Projektion. */
export function contractPerson(person: Person): ContractPerson {
  return {
    personRef: person.id,
    roleClass: person.roleClass,
    constraints: person.constraints,
    calorieGoal: person.calorieGoal,
  };
}

/** Guardian: schmeißt alles raus, was den Vertrag verletzt — bevor es den Server verlässt. */
export function buildPlannerContext(input: {
  weekPattern: PatternEntry[];
  persons: Person[];
  recipes: PlannerContext["recipes"];
  offers: PlannerContext["offers"];
}): PlannerContext {
  const context: PlannerContext = {
    weekPattern: input.weekPattern,
    persons: input.persons.map(contractPerson),
    recipes: input.recipes.map((r) => ({
      id: r.id,
      title: r.title,
      tags: r.tags,
      quick: r.quick,
      servingsBase: r.servingsBase,
    })),
    offers: input.offers,
  };
  assertNoPii(context, input.persons);
  return context;
}

/** Harte Prüfung: keine Namen und keine Aktivitäts-Freitexte im Kontext. */
export function assertNoPii(context: PlannerContext, persons: Person[]): void {
  const serialized = JSON.stringify(context);
  for (const person of persons) {
    if (serialized.includes(person.name)) {
      throw new Error(`PII-Verstoß: Name "${person.name}" ist im Kontext gelandet.`);
    }
    if (person.activityProfile && serialized.includes(person.activityProfile)) {
      throw new Error(`PII-Verstoß: Aktivitätsprofil von "${person.name}" ist im Kontext gelandet.`);
    }
  }
}

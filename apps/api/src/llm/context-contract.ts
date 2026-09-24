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
  /** Weiche Einschränkungen — per Anpassung am Basisgericht lösbar. */
  constraints: ConstraintTag[];
  /** Harte Allergien — das Basisgericht muss sie erfüllen, keine Anpassung. */
  allergies: ConstraintTag[];
  calorieGoal: number | null;
}

export interface PatternEntry {
  /** 0 = Montag … 6 = Sonntag */
  day: number;
  slot: "Frühstück" | "Mittag" | "Abendessen";
  personRefs: string[];
}

export interface ContractHousehold {
  /** 1 = knapp, 2 = normal, 3 = großzügig — gewichtet Gerichte-/Vorschlagswahl. */
  budget: number;
  freezer: boolean;
  /** Koch-Level 1–3 — Rezepte darüber vermeiden („ganze Hühner"). */
  skillLevel: number;
  /** Tage, an denen frisch gekocht wird — quick-Flags und Frische danach planen. */
  cookDays: number[];
}

export interface PlannerContext {
  weekPattern: PatternEntry[];
  persons: ContractPerson[];
  household: ContractHousehold;
  recipes: Array<{
    id: string;
    title: string;
    tags: string[];
    quick: boolean;
    skill: number;
    equipment: string[];
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
    allergies: person.allergies,
    calorieGoal: person.calorieGoal,
  };
}

/** Guardian: schmeißt alles raus, was den Vertrag verletzt — bevor es den Server verlässt. */
export function buildPlannerContext(input: {
  weekPattern: PatternEntry[];
  persons: Person[];
  household: ContractHousehold;
  recipes: PlannerContext["recipes"];
  offers: PlannerContext["offers"];
}): PlannerContext {
  const context: PlannerContext = {
    weekPattern: input.weekPattern,
    persons: input.persons.map(contractPerson),
    household: input.household,
    recipes: input.recipes.map((r) => ({
      id: r.id,
      title: r.title,
      tags: r.tags,
      quick: r.quick,
      skill: r.skill,
      equipment: r.equipment,
      servingsBase: r.servingsBase,
    })),
    offers: input.offers,
  };
  assertNoPii(context, input.persons);
  return context;
}

/**
 * Harte Prüfung: keine Namen und keine Aktivitäts-Freitexte im Kontext.
 * Auf Wortgrenzen geprüft (Live-Fund: „Max" ⊂ „Maxi"-Produkt war ein Fehlalarm)
 * — Namen sind case-sensitive exakt als eigenes Wort verboten.
 */
export function assertNoPii(context: PlannerContext, persons: Person[]): void {
  const serialized = JSON.stringify(context);
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const person of persons) {
    if (new RegExp(`\\b${escape(person.name)}\\b`).test(serialized)) {
      throw new Error(`PII-Verstoß: Name "${person.name}" ist im Kontext gelandet.`);
    }
    if (person.activityProfile && serialized.includes(person.activityProfile)) {
      throw new Error(`PII-Verstoß: Aktivitätsprofil von "${person.name}" ist im Kontext gelandet.`);
    }
  }
}

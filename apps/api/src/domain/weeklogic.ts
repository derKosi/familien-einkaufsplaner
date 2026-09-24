import type { MealSlot, NextMeal, Person, WeekPlan } from "@fep/shared";
import type { PatternEntry } from "../llm/context-contract.js";

/**
 * Wochenlogik (spec.md > domain/): Mahlzeitenmuster, Next-Meal-Bestimmung und
 * Meal-Prep-Zähler — alles deterministisch, ohne LLM (spec.md > Core Journey 5).
 */

/** Grobe Tageszeit je Slot — reicht für „liegt das schon hinter uns?“. */
export const SLOT_ORDER: MealSlot[] = ["Frühstück", "Mittag", "Abendessen"];
const SLOT_HOUR: Record<MealSlot, number> = {
  Frühstück: 10,
  Mittag: 14,
  Abendessen: 20,
};

/**
 * E33-Default (prd.md > Wochenplan): werktags Frühstück + Abendessen für alle,
 * Erwachsene zusätzlich Mittag (to go), samstags nur Mittag, sonntags alle drei.
 * Slice 7 macht das Muster editierbar — bis dahin gilt dieser gute Default.
 */
export function defaultWeekPattern(persons: Person[]): PatternEntry[] {
  const all = persons.map((p) => p.id);
  const adults = persons.filter((p) => p.roleClass === "Erwachsener").map((p) => p.id);
  const entries: PatternEntry[] = [];

  for (let day = 0; day < 7; day++) {
    const weekday = day <= 4;
    const sunday = day === 6;
    const saturday = day === 5;

    if (weekday || sunday) {
      entries.push({ day, slot: "Frühstück", personRefs: all });
    }
    if (!saturday) {
      entries.push({ day, slot: "Abendessen", personRefs: all });
    }
    if ((weekday && adults.length > 0) || saturday) {
      entries.push({ day, slot: "Mittag", personRefs: saturday ? all : adults });
    }
  }
  return entries;
}

/** Montag der aktuellen Woche, ISO-Datum. */
export function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const jsDay = d.getUTCDay() || 7; // 1 = Montag … 7 = Sonntag
  d.setUTCDate(d.getUTCDate() - (jsDay - 1));
  return d.toISOString().slice(0, 10);
}

/** Numerischer „Zeitstempel“ einer Mahlzeit: Tag × 24 + Slot-Stunde. */
function mealTick(day: number, slot: MealSlot): number {
  return day * 24 + SLOT_HOUR[slot];
}

/** Jetzt als Tick im Plan-Koordinatensystem (Montag 0 Uhr = 0). */
function nowTick(now: Date): number {
  const jsDay = now.getDay(); // 0 = Sonntag
  const day = jsDay === 0 ? 6 : jsDay - 1;
  return day * 24 + now.getHours();
}

/**
 * Nächstes geplantes Essen ab jetzt — oder null, wenn die Woche durch ist.
 * Der Server rechnet es pro State-Abruf neu (spec.md > Core Journey 5).
 */
export function computeNextMeal(
  plan: WeekPlan,
  recipeTitle: (recipeId: string) => string | undefined,
  now: Date,
): NextMeal | null {
  const current = nowTick(now);
  let best: { tick: number; meal: (typeof plan.days)[number]["meals"][number]; day: number } | null = null;
  for (const day of plan.days) {
    for (const meal of day.meals) {
      const tick = mealTick(day.day, meal.slot);
      if (tick < current) continue;
      if (!best || tick < best.tick) best = { tick, meal, day: day.day };
    }
  }
  if (!best) return null;
  return {
    day: best.day,
    slot: best.meal.slot,
    recipeId: best.meal.recipeId,
    title: recipeTitle(best.meal.recipeId) ?? best.meal.recipeId,
    servings: best.meal.servings,
    personCount: best.meal.persons.length,
    quick: best.meal.quick,
  };
}

/** Meal-Prep-Status: Mahlzeiten der Woche, deren Slot-Zeit schon vorbei ist. */
export function countPreparedMeals(plan: WeekPlan, now: Date): number {
  const current = nowTick(now);
  let count = 0;
  for (const day of plan.days) {
    for (const meal of day.meals) {
      if (mealTick(day.day, meal.slot) < current) count++;
    }
  }
  return count;
}

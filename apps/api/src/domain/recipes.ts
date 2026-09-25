import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RecipesFile, type Recipe, type RecipeSummary } from "@fep/shared";
import { dataDir } from "../paths.js";

/**
 * Der kuratierte Rezept-Pool (spec.md > data/recipes.json): handautoriert,
 * im Build erzeugt, zur Laufzeit nur lesend — keine externe Rezept-DB im PoC.
 */

let cache: Recipe[] | null = null;

export function loadRecipes(): Recipe[] {
  if (cache) return cache;
  const raw = JSON.parse(readFileSync(join(dataDir, "recipes.json"), "utf8"));
  cache = RecipesFile.parse(raw).recipes;
  return cache;
}

/** Basis-Projektion ohne Preis/kcal — dekorirt getState mit den Aggregations-Helfern. */
export function recipesSummary(): Array<Omit<RecipeSummary, "portionPriceCents" | "kcalPerPortion">> {
  return loadRecipes().map((r) => ({
    id: r.id,
    title: r.title,
    quick: r.tags.includes("schnell"),
    tags: r.tags,
    steps: r.steps,
    minutes: r.minutes,
    skill: r.skill,
    equipment: r.equipment,
  }));
}

export function recipeById(id: string): Recipe | undefined {
  return loadRecipes().find((r) => r.id === id);
}

/** Projektion für den LLM-Kontext — Mengenbasis ist 1 Portion, der Plan skaliert. */
export function plannerRecipes() {
  return loadRecipes().map((r) => ({
    id: r.id,
    title: r.title,
    tags: r.tags,
    quick: r.tags.includes("schnell"),
    skill: r.skill,
    equipment: r.equipment,
    servingsBase: 1,
  }));
}

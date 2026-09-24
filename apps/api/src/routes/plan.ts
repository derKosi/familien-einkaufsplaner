import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CreateEventRequest,
  EventSuggestionsResponse,
  ExemptDaysRequest,
  GeneratePlanRequest,
  MealSlot,
  RecipePricesResponse,
  WeekPlan,
  type AppState,
} from "@fep/shared";
import { buildPlannerContext, type PatternEntry } from "../llm/context-contract.js";
import { generateWeekPlan, PlannerError, realPlanClient } from "../llm/planner.js";
import { loadPersons, getState } from "../household-repo.js";
import { latestOfferSnapshot } from "../offers/store.js";
import { plannerRecipes } from "../domain/recipes.js";
import { defaultWeekPattern, mondayOf } from "../domain/weeklogic.js";
import { loadWeekPlan, saveWeekPlan } from "../plan-repo.js";
import { clearChecked, setChecked } from "../list-repo.js";
import { addEvent, clearEvents } from "../event-repo.js";
import { eventSuggestions, recipePriceRows } from "../domain/aggregation.js";
import { loadRecipes } from "../domain/recipes.js";

/**
 * Der Kernel (spec.md > Core Journey 2, prd.md > Wochenplan): Laden wählen →
 * Kontext bauen (pseudonymisiert) → Claude aufrufen (validiert, mit Retry) →
 * Plan persistieren → Liste kommt in Slice 5 dazu.
 */
export async function registerPlanRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/plan/generate", async (request, reply) => {
    const body = GeneratePlanRequest.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Ungültiger Request-Body.", code: "bad_request" });
    }
    const { store, allowNoOffers } = body.data;

    const persons = loadPersons();
    if (persons.length === 0) {
      return reply.code(409).send({
        error: "Kein Haushalt vorhanden — lege zuerst einen Haushalt an.",
        code: "no_household",
      });
    }

    const snapshot = latestOfferSnapshot();
    if (!snapshot && !allowNoOffers) {
      return reply.code(409).send({
        error:
          "Keine aktuellen Angebote gefunden. Du kannst trotzdem planen — der Plan wird dann als „ohne Aktionsbasis“ markiert.",
        code: "no_offers",
      });
    }

    const pattern: PatternEntry[] = defaultWeekPattern(persons);
    const context = buildPlannerContext({
      weekPattern: pattern,
      persons,
      recipes: plannerRecipes(),
      offers: (snapshot?.offers ?? []).map((o) => ({
        store: o.store,
        product: o.product,
        amount: o.amount ?? "",
        priceCents: o.priceCents,
      })),
    });

    let plan;
    try {
      plan = (await generateWeekPlan(realPlanClient(), context)).plan;
    } catch (e) {
      if (e instanceof PlannerError) {
        return reply.code(502).send({ error: e.message, code: "planner_failed" });
      }
      throw e;
    }

    const weekPlan = WeekPlan.parse({
      weekOf: mondayOf(new Date()),
      store,
      basedOnOffers: snapshot?.offers.length ?? 0,
      offersDated: snapshot?.fetchedAt ?? null,
      days: plan.days.map((day) => ({
        day: day.day,
        meals: day.meals.map((meal) => ({
          slot: meal.slot,
          recipeId: meal.recipeId,
          servings: meal.servings,
          persons: meal.personRefs,
          quick: meal.quick,
          adaptations: meal.adaptations,
          prepared: "auto",
        })),
      })),
      missingInfo: plan.missingInfo,
    });
    saveWeekPlan(weekPlan);
    clearChecked(); // neue Woche, neuer Haken-Stand (prd.md > Wochenplan: ersetzt sichtbar)
    clearEvents(); // neue Woche, neue Events

    return getState() satisfies AppState;
  });

  /** Vorschläge aus dem aktuellen Angebot — mit Portionspreis und kcal (Checkpoint-Wunsch). */
  app.get("/api/plan/event-suggestions", async () =>
    EventSuggestionsResponse.parse({ suggestions: eventSuggestions() }),
  );

  /** Aufklappbares Zutaten-Preis-Panel (Checkpoint: „pro Portion oder gesamt"). */
  app.get("/api/recipes/:id/prices", async (request, reply) => {
    const { id } = request.params as { id: string };
    const servings = Math.max(1, Number.parseInt((request.query as { servings?: string }).servings ?? "2") || 2);
    const recipe = loadRecipes().find((r) => r.id === id);
    if (!recipe) {
      return reply.code(404).send({ error: "Rezept unbekannt.", code: "no_recipe" });
    }
    return RecipePricesResponse.parse(recipePriceRows(id, servings));
  });

  /**
   * Event hinzufügen (spec.md > Core Journey 3): skaliert die Hauptmahlzeit des
   * Tages und rechnet die Liste sofort neu. Ohne erkennbarem Gericht läuft der
   * Hinweis als freier Titel — ehrlich ohne Listen-Impact.
   */
  app.post("/api/plan/events", async (request, reply) => {
    const body = CreateEventRequest.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Ungültiger Request-Body.", code: "bad_request" });
    }
    if (!loadWeekPlan()) {
      return reply.code(409).send({ error: "Kein Wochenplan vorhanden.", code: "no_plan" });
    }
    const { day, personCount, dishHint } = body.data;

    let recipeId: string | null = null;
    let title = dishHint?.trim() || "";
    if (dishHint) {
      const hint = dishHint.toLowerCase();
      recipeId = loadRecipes().find(
        (r) => r.id.includes(hint.replace(/\s+/g, "-")) || r.title.toLowerCase().includes(hint) || hint.includes(r.title.toLowerCase()),
      )?.id ?? null;
      // Ehrlich bleiben: ein Hinweis, der kein Rezept trifft, bleibt Freititel —
      // kein stillschweigender Ersatz (Checkpoint: Vorschlag ODER Auswahl).
    } else {
      // Ohne Hinweis: der Top-Vorschlag aus dem aktuellen Angebot (Autoselect).
      const top = eventSuggestions(1)[0];
      if (top) {
        recipeId = top.recipeId;
        title = top.title;
      }
    }
    if (recipeId && !title) {
      title = loadRecipes().find((r) => r.id === recipeId)?.title ?? recipeId;
    }

    addEvent({ day, personCount, recipeId, title: title || "Event" });
    return getState() satisfies AppState;
  });

  /** Tag aussetzen / wieder aufnehmen (prd.md > Events & Ausnahmen): Liste rechnet sofort neu. */
  app.post("/api/plan/exemptions", async (request, reply) => {
    const body = ExemptDaysRequest.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Ungültiger Request-Body.", code: "bad_request" });
    }
    const plan = loadWeekPlan();
    if (!plan) {
      return reply.code(409).send({ error: "Kein Wochenplan vorhanden.", code: "no_plan" });
    }
    saveWeekPlan({ ...plan, exemptDays: [...new Set(body.data.days)].sort() });
    return getState() satisfies AppState;
  });

  /** Abhak in der Liste (spec.md > Core Journey 4): Schlüssel ist der Zutaten-Schlüssel. */
  app.patch("/api/shopping-list/:itemId", async (request, reply) => {
    const { itemId } = request.params as { itemId: string };
    const body = z.object({ checked: z.boolean() }).safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Ungültiger Request-Body.", code: "bad_request" });
    }
    setChecked(decodeURIComponent(itemId), body.data.checked);
    return getState() satisfies AppState;
  });

  /** Abhak beim Kochen (Checkpoint): (day, slot) ist der natürliche Schlüssel einer Mahlzeit. */
  app.patch("/api/plan/meal", async (request, reply) => {
    const body = z
      .object({
        day: z.number().int().min(0).max(6),
        slot: MealSlot,
        prepared: z.boolean(),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Ungültiger Request-Body.", code: "bad_request" });
    }

    const plan = loadWeekPlan();
    if (!plan) {
      return reply.code(404).send({ error: "Kein Wochenplan vorhanden.", code: "no_plan" });
    }

    const day = plan.days.find((d) => d.day === body.data.day);
    const meal = day?.meals.find((m) => m.slot === body.data.slot);
    if (!meal) {
      return reply.code(404).send({ error: "Diese Mahlzeit gibt es im Plan nicht.", code: "no_meal" });
    }

    meal.prepared = body.data.prepared ? "ja" : "nein";
    saveWeekPlan(plan);
    return getState() satisfies AppState;
  });
}

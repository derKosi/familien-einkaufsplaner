import { describe, expect, it } from "vitest";
import type { PlannerContext } from "../src/llm/context-contract.js";
import { generateWeekPlan, PlanClient, PlannerError } from "../src/llm/planner.js";

/**
 * Beweis der Invalid-Antwort-Route (checklist.md Slice 4, spec.md > planner.ts):
 * Der erste Versuch verletzt Gustavs milchfrei-Constraint, die Fehlermeldung geht
 * in den zweiten Aufruf — der korrigierte Plan kommt validiert durch. Ohne Netz.
 */

const GUSTAV = "33333333-4333-4333-8333-333333333333";

const context: PlannerContext = {
  weekPattern: [{ day: 0, slot: "Abendessen", personRefs: [GUSTAV] }],
  persons: [
    { personRef: GUSTAV, roleClass: "Erwachsener", constraints: ["milchfrei"], calorieGoal: null },
  ],
  recipes: [
    { id: "kaese-omelett", title: "Käse-Omelett", tags: ["vegetarisch"], quick: true, servingsBase: 1 },
    { id: "linsen-dal", title: "Roter Linsen-Dal", tags: ["vegetarisch", "milchfrei"], quick: true, servingsBase: 1 },
  ],
  offers: [],
};

function planJson(violatingDay: number, violatingRecipe: string, okRecipe: string, adaptOnDay?: number): string {
  return JSON.stringify({
    days: Array.from({ length: 7 }, (_, day) => ({
      day,
      meals: [
        {
          slot: "Abendessen",
          recipeId: day === violatingDay ? violatingRecipe : okRecipe,
          personRefs: [GUSTAV],
          servings: 1,
          quick: true,
          ...(day === adaptOnDay
            ? { adaptations: [{ personRef: GUSTAV, note: "Sahne → Haferdrink, ohne Butter" }] }
            : {}),
        },
      ],
    })),
    missingInfo: [],
  });
}

function scriptedClient(responses: string[], calls: string[][]): PlanClient {
  let i = 0;
  return {
    messages: {
      async create(params: Record<string, unknown>) {
        const content = (params.messages as Array<{ content: string }>)[0]?.content ?? "";
        calls.push([content]);
        const text = responses[i];
        i++;
        if (text === undefined) throw new Error("Mock erschöpft — Planner hätte stoppen müssen");
        return { content: [{ type: "text", text }] };
      },
    },
  };
}

describe("Planner-Retry bei Constraint-Verstoß", () => {
  it("erster Versuch milchfrei-Verstoß → Fehlerkontext → zweiter Versuch besteht", async () => {
    const calls: string[][] = [];
    const { plan, attempts } = await generateWeekPlan(
      scriptedClient(
        [planJson(0, "kaese-omelett", "linsen-dal"), planJson(-1, "kaese-omelett", "linsen-dal")],
        calls,
      ),
      context,
    );

    expect(plan.days[0].meals[0].recipeId).toBe("linsen-dal");
    expect(attempts).toHaveLength(1);
    // Der Retry-Text nennt die Verletzung — mit GUID, ohne Namen (Kontextvertrag).
    expect(calls[1][0]).toContain("milchfrei");
    expect(calls[1][0]).toContain(GUSTAV);
  });

  it("Basisgericht mit Anpassung besteht ohne Retry (gemeinsames Gericht bleibt)", async () => {
    const calls: string[][] = [];
    const { plan, attempts } = await generateWeekPlan(
      scriptedClient([planJson(0, "kaese-omelett", "linsen-dal", 0)], calls),
      context,
    );
    expect(attempts).toHaveLength(0);
    expect(plan.days[0].meals[0].adaptations).toHaveLength(1);
  });

  it("durchgehend untaugliche Antworten → PlannerError nach 3 Versuchen", async () => {
    const calls: string[][] = [];
    const bad = planJson(0, "kaese-omelett", "linsen-dal");
    await expect(
      generateWeekPlan(scriptedClient([bad, bad, bad], calls), context),
    ).rejects.toBeInstanceOf(PlannerError);
    expect(calls).toHaveLength(3);
  });
});

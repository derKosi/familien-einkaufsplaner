import Anthropic from "@anthropic-ai/sdk";
import { PlannerOutput, type PlannerOutput as PlannerOutputT } from "@fep/shared";
import type { PlannerContext } from "./context-contract.js";

/**
 * Der Kopf (spec.md > llm/planner.ts): Claude wählt Rezepte, prüft Constraints,
 * baut die Woche, portioniert. Die Einkaufsliste rechnet NICHT das LLM aus —
 * die kommt deterministisch aus domain/aggregation.ts.
 *
 * Zuverlässigkeit (Revision: der z.ai-Endpunkt erzwingt json_schema NICHT —
 * siehe checklist.md > Revisions): Der Plan wird per Prompt als JSON angefordert,
 * aus der Antwort extrahiert (inkl. ```-Fences) und mit zod gegen das Schema
 * geprüft; fachliche Prüfung (Rezept-IDs, personRefs) folgt. Schlägt ein Versuch
 * fehl, geht die Fehlermeldung mit in den nächsten Aufruf — max. 3 Versuche.
 * Thinking ist abgeschaltet (glm-5.3 grübelt sonst minutenlang).
 */

const MODEL = process.env.FEP_MODEL ?? "claude-opus-5";
const MAX_ATTEMPTS = 3;

/** Harte Zeitgrenze: ein Plan ist kein Gedicht. 60 s, kein SDK-Retry — der Planner hat seine eigene Retry-Logik. */
const REQUEST_OPTIONS = { timeout: 60_000, maxRetries: 0 } as const;

/** Minimal-Client-Interface — erlaubt den Flash-Mock im Smoke-Test ohne Netz und Key. */
export interface PlanClient {
  messages: {
    create(params: Record<string, unknown>, options?: Record<string, unknown>): Promise<{
      content: Array<{ type: string; text?: string }>;
    }>;
  };
}

export class PlannerError extends Error {
  constructor(public readonly attempts: string[]) {
    super(`Plan konnte nach ${attempts.length} Versuchen nicht erzeugt werden.`);
  }
}

function buildPrompt(context: PlannerContext, previousErrors: string[]): string {
  const errorBlock = previousErrors.length
    ? `\n\nDeine vorherigen Versuche waren unbrauchbar:\n${previousErrors.map((e) => `- ${e}`).join("\n")}\nKorrigiere genau diese Punkte.`
    : "";
  return `Erstelle einen Essensplan für genau eine Woche (7 Tage, Tag 0 = Montag bis Tag 6 = Sonntag).

Regeln:
- Der weekPattern listet jede geplante Mahlzeit als Eintrag {day, slot, personRefs} — erzeuge für JEDEN Eintrag genau eine Mahlzeit im Plan, und keine zusätzlich.
- Nutze AUSSCHLIESSLICH Rezepte mit den angegebenen recipeIds.
- Die personRefs einer geplanten Mahlzeit übernimmst du; die servings entsprechen der Personenzahl (Jugendliche zählen 0.75, kaufmännisch aufgerundet).
- Respektiere die constraints jeder beteiligten Person (z. B. vegetarisch: kein Fleisch, milchfrei: keine Milchprodukte) in den gewählten Rezepten.
- Abwechslung: kein Rezept doppelt innerhalb von 3 aufeinanderfolgenden Tagen.
- Bevorzuge bei der Auswahl Rezepte, die viele aktuelle Angebote (offers) abdecken.
- Zeige im Feld missingInfo, welche Informationen dir für eine bessere Planung fehlen (leeres Array, wenn nichts fehlt).

Antworte AUSSCHLIESSLICH mit JSON (kein Markdown, keine Erklärung) in dieser Struktur:
{"days":[{"day":0,"meals":[{"slot":"Frühstück","recipeId":"…","personRefs":["…"],"servings":4,"quick":true}]}],"missingInfo":[]}
(7 Tage, Tag 0–6.)${errorBlock}

Kontext (JSON):
${JSON.stringify(context, null, 2)}`;
}

/** Holt das JSON aus der Antwort — mit oder ohne ```-Fence, sonst erster { bis letzter }. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new SyntaxError("Antwort enthält kein parsebares JSON.");
  }
}

function validateAgainstPool(plan: PlannerOutputT, context: PlannerContext): string | null {
  const knownIds = new Set(context.recipes.map((r) => r.id));
  const refs = new Set(context.persons.map((p) => p.personRef));
  for (const day of plan.days) {
    for (const meal of day.meals) {
      if (!knownIds.has(meal.recipeId)) {
        return `Unbekannte recipeId "${meal.recipeId}" an Tag ${day.day}.`;
      }
      for (const ref of meal.personRefs) {
        if (!refs.has(ref)) {
          return `Unbekannte personRef "${ref}" an Tag ${day.day} — nur GUIDs aus dem Kontext erlaubt.`;
        }
      }
    }
  }
  return null;
}

export async function generateWeekPlan(
  client: PlanClient,
  context: PlannerContext,
): Promise<{ plan: PlannerOutputT; attempts: string[] }> {
  const previousErrors: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await client.messages.create(
        {
          model: MODEL,
          max_tokens: 8000,
          thinking: { type: "disabled" },
          messages: [{ role: "user", content: buildPrompt(context, previousErrors) }],
        },
        REQUEST_OPTIONS,
      );

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("\n");
      if (!text.trim()) {
        previousErrors.push("Leere Antwort (kein Textblock).");
        continue;
      }

      const parsed = PlannerOutput.safeParse(extractJson(text));
      if (!parsed.success) {
        previousErrors.push(`Antwort verletzt das Schema: ${parsed.error.issues[0]?.message ?? "unbekannt"}`);
        continue;
      }

      const poolProblem = validateAgainstPool(parsed.data, context);
      if (poolProblem) {
        previousErrors.push(poolProblem);
        continue;
      }

      return { plan: parsed.data, attempts: previousErrors };
    } catch (e) {
      previousErrors.push(e instanceof Error ? e.message : String(e));
    }
  }

  throw new PlannerError(previousErrors);
}

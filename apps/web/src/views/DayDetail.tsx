import type { AppState } from "@fep/shared";

interface Props {
  state: AppState;
  day: number;
  onBack: () => void;
}

const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const SLOT_ORDER = ["Frühstück", "Mittag", "Abendessen"] as const;

const TAG_LABEL: Record<string, string> = {
  vegetarisch: "vegetarisch",
  milchfrei: "milchfrei",
  vegan: "vegan",
  glutenfrei: "glutenfrei",
  schnell: "schnell kochbar",
};

/**
 * Tagesdetail (prd.md > Screens and Layout 2): Gerichte des Tages, wer mitisst,
 * Einschränkungs-Tags sichtbar. Events/Aussetzen kommen mit Slice 6 — hier
 * liegt der Lese-Grundstock.
 */
export function DayDetail({ state, day, onBack }: Props) {
  const dayPlan = state.weekPlan?.days.find((d) => d.day === day);
  const names = (ids: string[]) =>
    (state.household?.persons ?? [])
      .filter((p) => ids.includes(p.id))
      .map((p) => p.name)
      .join(", ");
  const tags = (recipeId: string) =>
    state.recipes.find((r) => r.id === recipeId)?.tags ?? [];
  const meals = [...(dayPlan?.meals ?? [])].sort(
    (a, b) => SLOT_ORDER.indexOf(a.slot as (typeof SLOT_ORDER)[number]) - SLOT_ORDER.indexOf(b.slot as (typeof SLOT_ORDER)[number]),
  );

  return (
    <section className="day-detail" aria-label={`Tagesdetail ${DAYS[day]}`}>
      <button className="link-btn" onClick={onBack}>← Zurück zur Woche</button>
      <h2>{DAYS[day]}</h2>

      {meals.length === 0 && <p className="lead">Keine Mahlzeiten an diesem Tag (ausgesetzt oder nicht geplant).</p>}

      <div className="day-detail-meals">
        {meals.map((meal, i) => (
          <article key={i} className="meal-card">
            <div className="meal-card-slot">{meal.slot}</div>
            <h3>
              {state.recipes.find((r) => r.id === meal.recipeId)?.title ?? meal.recipeId}
              {meal.quick && <span className="quick-flag"> · schnell kochbar</span>}
            </h3>
            <div className="meal-card-persons">
              {names(meal.persons)} · {meal.servings} Portionen
            </div>
            <div className="meal-card-tags">
              {tags(meal.recipeId).map((t) => (
                <span key={t} className={`tag tag-${t}`}>{TAG_LABEL[t] ?? t}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import type { AppState } from "@fep/shared";

interface Props {
  state: AppState;
  day: number;
  onBack: () => void;
  onTogglePrepared: (day: number, slot: string, prepared: boolean) => void;
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
 * Anpassungen, Zubereitung — und der Abhak beim Kochen (Checkpoint).
 * Events/Aussetzen kommen mit Slice 6 — hier liegt der Lese-Grundstock.
 */
export function DayDetail({ state, day, onBack, onTogglePrepared }: Props) {
  const dayPlan = state.weekPlan?.days.find((d) => d.day === day);
  const personName = (id: string) => state.household?.persons.find((p) => p.id === id)?.name ?? "?";
  const recipe = (id: string) => state.recipes.find((r) => r.id === id);
  const meals = [...(dayPlan?.meals ?? [])].sort(
    (a, b) =>
      SLOT_ORDER.indexOf(a.slot as (typeof SLOT_ORDER)[number]) -
      SLOT_ORDER.indexOf(b.slot as (typeof SLOT_ORDER)[number]),
  );

  return (
    <section className="day-detail" aria-label={`Tagesdetail ${DAYS[day]}`}>
      <button className="link-btn" onClick={onBack}>← Zurück zur Woche</button>
      <h2>{DAYS[day]}</h2>

      {meals.length === 0 && (
        <p className="lead">Keine Mahlzeiten an diesem Tag (ausgesetzt oder nicht geplant).</p>
      )}

      <div className="day-detail-meals">
        {meals.map((meal, i) => {
          const r = recipe(meal.recipeId);
          return (
            <article key={i} className={`meal-card ${meal.prepared ? "prepared" : ""}`}>
              <div className="meal-card-head">
                <div>
                  <div className="meal-card-slot">{meal.slot}</div>
                  <h3>
                    {r?.title ?? meal.recipeId}
                    {meal.quick && <span className="quick-flag"> · schnell kochbar</span>}
                  </h3>
                </div>
                <label className="prepared-toggle">
                  <input
                    type="checkbox"
                    checked={meal.prepared}
                    onChange={(e) => onTogglePrepared(day, meal.slot, e.target.checked)}
                  />
                  zubereitet
                </label>
              </div>
              <div className="meal-card-persons">
                {meal.persons.map(personName).join(", ")} · {meal.servings} Portionen
              </div>
              {meal.adaptations.length > 0 && (
                <ul className="meal-card-adaptations">
                  {meal.adaptations.map((a, j) => (
                    <li key={j}>
                      <b>{personName(a.personRef)}:</b> {a.note}
                    </li>
                  ))}
                </ul>
              )}
              <div className="meal-card-tags">
                {(r?.tags ?? []).map((t) => (
                  <span key={t} className={`tag tag-${t}`}>{TAG_LABEL[t] ?? t}</span>
                ))}
              </div>
              {r && r.steps.length > 0 && (
                <details className="recipe-steps">
                  <summary>Zubereitung</summary>
                  <ol>
                    {r.steps.map((s, j) => (
                      <li key={j}>{s}</li>
                    ))}
                  </ol>
                </details>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

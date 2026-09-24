import { useEffect, useState } from "react";
import type { AppState, EventSuggestion, RecipePricesResponse } from "@fep/shared";
import { fetchEventSuggestions, fetchRecipePrices } from "../lib/api.js";

interface Props {
  state: AppState;
  day: number;
  onBack: () => void;
  onTogglePrepared: (day: number, slot: string, prepared: boolean) => void;
  onAddEvent: (day: number, personCount: number, dishHint: string | null) => void;
  onSetExempt: (days: number[]) => void;
}

const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const SLOT_ORDER = ["Frühstück", "Mittag", "Abendessen"] as const;
/** Gleiche Grobzeiten wie server-seitig (weeklogic) — für den auto-Vorschlag. */
const SLOT_HOUR: Record<string, number> = { Frühstück: 10, Mittag: 14, Abendessen: 20 };

function timePassed(day: number, slot: string): boolean {
  const jsDay = new Date().getDay();
  const today = jsDay === 0 ? 6 : jsDay - 1;
  return day * 24 + SLOT_HOUR[slot] < today * 24 + new Date().getHours();
}

const cents = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

/** Aufklappbare Zutaten-Preisliste (Checkpoint: „pro Portion oder gesamt"). */
function PricePanel({ recipeId, servings }: { recipeId: string; servings: number }) {
  const [prices, setPrices] = useState<RecipePricesResponse | null>(null);
  useEffect(() => {
    fetchRecipePrices(recipeId, servings).then(setPrices).catch(() => {});
  }, [recipeId, servings]);

  return (
    <details className="recipe-steps price-panel">
      <summary>Zutaten &amp; Preise</summary>
      {!prices && <p className="lead">Rechnet …</p>}
      {prices && (
        <table className="price-table">
          <thead>
            <tr><th>Zutat</th><th>je Portion</th><th>Preis/Portion</th><th>gesamt ({servings})</th></tr>
          </thead>
          <tbody>
            {prices.rows.map((row) => (
              <tr key={row.item}>
                <td>{row.item}{row.offerProduct && <em className="offer-hint"> · Angebot</em>}</td>
                <td>{row.amount}</td>
                <td>{cents(row.portionPriceCents)}</td>
                <td>{cents(row.totalPriceCents)}</td>
              </tr>
            ))}
            <tr className="price-total">
              <td colSpan={2}>Summe</td>
              <td>{cents(prices.rows.reduce((s, r) => s + r.portionPriceCents, 0))}</td>
              <td>{cents(prices.rows.reduce((s, r) => s + r.totalPriceCents, 0))}</td>
            </tr>
          </tbody>
        </table>
      )}
    </details>
  );
}

/**
 * Tagesdetail (prd.md > Screens and Layout 2): Gerichte, Mitesser, Anpassungen,
 * Zubereitung, Abhak — und der Einstieg für Event hinzufügen / Tag aussetzen.
 */
export function DayDetail({ state, day, onBack, onTogglePrepared, onAddEvent, onSetExempt }: Props) {
  const plan = state.weekPlan;
  const dayPlan = plan?.days.find((d) => d.day === day);
  const exempt = plan?.exemptDays.includes(day) ?? false;
  const dayEvents = state.events.filter((e) => e.day === day);
  const personName = (id: string) => state.household?.persons.find((p) => p.id === id)?.name ?? "?";
  const recipe = (id: string) => state.recipes.find((r) => r.id === id);
  const meals = [...(dayPlan?.meals ?? [])].sort(
    (a, b) =>
      SLOT_ORDER.indexOf(a.slot as (typeof SLOT_ORDER)[number]) -
      SLOT_ORDER.indexOf(b.slot as (typeof SLOT_ORDER)[number]),
  );

  // Event-Formular
  const [eventOpen, setEventOpen] = useState(false);
  const [personCount, setPersonCount] = useState(5);
  const [hint, setHint] = useState("");
  const [suggestions, setSuggestions] = useState<EventSuggestion[]>([]);
  useEffect(() => {
    if (eventOpen && suggestions.length === 0) {
      fetchEventSuggestions().then((r) => setSuggestions(r.suggestions)).catch(() => {});
    }
  }, [eventOpen, suggestions.length]);

  function toggleExempt() {
    if (!plan) return;
    const next = exempt
      ? plan.exemptDays.filter((d) => d !== day)
      : [...plan.exemptDays, day];
    onSetExempt(next);
  }

  return (
    <section className="day-detail" aria-label={`Tagesdetail ${DAYS[day]}`}>
      <button className="link-btn" onClick={onBack}>← Zurück zur Woche</button>
      <h2>{DAYS[day]}{exempt && <span className="exempt-label"> · ausgesetzt</span>}</h2>

      <div className="day-tools">
        <button className="small-btn" onClick={toggleExempt}>
          {exempt ? "Tag wieder aufnehmen" : "Tag aussetzen"}
        </button>
        <button className="small-btn" onClick={() => setEventOpen((v) => !v)}>
          {eventOpen ? "Event-Formular schließen" : "Event hinzufügen"}
        </button>
      </div>

      {eventOpen && (
        <div className="event-form">
          <label>
            Personen:
            <input
              type="number"
              min={1}
              max={30}
              value={personCount}
              onChange={(e) => setPersonCount(Number.parseInt(e.target.value) || 1)}
            />
          </label>
          <div className="event-suggestions">
            <div className="event-suggestions-title">Vorschläge aus dem aktuellen Angebot:</div>
            {suggestions.map((s) => (
              <button
                key={s.recipeId}
                className="suggestion-row"
                onClick={() => {
                  onAddEvent(day, personCount, s.title);
                  setEventOpen(false);
                }}
              >
                <b>{s.title}</b>
                <span>
                  ~{cents(s.portionPriceCents)}/Portion · {s.kcalPerPortion} kcal
                  {s.offerProducts.length > 0 && (
                    <em className="offer-hint"> · im Angebot: {s.offerProducts.slice(0, 2).join(", ")}</em>
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="event-free">
            <input
              type="text"
              placeholder="oder freie Eingabe (z. B. „Pizzabrocken“)"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
            />
            <button
              className="small-btn primary"
              onClick={() => {
                onAddEvent(day, personCount, hint.trim() || null);
                setEventOpen(false);
              }}
            >
              Hinzufügen
            </button>
          </div>
        </div>
      )}

      {exempt && (
        <p className="lead">Dieser Tag ist ausgesetzt — Mahlzeiten und Listenpositionen ruhen.</p>
      )}

      {dayEvents.map((e) => (
        <div key={e.id} className="event-marker">
          🎯 Event: {e.title} · +{e.personCount} Personen
          {e.recipeId && state.recipes.find((r) => r.id === e.recipeId) && (
            <span className="event-cost">
              {" "}· ~{cents(recipe(e.recipeId)!.portionPriceCents)}/Portion, {recipe(e.recipeId)!.kcalPerPortion} kcal
            </span>
          )}
        </div>
      ))}

      <div className="day-detail-meals">
        {meals.map((meal, i) => {
          const r = recipe(meal.recipeId);
          const checked = meal.prepared === "ja" || (meal.prepared === "auto" && timePassed(day, meal.slot));
          return (
            <article key={i} className={`meal-card ${checked ? "prepared" : ""}`}>
              <div className="meal-card-head">
                <div>
                  <div className="meal-card-slot">{meal.slot}</div>
                  <h3>
                    {r?.title ?? meal.recipeId}
                    {meal.quick && <span className="quick-flag"> · schnell kochbar</span>}
                  </h3>
                </div>
                <label className="prepared-toggle" title="Vorschlag aus der Uhrzeit — abwählen korrigiert (kein Knast).">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onTogglePrepared(day, meal.slot, e.target.checked)}
                  />
                  gegessen
                </label>
              </div>
              <div className="meal-card-persons">
                {meal.persons.map(personName).join(", ")} · {meal.servings} Portionen
                {r && (
                  <span className="portion-meta"> · ~{cents(r.portionPriceCents)}/Portion · {r.kcalPerPortion} kcal/Portion</span>
                )}
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
                  <span key={t} className={`tag tag-${t}`}>{t}</span>
                ))}
              </div>
              {r && <PricePanel recipeId={r.id} servings={meal.servings} />}
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

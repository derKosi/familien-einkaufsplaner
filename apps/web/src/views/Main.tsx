import type { AppState, Person, Store } from "@fep/shared";
import { PersonSwitcher } from "../components/PersonSwitcher.js";
import { DayDetail } from "./DayDetail.js";

interface Props {
  state: AppState;
  current: Person | null;
  onSelectPerson: (person: Person) => void;
  generating: boolean;
  generateError: string | null;
  onGenerate: (store: Store, allowNoOffers: boolean) => void;
  selectedDay: number | null;
  onSelectDay: (day: number | null) => void;
  onTogglePrepared: (day: number, slot: string, prepared: boolean) => void;
  onShowList: () => void;
}

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const SLOT_CHIP: Record<string, string> = {
  Frühstück: "F",
  Mittag: "M",
  Abendessen: "A",
};

function todayIndex(): number {
  const jsDay = new Date().getDay(); // 0 = Sonntag
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** Grobzeit je Slot — passt zur Server-Logik (weeklogic). */
function isPastSlot(slot: string): boolean {
  const hour: Record<string, number> = { Frühstück: 10, Mittag: 14, Abendessen: 20 };
  return new Date().getHours() >= hour[slot];
}

const STORE_LABEL: Record<Store, string> = {
  penny: "Penny",
  "aldi-sued": "Aldi Süd",
  lidl: "Lidl",
};

/**
 * Ehrliche Angebots-Lage (prd.md > Angebots-Basis): mit Snapshot zählt die
 * Kopfzeile die echte Basis; ohne Snapshot wird das offen gesagt — nie still
 * fingiert.
 */
function OffersNote({ state }: { state: AppState }) {
  if (!state.offers) {
    return (
      <div className="offers-note missing" title="Kein Angebots-Snapshot in data/offers/">
        Keine aktuellen Angebote — Planung läuft ohne Aktionsbasis
      </div>
    );
  }
  const date = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(state.offers.fetchedAt));
  return (
    <div className="offers-note" title={`Quelle: ${STORE_LABEL[state.offers.store]}-Angebots-API`}>
      {state.offers.count} aktuelle {STORE_LABEL[state.offers.store]}-Angebote (Stand {date})
    </div>
  );
}

/**
 * Hauptbildschirm (prd.md > Screens and Layout): Kopfzeile mit Ladenwahl und
 * Angebots-Indikator, Next-Meal-Hero, Wochenstreifen mit Mahlzeiten-Chips.
 */
export function Main({ state, current, onSelectPerson, generating, generateError, onGenerate, selectedDay, onSelectDay, onTogglePrepared, onShowList }: Props) {
  const today = todayIndex();
  const title = (id: string) => state.recipes.find((r) => r.id === id)?.title ?? id;
  const plan = state.weekPlan;

  return (
    <div className="main">
      <header className="topbar">
        <div className="household-name">{state.household?.name}</div>
        <OffersNote state={state} />
      </header>

      <section className="plan-controls">
        <label className="store-choice">
          Laden:
          <select defaultValue="penny" id="store-select">
            {(Object.keys(STORE_LABEL) as Store[]).map((s) => (
              <option key={s} value={s}>
                {STORE_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button
          className="generate-btn"
          disabled={generating}
          onClick={() => {
            const store = (document.getElementById("store-select") as HTMLSelectElement).value as Store;
            onGenerate(store, false);
          }}
        >
          {generating ? "Plane die Woche …" : plan ? "Woche neu planen" : "Plan erstellen"}
        </button>
        <span className="plan-basis">
          {plan
            ? plan.basedOnOffers > 0
              ? `basiert auf ${plan.basedOnOffers} aktuellen Angeboten`
              : "ohne aktuelle Angebote geplant"
            : ""}
        </span>
        {plan && (
          <button className="list-cta" onClick={onShowList}>
            Einkaufsliste
            {state.shoppingList.length > 0 && (
              <span className="list-cta-meta">
                {" "}· {state.shoppingList.filter((l) => l.checked).length}/{state.shoppingList.length}
              </span>
            )}
          </button>
        )}
      </section>

      {generateError && (
        <div className="generate-error" role="alert">
          <b>Planung fehlgeschlagen.</b> {generateError}
          {!state.offers && (
            <button
              className="link-btn"
              disabled={generating}
              onClick={() => {
                const store = (document.getElementById("store-select") as HTMLSelectElement).value as Store;
                onGenerate(store, true);
              }}
            >
              Trotzdem ohne Aktionsbasis planen
            </button>
          )}
        </div>
      )}

      <PersonSwitcher
        persons={state.household?.persons ?? []}
        current={current}
        onSelect={onSelectPerson}
      />

      {selectedDay !== null ? (
        <DayDetail state={state} day={selectedDay} onBack={() => onSelectDay(null)} onTogglePrepared={onTogglePrepared} />
      ) : (
        <>
          {state.nextMeal ? (
            <section className="next-meal" aria-label="Nächstes Essen">
              <div className="next-meal-kicker">Nächstes Essen · Tag {DAYS[state.nextMeal.day]} · {state.nextMeal.slot}</div>
              <h2>{state.nextMeal.title}</h2>
              <div className="next-meal-meta">
                für {state.nextMeal.servings} Portionen ({state.nextMeal.personCount} Personen)
                {state.nextMeal.quick && <span className="quick-flag">schnell kochbar</span>}
              </div>
              <div className="prepared-count">
                {state.mealsPrepared} von {state.mealsTotal} Mahlzeiten zubereitet
                <button className="link-btn" onClick={() => onSelectDay(state.nextMeal!.day)}>
                  Tag ansehen
                </button>
              </div>
            </section>
          ) : (
            <section className="next-meal empty">
              <b>Noch kein Wochenplan.</b>
              <span>Wähle einen Laden und plane die erste Woche.</span>
            </section>
          )}

          <section className="week-strip" aria-label="Wochenplan">
            {DAYS.map((day, i) => {
              const dayPlan = plan?.days.find((d) => d.day === i);
              return (
                <button
                  key={day}
                  className={`day-card ${i === today ? "today" : ""}`}
                  onClick={() => onSelectDay(i)}
                  title={`${day} im Detail ansehen`}
                >
                  <div className="day-name">{day}</div>
                  <div className="day-meals">
                    {dayPlan?.meals.map((meal, j) => (
                      <span
                        key={j}
                        className={`meal-chip ${meal.prepared === "ja" || (meal.prepared === "auto" && i === today && isPastSlot(meal.slot)) ? "chip-prepared" : ""}`}
                        title={`${meal.slot}: ${title(meal.recipeId)}`}
                      >
                        <b>{SLOT_CHIP[meal.slot]}</b> {title(meal.recipeId)}
                        {meal.quick && <i className="quick-dot">⚡</i>}
                        {(meal.prepared === "ja" || (meal.prepared === "auto" && i === today && isPastSlot(meal.slot))) && (
                          <i className="prepared-dot">✓</i>
                        )}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

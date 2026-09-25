import { useState } from "react";
import type { AppState, HouseholdSettings, MealSlot, Person } from "@fep/shared";
import { PersonForm } from "../components/PersonForm.js";
import { applyAppearance, loadAppearance, saveAppearance, type Appearance, type FontSizePref, type MotionPref, type ThemePref } from "../theme/theme.js";

interface Props {
  state: AppState;
  onBack: () => void;
  onSaveSettings: (patch: Partial<HouseholdSettings>) => void;
  onToggleComplete: (personId: string, complete: boolean) => void;
  onEditPerson: (personId: string, patch: Partial<Person>) => void;
}

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const SLOTS: MealSlot[] = ["Frühstück", "Mittag", "Abendessen"];

const coins = (n: number) => "€".repeat(n) + "◦".repeat(3 - n);

/**
 * Onboarding & Einstellungen (prd.md > Screens 4): Personen vervollständigen,
 * Wochenmuster ändern — plus die Checkpoint-Wünsche: Budget-Münzen (1–3),
 * Geräte (Tiefkühlfach), Koch-Level und Einkaufs-/Kochtage.
 */
export function Settings({ state, onBack, onSaveSettings, onToggleComplete, onEditPerson }: Props) {
  const s = state.household?.settings;
  if (!s) return <div className="first-start"><p className="lead">Kein Haushalt.</p></div>;

  const persons = state.household?.persons ?? [];
  const incomplete = persons.filter((p) => !p.complete);
  const adults = persons.filter((p) => p.roleClass === "Erwachsener").map((p) => p.id);
  /** Anzeige-Fallback: pattern null heißt serverseitig „Standard-Muster“, nicht „nichts geplant“. */
  const activePattern = s.pattern ?? defaultPatternFor(persons.map((p) => p.id), adults);
  /** Muster-Matrix: entry existiert → Personengruppe „alle“ oder „Erwachsene“. */
  const patternKey = (day: number, slot: MealSlot) =>
    activePattern.find((e) => e.day === day && e.slot === slot);

  /** Klick auf eine Muster-Zelle zykliert: leer → Erwachsene → alle → leer.
   *  (Vorher war „aus" unerreichbar — der Filter-Zweig war toter Code.) */
  function cycleSlot(day: number, slot: MealSlot) {
    const pattern = [...activePattern];
    const existing = pattern.find((e) => e.day === day && e.slot === slot);
    if (!existing) {
      const group = persons.length === adults.length || adults.length === 0 ? persons.map((p) => p.id) : adults;
      onSaveSettings({ pattern: [...pattern, { day, slot, personRefs: group }] });
    } else if (existing.personRefs.length < persons.length) {
      onSaveSettings({
        pattern: pattern.map((e) => (e === existing ? { ...e, personRefs: persons.map((p) => p.id) } : e)),
      });
    } else {
      onSaveSettings({ pattern: pattern.filter((e) => e !== existing) });
    }
  }

  const dayOptions = DAYS.map((label, i) => ({ label, value: i }));
  const [look, setLook] = useState<Appearance>(loadAppearance);
  function setLookPartial(patch: Partial<Appearance>) {
    const next = { ...look, ...patch };
    setLook(next);
    saveAppearance(next);
    applyAppearance(next);
  }

  return (
    <div className="main settings">
      <button className="link-btn" onClick={onBack}>← Zurück zur Woche</button>
      <h2>Einstellungen</h2>

      <section className="settings-block">
        <h3>Darstellung</h3>
        <div className="form-row">
          <span className="form-label">Farbschema:</span>
          {([["system", "System"], ["light", "Hell"], ["dark", "Dunkel"]] as Array<[ThemePref, string]>).map(([v, label]) => (
            <label key={v} className="radio-chip">
              <input type="radio" name="theme" checked={look.theme === v} onChange={() => setLookPartial({ theme: v })} />
              {label}
            </label>
          ))}
        </div>
        <div className="form-row">
          <span className="form-label">Schrift:</span>
          {([["normal", "normal"], ["large", "groß"]] as Array<[FontSizePref, string]>).map(([v, label]) => (
            <label key={v} className="radio-chip">
              <input type="radio" name="fontsize" checked={look.fontsize === v} onChange={() => setLookPartial({ fontsize: v })} />
              {label}
            </label>
          ))}
          <span className="form-label">Animation:</span>
          {([["system", "System"], ["reduced", "wenig"]] as Array<[MotionPref, string]>).map(([v, label]) => (
            <label key={v} className="radio-chip">
              <input type="radio" name="motion" checked={look.motion === v} onChange={() => setLookPartial({ motion: v })} />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="settings-block">
        <h3>Budget</h3>
        <div className="form-row">
          {[1, 2, 3].map((b) => (
            <label key={b} className="radio-chip">
              <input type="radio" name="budget" checked={s.budget === b} onChange={() => onSaveSettings({ budget: b })} />
              {coins(b)} <span className="form-label">{b === 1 ? "knapp" : b === 2 ? "normal" : "großzügig"}</span>
            </label>
          ))}
        </div>
        <p className="hint">Gewichtet die Gerichte-Vorschläge — Budget 1 sortiert Preis vor Angebot.</p>
      </section>

      <section className="settings-block">
        <h3>Küche &amp; Können</h3>
        <div className="form-row">
          <label className="radio-chip">
            <input type="checkbox" checked={s.freezer} onChange={(e) => onSaveSettings({ freezer: e.target.checked })} />
            Tiefkühlfach vorhanden
          </label>
          <label className="radio-chip">
            <input type="checkbox" checked={s.mealPrep} onChange={(e) => onSaveSettings({ mealPrep: e.target.checked })} />
            Vorkochen &amp; Einfrieren einplanen
          </label>
        </div>
        <div className="form-row">
          <span className="form-label">Koch-Level:</span>
          {[1, 2, 3].map((l) => (
            <label key={l} className="radio-chip">
              <input type="radio" name="skill" checked={s.skillLevel === l} onChange={() => onSaveSettings({ skillLevel: l })} />
              {l} — {l === 1 ? "einfach" : l === 2 ? "sicher" : "souverän"}
            </label>
          ))}
        </div>
        <p className="hint">
          Der Plan wählt überwiegend Rezepte bis zu diesem Level; ohne Tiefkühlfach keine TK-Rezepte. Mit Vorkochen
          &amp; Einfrieren plant der Plan große Ansätze und einfrierbare Reste — mit Hinweis je Gericht.
        </p>
      </section>

      <section className="settings-block">
        <h3>Einkaufs- &amp; Kochtage</h3>
        <div className="form-row">
          <span className="form-label">Einkaufstage:</span>
          {dayOptions.map((d) => (
            <label key={d.value} className="radio-chip">
              <input
                type="checkbox"
                checked={s.shoppingDays.includes(d.value)}
                onChange={() =>
                  onSaveSettings({
                    shoppingDays: s.shoppingDays.includes(d.value)
                      ? s.shoppingDays.filter((x) => x !== d.value)
                      : [...s.shoppingDays, d.value],
                  })
                }
              />
              {d.label}
            </label>
          ))}
        </div>
        <div className="form-row">
          <span className="form-label">Koch-/Prep-Tage:</span>
          {dayOptions.map((d) => (
            <label key={d.value} className="radio-chip">
              <input
                type="checkbox"
                checked={s.cookDays.includes(d.value)}
                onChange={() =>
                  onSaveSettings({
                    cookDays: s.cookDays.includes(d.value)
                      ? s.cookDays.filter((x) => x !== d.value)
                      : [...s.cookDays, d.value],
                  })
                }
              />
              {d.label}
            </label>
          ))}
        </div>
        <p className="hint">
          Der Plan läuft von Einkauf zu Einkauf (mehrere Tage erlaubt — nichts angewählt: egal, dann Montag). An
          Koch-/Prep-Tagen wird frisch gekocht und Komponenten für die Folgetage vorbereitet.
        </p>
      </section>

      <section className="settings-block">
        <h3>Wiederholungen</h3>
        <div className="form-row">
          {([["normal", "Meal-Prep erlaubt"], ["streng", "streng vermeiden"]] as Array<["normal" | "streng", string]>).map(
            ([v, label]) => (
              <label key={v} className="radio-chip">
                <input type="radio" name="repeat" checked={s.repeatPolicy === v} onChange={() => onSaveSettings({ repeatPolicy: v })} />
                {label}
              </label>
            ),
          )}
        </div>
        <p className="hint">
          „Meal-Prep erlaubt“: Reste-Tage und wiederkehrende Komponenten sind ausdrücklich okay. „Streng vermeiden“:
          kein Gericht doppelt in der Woche.
        </p>
      </section>

      <section className="settings-block">
        <h3>Wochenmuster</h3>
        <p className="hint">Klick auf die Zelle zykliert: + geplant (für Erwachsene, wenn es welche gibt) → alle → aus.</p>
        <table className="pattern-table">
          <thead>
            <tr><th></th>{DAYS.map((d) => <th key={d}>{d}</th>)}</tr>
          </thead>
          <tbody>
            {SLOTS.map((slot) => (
              <tr key={slot}>
                <th>{slot}</th>
                {DAYS.map((_, i) => {
                  const entry = patternKey(i, slot);
                  const all = entry && entry.personRefs.length === persons.length;
                  return (
                    <td key={i}>
                      {entry ? (
                        <button
                          className="pattern-cell on"
                          title="Klick: Erwachsene → alle → aus"
                          onClick={() => cycleSlot(i, slot)}
                        >
                          {all ? "alle" : "Erw."}
                        </button>
                      ) : (
                        <button className="pattern-cell" onClick={() => cycleSlot(i, slot)}>+</button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <button className="ghost-btn" onClick={() => onSaveSettings({ pattern: null })}>
          Auf Standard zurücksetzen
        </button>
      </section>

      <section className="settings-block">
        <h3>Personen</h3>
        {persons.map((p) => (
          <div key={p.id} className="settings-person">
            <div className="settings-person-row">
              <b>{p.name}</b>
              <span className="form-label">
                {p.roleClass}
                {p.calorieGoal && ` · ${p.calorieGoal} kcal`}
              </span>
              {p.constraints.length > 0 && (
                <span className="tag tag-constraint">isst nicht: {p.constraints.join(", ")}</span>
              )}
              {p.allergies.length > 0 && (
                <span className="tag tag-allergy">ALLERGIE: {p.allergies.join(", ")}</span>
              )}
              <label className="radio-chip">
                <input type="checkbox" checked={p.complete} onChange={(e) => onToggleComplete(p.id, e.target.checked)} />
                vollständig
              </label>
            </div>
            <details className="person-edit">
              <summary>Bearbeiten</summary>
              <PersonForm
                // Remount bei Datenänderung → das Formular zeigt immer den echten Stand.
                key={`${p.id}:${p.name}:${p.complete}:${p.constraints.join(",")}:${p.allergies.join(",")}:${p.calorieGoal ?? ""}`}
                initial={p}
                busy={false}
                primaryLabel="Speichern"
                secondaryLabel="Mit Lücken speichern"
                onSave={(patch) => onEditPerson(p.id, patch)}
              />
            </details>
          </div>
        ))}
        {incomplete.length > 0 && (
          <p className="hint">{incomplete.length} Person(en) unvollständig — über „Bearbeiten“ ausfüllen oder anhaken, sobald die Angaben nachgetragen sind.</p>
        )}
      </section>
    </div>
  );
}

/** Hilfsfunktion für den Muster-Editor — entspricht dem E33-Default serverseitig. */
function defaultPatternFor(all: string[], adults: string[]) {
  const entries: Array<{ day: number; slot: MealSlot; personRefs: string[] }> = [];
  for (let day = 0; day < 7; day++) {
    const weekday = day <= 4;
    if (weekday || day === 6) entries.push({ day, slot: "Frühstück", personRefs: all });
    if (day !== 5) entries.push({ day, slot: "Abendessen", personRefs: all });
    if ((weekday && adults.length > 0) || day === 5)
      entries.push({ day, slot: "Mittag", personRefs: day === 5 ? all : adults });
  }
  return entries;
}

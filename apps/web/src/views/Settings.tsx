import type { AppState, HouseholdSettings, MealSlot } from "@fep/shared";

interface Props {
  state: AppState;
  onBack: () => void;
  onSaveSettings: (patch: Partial<HouseholdSettings>) => void;
  onToggleComplete: (personId: string, complete: boolean) => void;
}

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const SLOTS: MealSlot[] = ["Frühstück", "Mittag", "Abendessen"];

const coins = (n: number) => "€".repeat(n) + "◦".repeat(3 - n);

/**
 * Onboarding & Einstellungen (prd.md > Screens 4): Personen vervollständigen,
 * Wochenmuster ändern — plus die Checkpoint-Wünsche: Budget-Münzen (1–3),
 * Geräte (Tiefkühlfach), Koch-Level und Einkaufs-/Kochtage.
 */
export function Settings({ state, onBack, onSaveSettings, onToggleComplete }: Props) {
  const s = state.household?.settings;
  if (!s) return <div className="first-start"><p className="lead">Kein Haushalt.</p></div>;

  const persons = state.household?.persons ?? [];
  const incomplete = persons.filter((p) => !p.complete);
  /** Muster-Matrix: entry existiert → Personengruppe „alle“ oder „Erwachsene“. */
  const patternKey = (day: number, slot: MealSlot) =>
    s.pattern?.find((e) => e.day === day && e.slot === slot);
  const adults = persons.filter((p) => p.roleClass === "Erwachsener").map((p) => p.id);

  function toggleSlot(day: number, slot: MealSlot) {
    const pattern = [...(s!.pattern ?? defaultPatternFor(persons.map((p) => p.id), adults))];
    const existing = pattern.find((e) => e.day === day && e.slot === slot);
    if (existing) {
      onSaveSettings({ pattern: pattern.filter((e) => e !== existing) });
    } else {
      const group = persons.length === adults.length || adults.length === 0 ? persons.map((p) => p.id) : adults;
      onSaveSettings({ pattern: [...pattern, { day, slot, personRefs: group }] });
    }
  }

  function cycleGroup(day: number, slot: MealSlot) {
    const existing = patternKey(day, slot);
    if (!existing) return;
    const pattern = (s!.pattern ?? []).map((e) =>
      e === existing
        ? { ...e, personRefs: e.personRefs.length === persons.length ? adults : persons.map((p) => p.id) }
        : e,
    );
    onSaveSettings({ pattern });
  }

  const dayOptions = DAYS.map((label, i) => ({ label, value: i }));

  return (
    <div className="main settings">
      <button className="link-btn" onClick={onBack}>← Zurück zur Woche</button>
      <h2>Einstellungen</h2>

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
        </div>
        <div className="form-row">
          <span className="form-label">Koch-Level:</span>
          {[1, 2, 3].map((l) => (
            <label key={l} className="radio-chip">
              <input type="radio" name="skill" checked={s.skillLevel === l} onChange={() => onSaveSettings({ skillLevel: l })} />
              {l} — {l === 1 ? "einfach" : l === 2 ? "sicher" : "souverän (ganze Hühner)"}
            </label>
          ))}
        </div>
        <p className="hint">Der Plan wählt überwiegend Rezepte bis zu diesem Level; ohne Tiefkühlfach keine TK-Rezepte.</p>
      </section>

      <section className="settings-block">
        <h3>Einkaufs- &amp; Kochtage</h3>
        <div className="form-row">
          <span className="form-label">Einkaufstag:</span>
          {dayOptions.map((d) => (
            <label key={d.value} className="radio-chip">
              <input
                type="radio"
                name="shopping"
                checked={s.shoppingDay === d.value}
                onChange={() => onSaveSettings({ shoppingDay: d.value })}
              />
              {d.label}
            </label>
          ))}
          <label className="radio-chip">
            <input type="radio" name="shopping" checked={s.shoppingDay === null} onChange={() => onSaveSettings({ shoppingDay: null })} />
            egal (Montag)
          </label>
        </div>
        <div className="form-row">
          <span className="form-label">Kochtage:</span>
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
        <p className="hint">Der Plan läuft von Einkaufstag zu Einkaufstag; an Kochtagen steht Frischkochen im Fokus.</p>
      </section>

      <section className="settings-block">
        <h3>Wochenmuster</h3>
        <p className="hint">Anklicken = Mahlzeit geplant (für Erwachsene, wenn es welche gibt). Nochmal klicken auf den Tag-Text wechselt alle ↔ Erwachsene.</p>
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
                          title="Klick: Gruppe wechseln · Zeile rechts entfernen"
                          onClick={() => cycleGroup(i, slot)}
                        >
                          {all ? "alle" : "Erw."}
                        </button>
                      ) : (
                        <button className="pattern-cell" onClick={() => toggleSlot(i, slot)}>+</button>
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
            <b>{p.name}</b>
            <span className="form-label">
              {p.roleClass}
              {p.constraints.length > 0 && ` · isst nicht: ${p.constraints.join(", ")}`}
              {p.allergies.length > 0 && ` · ALLERGIE: ${p.allergies.join(", ")}`}
              {p.calorieGoal && ` · ${p.calorieGoal} kcal`}
            </span>
            <label className="radio-chip">
              <input type="checkbox" checked={p.complete} onChange={(e) => onToggleComplete(p.id, e.target.checked)} />
              vollständig
            </label>
          </div>
        ))}
        {incomplete.length > 0 && (
          <p className="hint">{incomplete.length} Person(en) unvollständig — hier anhaken, sobald die Angaben nachgetragen sind.</p>
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

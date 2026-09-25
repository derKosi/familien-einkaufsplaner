import { useId, useState } from "react";
import type { ConstraintTag, Person, RoleClass } from "@fep/shared";

const CONSTRAINTS: Array<{ tag: ConstraintTag; label: string }> = [
  { tag: "vegetarisch", label: "vegetarisch" },
  { tag: "milchfrei", label: "milchfrei" },
  { tag: "vegan", label: "vegan" },
  { tag: "glutenfrei", label: "glutenfrei" },
];

const ROLES: Array<{ value: RoleClass; label: string }> = [
  { value: "Erwachsener", label: "Erwachsene(r)" },
  { value: "Jugendlicher", label: "Jugendliche(r)" },
  { value: "Kind", label: "Kind" },
];

interface Props {
  onSave: (person: Omit<Person, "id">) => void;
  busy?: boolean;
  /** Edit-Modus: Felder vorausgefüllt, Radio-Gruppen pro Instanz eindeutig. */
  initial?: Person;
  /** Button-Texte — Defaults passen zum Onboarding-Neuanlage-Modus. */
  primaryLabel?: string;
  secondaryLabel?: string;
}

/**
 * Das Personen-Formular aus dem Onboarding (prd.md > Screens 4) — dieselbe
 * Komponente, im Edit-Modus (initial) auch in den Einstellungen, damit
 * unvollständige Personen dort wirklich ausfüllbar sind (Slice 7, spec.md).
 */
export function PersonForm({ onSave, busy = false, initial, primaryLabel, secondaryLabel }: Props) {
  const uid = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState<RoleClass>(initial?.roleClass ?? "Erwachsener");
  const [constraints, setConstraints] = useState<ConstraintTag[]>(initial?.constraints ?? []);
  const [allergies, setAllergies] = useState<ConstraintTag[]>(initial?.allergies ?? []);
  const [calorieGoal, setCalorieGoal] = useState(initial?.calorieGoal ? String(initial.calorieGoal) : "");
  const [activity, setActivity] = useState(initial?.activityProfile ?? "");

  function build(complete: boolean): Omit<Person, "id"> {
    return {
      name: name.trim(),
      roleClass: role,
      colorPair: initial?.colorPair ?? "salbei", // Neuanlage: vergibt der Server aus der Palette
      constraints,
      allergies,
      calorieGoal: calorieGoal ? Number.parseInt(calorieGoal, 10) : null,
      activityProfile: activity || null,
      complete,
    };
  }

  function save(complete: boolean) {
    if (!name.trim()) return;
    onSave(build(complete));
    if (!initial) {
      setName("");
      setConstraints([]);
      setAllergies([]);
      setCalorieGoal("");
      setActivity("");
    }
  }

  const toggle = (list: ConstraintTag[], set: (v: ConstraintTag[]) => void, tag: ConstraintTag) =>
    set(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);

  return (
    <div className="person-form">
      <input className="text-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="form-row">
        {ROLES.map((r) => (
          <label key={r.value} className="radio-chip">
            <input type="radio" name={`role-${uid}`} checked={role === r.value} onChange={() => setRole(r.value)} />
            {r.label}
          </label>
        ))}
      </div>
      <div className="form-row">
        <span className="form-label">Isst nicht:</span>
        {CONSTRAINTS.map((c) => (
          <label key={c.tag} className="radio-chip">
            <input type="checkbox" checked={constraints.includes(c.tag)} onChange={() => toggle(constraints, setConstraints, c.tag)} />
            {c.label}
          </label>
        ))}
      </div>
      <div className="form-row">
        <span className="form-label">Allergie gegen:</span>
        {CONSTRAINTS.map((c) => (
          <label key={c.tag} className="radio-chip warn">
            <input type="checkbox" checked={allergies.includes(c.tag)} onChange={() => toggle(allergies, setAllergies, c.tag)} />
            {c.label}
          </label>
        ))}
      </div>
      <p className="hint">
        Allergien werden ernst genommen: Das Basisgericht muss allergenfrei sein — ein
        Tausch am fertigen Gericht reicht nicht (Erdnussbutter-Regel).
      </p>
      <div className="form-row">
        <input
          className="text-input"
          type="number"
          placeholder="Kalorienziel (optional)"
          value={calorieGoal}
          onChange={(e) => setCalorieGoal(e.target.value)}
        />
        <input
          className="text-input"
          placeholder="Beruf/Alltag (optional, verlässt den Server nie)"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
        />
      </div>
      <div className="form-row">
        <button
          className="primary"
          disabled={busy || !name.trim()}
          onClick={() => save(true)}
        >
          {primaryLabel ?? (busy ? "Anlegen …" : "Person speichern")}
        </button>
        <button
          className="ghost-btn"
          disabled={busy || !name.trim()}
          onClick={() => save(false)}
        >
          {secondaryLabel ?? "Später vervollständigen"}
        </button>
      </div>
    </div>
  );
}

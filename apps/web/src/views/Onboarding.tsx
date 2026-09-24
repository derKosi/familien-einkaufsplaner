import { useState } from "react";
import type { ConstraintTag, Person, RoleClass } from "@fep/shared";

interface Props {
  onCreateHousehold: (name: string) => void;
  onAddPerson: (person: Omit<Person, "id">) => void;
  onDone: () => void;
  state: import("@fep/shared").AppState;
  busy: boolean;
}

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

/**
 * Person-für-Person-Onboarding (prd.md > Screens 4): eigener Haushalt, dann
 * jede Person einzeln — mit Skip/Later für unvollständige Personen, die in den
 * Einstellungen vervollständigt werden (Slice 7, spec.md > Core Journey 1).
 */
export function Onboarding({ onCreateHousehold, onAddPerson, onDone, state, busy }: Props) {
  const household = state.household;
  const [name, setName] = useState("");

  // Schritt 1: Haushaltsname
  if (!household) {
    return (
      <div className="first-start">
        <span className="chip">Eigener Haushalt</span>
        <h1>Wie heißt euer Haushalt?</h1>
        <input
          className="text-input"
          placeholder="z. B. Haushalt Kowalski"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="primary" disabled={busy || !name.trim()} onClick={() => onCreateHousehold(name.trim())}>
          {busy ? "Anlegen …" : "Haushalt anlegen"}
        </button>
        <p className="hint">Danach legst du die Personen einzeln an — oder lässt jemanden erstmal offen.</p>
      </div>
    );
  }

  // Schritt 2: Personen einzeln
  return (
    <div className="first-start">
      <span className="chip">{household.name}</span>
      <h1>Wer gehört dazu?</h1>
      <p className="lead">
        {household.persons.length === 0
          ? "Lege die erste Person an."
          : `${household.persons.length} Person(en) dabei — weitere folgen oder startet.`}
      </p>

      <PersonForm
        onSave={(p) => onAddPerson(p)}
        busy={busy}
      />

      {household.persons.length > 0 && (
        <button className="primary" disabled={busy} onClick={onDone}>
          Zu meiner Woche
        </button>
      )}
      <p className="hint">
        Mit „Später“ bleibt jemand unvollständig stehen — markiert und jederzeit in den
        Einstellungen zu vervollständigen.
      </p>
    </div>
  );
}

function PersonForm({ onSave, busy }: { onSave: (p: Omit<Person, "id">) => void; busy: boolean }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleClass>("Erwachsener");
  const [constraints, setConstraints] = useState<ConstraintTag[]>([]);
  const [allergies, setAllergies] = useState<ConstraintTag[]>([]);
  const [calorieGoal, setCalorieGoal] = useState("");
  const [activity, setActivity] = useState("");

  function build(complete: boolean): Omit<Person, "id"> {
    return {
      name: name.trim(),
      roleClass: role,
      colorPair: "salbei", // vergibt der Server automatisch aus der Palette
      constraints: complete ? constraints : constraints,
      allergies: complete ? allergies : allergies,
      calorieGoal: complete && calorieGoal ? Number.parseInt(calorieGoal) : null,
      activityProfile: complete && activity ? activity : complete ? null : activity || null,
      complete,
    };
  }

  function save(complete: boolean) {
    if (!name.trim()) return;
    onSave(build(complete));
    setName(""); setConstraints([]); setAllergies([]); setCalorieGoal(""); setActivity("");
  }

  const toggle = (list: ConstraintTag[], set: (v: ConstraintTag[]) => void, tag: ConstraintTag) =>
    set(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);

  return (
    <div className="person-form">
      <input className="text-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="form-row">
        {ROLES.map((r) => (
          <label key={r.value} className="radio-chip">
            <input type="radio" name="role" checked={role === r.value} onChange={() => setRole(r.value)} />
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
        <button className="primary" disabled={busy || !name.trim()} onClick={() => save(true)}>
          Person speichern
        </button>
        <button className="ghost-btn" disabled={busy || !name.trim()} onClick={() => save(false)}>
          Später vervollständigen
        </button>
      </div>
    </div>
  );
}

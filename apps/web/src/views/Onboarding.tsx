import { useState } from "react";
import type { Person } from "@fep/shared";
import { PersonForm } from "../components/PersonForm.js";

interface Props {
  onCreateHousehold: (name: string) => void;
  onAddPerson: (person: Omit<Person, "id">) => void;
  onDone: () => void;
  state: import("@fep/shared").AppState;
  busy: boolean;
}

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
        primaryLabel={busy ? "Anlegen …" : "Person speichern"}
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

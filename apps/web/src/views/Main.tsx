import type { Household, Person } from "@fep/shared";
import { PersonSwitcher } from "../components/PersonSwitcher.js";

interface Props {
  household: Household;
  current: Person | null;
  onSelectPerson: (person: Person) => void;
}

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function todayIndex(): number {
  const jsDay = new Date().getDay(); // 0 = Sonntag
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Hauptbildschirm (prd.md > Screens and Layout): Kopfzeile mit Haushaltsname,
 * Profil-Umschalter, Wochenstreifen und Next-Meal-Bereich. Plan, Liste und
 * Angebots-Indikator kommen mit den kommenden Slices.
 */
export function Main({ household, current, onSelectPerson }: Props) {
  const today = todayIndex();

  return (
    <div className="main">
      <header className="topbar">
        <div className="household-name">{household.name}</div>
        <div className="offers-note" title="Kommt mit der Angebots-Basis">
          Noch keine Angebotsbasis geladen
        </div>
      </header>

      <PersonSwitcher persons={household.persons} current={current} onSelect={onSelectPerson} />

      <section className="next-meal empty">
        <b>Noch kein Wochenplan.</b>
        <span>Plane die erste Woche, um zu sehen, was als Nächstes auf den Tisch kommt.</span>
      </section>

      <section className="week-strip" aria-label="Wochenplan">
        {DAYS.map((day, i) => (
          <div key={day} className={`day-card ${i === today ? "today" : ""}`}>
            <div className="day-name">{day}</div>
            <div className="day-meals" />
          </div>
        ))}
      </section>
    </div>
  );
}

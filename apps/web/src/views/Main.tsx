import type { Household, OffersSummary, Person } from "@fep/shared";
import { PersonSwitcher } from "../components/PersonSwitcher.js";

interface Props {
  household: Household;
  offers: OffersSummary | null;
  current: Person | null;
  onSelectPerson: (person: Person) => void;
}

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function todayIndex(): number {
  const jsDay = new Date().getDay(); // 0 = Sonntag
  return jsDay === 0 ? 6 : jsDay - 1;
}

const STORE_LABEL: Record<OffersSummary["store"], string> = {
  penny: "Penny",
  "aldi-sued": "Aldi Süd",
  lidl: "Lidl",
};

/**
 * Ehrliche Angebots-Lage (prd.md > Angebots-Basis): mit Snapshot zählt die
 * Kopfzeile die echte Basis; ohne Snapshot wird das offen gesagt — nie still
 * fingiert.
 */
function OffersNote({ offers }: { offers: OffersSummary | null }) {
  if (!offers) {
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
  }).format(new Date(offers.fetchedAt));
  return (
    <div className="offers-note" title={`Quelle: ${STORE_LABEL[offers.store]}-Angebots-API`}>
      {offers.count} aktuelle {STORE_LABEL[offers.store]}-Angebote (Stand {date})
    </div>
  );
}

/**
 * Hauptbildschirm (prd.md > Screens and Layout): Kopfzeile mit Haushaltsname,
 * Profil-Umschalter, Wochenstreifen und Next-Meal-Bereich. Plan und Liste
 * kommen mit den kommenden Slices.
 */
export function Main({ household, offers, current, onSelectPerson }: Props) {
  const today = todayIndex();

  return (
    <div className="main">
      <header className="topbar">
        <div className="household-name">{household.name}</div>
        <OffersNote offers={offers} />
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

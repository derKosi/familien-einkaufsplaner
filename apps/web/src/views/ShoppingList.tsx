import type { AppState } from "@fep/shared";

interface Props {
  state: AppState;
  onBack: () => void;
  onToggleChecked: (itemId: string, checked: boolean) => void;
}

/** Reihenfolge wie im Ladenlauf (spec.md > aggregation.ts). */
const DEPARTMENT_ORDER = [
  "Obst & Gemüse",
  "Fleisch & Wurst",
  "Kühlregal",
  "Grundnahrung",
  "Getränke",
  "Süßwaren",
  "Tiefkühl",
  "Drogerie & Haushalt",
  "Aktionen",
];

const cents = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

/**
 * Einkaufsliste (prd.md > Einkaufsliste): Bedarf × Menge × Preis, nach
 * Ladenabteilungen gruppiert, Abhak mit Fortschritt. Checkpoint-Anforderungen
 * sichtbar: Kaufgebinde vs. Bedarf, Reste-Ausweis und Rezept-Nachrücker.
 */
export function ShoppingList({ state, onBack, onToggleChecked }: Props) {
  const list = state.shoppingList;
  const checkedCount = list.filter((l) => l.checked).length;
  const total = list.reduce((sum, l) => sum + l.priceCents, 0);
  // Laufende Summen (Checkpoint-Fix): Korb zählt mit, Rest bleibt sichtbar.
  const checkedTotal = list.filter((l) => l.checked).reduce((s, l) => s + l.priceCents, 0);
  const restTotal = total - checkedTotal;
  const savings = list.reduce((s, l) => s + Math.max(0, l.basePriceCents - l.priceCents), 0);
  const stockTotal = list.filter((l) => !l.perishable).reduce((s, l) => s + l.priceCents, 0);
  const groups = DEPARTMENT_ORDER.map((dept) => ({
    dept,
    rows: list.filter((l) => l.department === dept),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="main">
    <section className="shopping-list" aria-label="Einkaufsliste">
      <button className="link-btn" onClick={onBack}>← Zurück zur Woche</button>
      <h2>Einkaufsliste</h2>

      <div className="list-progress">
        <progress value={checkedCount} max={list.length || 1} aria-label="Einkaufs-Fortschritt" />
        <span>
          {checkedCount} von {list.length} im Korb · Korb {cents(checkedTotal)} · Rest {cents(restTotal)}
          {stockTotal > 0 && <> · davon {cents(stockTotal)} haltbarer Vorrat</>}
          {savings > 0 && <> · <b className="savings">~{cents(savings)} gespart</b></>}
        </span>
      </div>

      {list.length === 0 && (
        <p className="lead">Noch keine Liste — plane erst eine Woche.</p>
      )}

      {groups.map(({ dept, rows }) => (
        <div key={dept} className="list-group">
          <h3>{dept}</h3>
          {rows.map((row) => (
            <label key={row.id} className={`list-row ${row.checked ? "row-checked" : ""}`}>
              <input
                type="checkbox"
                checked={row.checked}
                onChange={(e) => onToggleChecked(row.id, e.target.checked)}
              />
              <span className="list-main">
                <b>{row.product}</b>
                {/* Kaufmenge prominent (Generalprobe: „wie viele Packungen" muss
                    auf dem Handy ohne Kleingedrucktes lesbar sein). */}
                <b className="list-buy">Kaufen: {row.purchase}</b>
                <span className="list-amounts">
                  bedarf {row.needed}
                  {row.leftover && (
                    <i className={row.leftoverIsStock ? "leftover stock" : "leftover perish"}>
                      {" "}· {row.leftover}{row.leftoverIsStock ? " (Vorrat)" : ""}
                    </i>
                  )}
                </span>
                {row.offer && row.offerProduct && (
                  <span className="offer-badge">Angebot: {row.offerProduct}</span>
                )}
                {row.leftoverUses.map((u) => (
                  <span key={u.recipeId} className="leftover-use">
                    ↳ Rest für {u.title} ({u.uses})
                  </span>
                ))}
              </span>
              <span className="list-price">{cents(row.priceCents)}</span>
            </label>
          ))}
        </div>
      ))}
    </section>
    </div>
  );
}

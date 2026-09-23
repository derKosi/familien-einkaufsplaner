interface Props {
  onDemo: () => void;
  busy: boolean;
}

/**
 * Erststart: der Zwei-Wege-Einstieg (prd.md > The Core Journey, Schritt 1).
 * Der eigene-Haushalt-Pfad kommt mit dem Onboarding-Slice; bis dahin zeigt dieser
 * Screen nur den Weg, der wirklich funktioniert.
 */
export function FirstStart({ onDemo, busy }: Props) {
  return (
    <div className="first-start">
      <span className="chip">Familien-Einkaufsplaner</span>
      <h1>Ein Haushalt, ein Plan, ein Einkauf.</h1>
      <p className="lead">
        Aus den echten Wochenangeboten eines Discounters wird ein Essensplan für den
        ganzen Haushalt — mit Einkaufsliste inklusive Mengen für einen einzigen Einkauf.
      </p>
      <button className="primary" onClick={onDemo} disabled={busy}>
        {busy ? "Haushalt wird angelegt …" : "Mit Demo-Familie testen"}
      </button>
      <p className="hint">
        Familie Expedition 33: Lune und Verso, Gustav (33, milchfrei), Maelle (16, vegetarisch).
      </p>
    </div>
  );
}

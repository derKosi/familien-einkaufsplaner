interface Props {
  onDemo: () => void;
  onOwn: () => void;
  busy: boolean;
}

/**
 * Erststart: der Zwei-Wege-Einstieg (prd.md > The Core Journey, Schritt 1) —
 * Demo-Familie oder eigener Haushalt mit Person-für-Person-Onboarding (Slice 7).
 */
export function FirstStart({ onDemo, onOwn, busy }: Props) {
  return (
    <div className="first-start">
      <span className="chip">Familien-Einkaufsplaner</span>
      <h1>Ein Haushalt, ein Plan, ein Einkauf.</h1>
      <p className="lead">
        Aus den echten Wochenangeboten eines Discounters wird ein Essensplan für den
        ganzen Haushalt — mit Einkaufsliste inklusive Mengen für einen einzigen Einkauf.
      </p>
      <button className="primary" onClick={onOwn}>
        Eigenen Haushalt anlegen
      </button>
      <button className="ghost-btn" onClick={onDemo} disabled={busy}>
        {busy ? "Haushalt wird angelegt …" : "Mit Demo-Familie testen"}
      </button>
      <p className="hint">
        Familie Expedition 33: Lune und Verso, Gustav (33, milchfrei), Maelle (16, vegetarisch).
      </p>
    </div>
  );
}

import type { Person } from "@fep/shared";

const COLOR_PAIRS = ["salbei", "aprikot", "lavendel", "himmel"] as const;

interface Props {
  persons: Person[];
  current: Person | null;
  onSelect: (person: Person) => void;
}

/**
 * Profil-Umschalter: reiner Ansichtswechsel ohne Login (prd.md > Identität).
 * Die gewählte Person färbt die ganze Ansicht (data-person aufs Wurzel-Element).
 */
export function PersonSwitcher({ persons, current, onSelect }: Props) {
  return (
    <div className="person-switcher" role="tablist" aria-label="Wer schaut gerade">
      {persons.map((p) => (
        <button
          key={p.id}
          role="tab"
          aria-selected={current?.id === p.id}
          className={`person-chip ${current?.id === p.id ? "active" : ""} pair-${p.colorPair}`}
          onClick={() => onSelect(p)}
        >
          {p.name}
          {!p.complete && <span className="incomplete" title="Profil unvollständig"> · unvollständig</span>}
        </button>
      ))}
    </div>
  );
}

export function isColorPair(value: string): value is (typeof COLOR_PAIRS)[number] {
  return (COLOR_PAIRS as readonly string[]).includes(value);
}

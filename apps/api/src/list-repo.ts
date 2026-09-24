import { db } from "./db/sqlite.js";

/** Abhak-Status der Liste — Schlüssel ist der Zutaten-Schlüssel. */

export function checkedItems(): Set<string> {
  const rows = db.prepare("SELECT item FROM list_item WHERE checked = 1").all() as Array<{ item: string }>;
  return new Set(rows.map((r) => r.item));
}

export function setChecked(item: string, checked: boolean): void {
  db.prepare(
    `INSERT INTO list_item (item, checked) VALUES (?, ?)
     ON CONFLICT(item) DO UPDATE SET checked = excluded.checked`,
  ).run(item, checked ? 1 : 0);
}

/** Regenerieren leert die Liste (neue Woche, neuer Haken-Stand). */
export function clearChecked(): void {
  db.exec("DELETE FROM list_item");
}

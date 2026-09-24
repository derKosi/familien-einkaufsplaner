import { db } from "./sqlite.js";

export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS household (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS person (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL REFERENCES household(id),
      name TEXT NOT NULL,
      role_class TEXT NOT NULL,
      color_pair TEXT NOT NULL,
      constraints TEXT NOT NULL DEFAULT '[]',
      calorie_goal INTEGER,
      activity_profile TEXT,
      complete INTEGER NOT NULL DEFAULT 1
    );

    -- Genau ein aktueller Wochenplan (Regenerieren ersetzt ihn — spec.md > Core Journey 6).
    CREATE TABLE IF NOT EXISTS week_plan (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      week_of TEXT NOT NULL,
      store TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Abhak der Liste: Schlüssel ist der Zutaten-Schlüssel; Regenerieren leert die Tabelle.
    CREATE TABLE IF NOT EXISTS list_item (
      item TEXT PRIMARY KEY,
      checked INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Bestehende Datenbanken auf neue Spalten heben (CREATE IF NOT EXISTS reicht dafür nicht).
  const personCols = (db.prepare("PRAGMA table_info(person)").all() as Array<{ name: string }>).map(
    (c) => c.name,
  );
  if (!personCols.includes("allergies")) {
    db.exec("ALTER TABLE person ADD COLUMN allergies TEXT NOT NULL DEFAULT '[]'");
  }
}

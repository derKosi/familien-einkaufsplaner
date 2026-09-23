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
  `);
}

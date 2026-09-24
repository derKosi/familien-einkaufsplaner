import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { dataDir } from "../paths.js";

// node:sqlite statt better-sqlite3: eingebautes SQLite, keine native Kompilierung
// (Revision im Build-Checklist; SQLite selbst bleibt SQLite).
export const db = new DatabaseSync(join(dataDir, "app.db"));
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

export { dataDir };

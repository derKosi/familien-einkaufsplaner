import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
/** data/ liegt per Docker-Bind-Mount außerhalb; im Dev-Setup: Repo-Root (apps/api/src/db → 4× hoch). */
export const dataDir = process.env.FEP_DATA_DIR ?? join(here, "..", "..", "..", "..", "data");

mkdirSync(dataDir, { recursive: true });

// node:sqlite statt better-sqlite3: eingebautes SQLite, keine native Kompilierung
// (Revision im Build-Checklist; SQLite selbst bleibt SQLite).
export const db = new DatabaseSync(join(dataDir, "app.db"));
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

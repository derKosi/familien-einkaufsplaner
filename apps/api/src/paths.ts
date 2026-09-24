import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
/** data/ liegt per Docker-Bind-Mount außerhalb; im Dev-Setup: Repo-Root (apps/api/src → 3× hoch). */
export const dataDir = process.env.FEP_DATA_DIR ?? join(here, "..", "..", "..", "data");

mkdirSync(dataDir, { recursive: true });

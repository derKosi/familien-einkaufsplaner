import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  LatestOffersResponse,
  OffersSnapshot,
  OffersSummary,
  type OffersSummary as OffersSummaryType,
} from "@fep/shared";
import { dataDir } from "../db/sqlite.js";

/**
 * Die Angebotsnaht (spec.md > offers/store.ts): Snapshots liegen als datierte
 * JSON-Dateien in data/offers/ (date-stamp im Dateinamen, fetchedAt/source im File).
 * Der Erzeuger ist das Build-Zeit-Skript `pnpm offers:fetch` (Penny-Angebots-API);
 * hier läuft nur das Lesen — kein Netzwerkzugriff zur Laufzeit.
 */

const offersDir = join(dataDir, "offers");

let cache: { file: string; snapshot: OffersSnapshot } | null = null;

/** Snapshot-Dateien, neuester Dateiname zuerst (ISO-Datum im Namen sortiert lexikalisch). */
function snapshotFiles(): string[] {
  let entries: string[];
  try {
    entries = readdirSync(offersDir);
  } catch {
    return [];
  }
  return entries
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => b.localeCompare(a));
}

function loadFile(file: string): OffersSnapshot | null {
  try {
    const raw = JSON.parse(readFileSync(join(offersDir, file), "utf8"));
    return OffersSnapshot.parse(raw);
  } catch (e) {
    // Kaputter Snapshot soll die App nicht crashen — er wird übersprungen und geloggt.
    console.warn(`[offers] Snapshot ${file} unbrauchbar: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

/** Neuester gültiger Snapshot oder null — null ist die ehrliche „keine Daten“-Lage. */
export function latestOfferSnapshot(): OffersSnapshot | null {
  const files = snapshotFiles();
  if (cache && files[0] === cache.file) return cache.snapshot;

  for (const file of files) {
    const snapshot = loadFile(file);
    if (snapshot) {
      cache = { file, snapshot };
      return snapshot;
    }
  }
  cache = null;
  return null;
}

export function offersSummary(): OffersSummaryType | null {
  const s = latestOfferSnapshot();
  if (!s) return null;
  return OffersSummary.parse({
    store: s.store,
    fetchedAt: s.fetchedAt,
    count: s.offers.length,
  });
}

/** Cache verwerfen und erneut scannen — z. B. nach einem frischen Fetch-Skript-Lauf. */
export function refreshOffers(): OffersSummaryType | null {
  cache = null;
  return offersSummary();
}

export function latestOffersResponse() {
  return LatestOffersResponse.parse({ snapshot: latestOfferSnapshot() });
}

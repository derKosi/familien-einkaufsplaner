/**
 * Build-Zeit-Abzug der echten Penny-Angebote (spec.md > offers/store.ts):
 * Holt die laufende Woche aus der Penny-Angebots-API (REST/JSON, dieselbe Quelle
 * der penny.de-Angebotsseiten) und schreibt einen zod-validierten Snapshot nach
 * data/offers/. Läuft im Build/per Hand — nie zur App-Laufzeit.
 *
 *   pnpm offers:fetch                        # alle Standard-Kategorien, aktuelle Woche
 *   pnpm offers:fetch --week 2026-40         # bestimmte Kalenderwoche
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OffersSnapshot, type Department, type Offer, type Store } from "@fep/shared";
import { dataDir } from "../src/paths.js";

const API_BASE = "https://www.penny.de/.rest/offers/by-category";
const SOURCE = "https://www.penny.de/.rest/offers/by-category (Penny Angebots-API, Kategorie-Abzug)";
const STORE: Store = "penny";

const DEFAULT_CATEGORIES = [
  "top-angebote",
  "obst-und-gemuese",
  "fleisch-und-wurst",
  "kuehlregal",
  "getraenke",
  "suessigkeiten-und-snacks",
  "kochen-und-backen",
  "naturgut",
] as const;

/** Penny-Kategorie → Ladenabteilung (spec.md > Data Model > Offer.department). */
const CATEGORY_DEPARTMENT: Record<string, Department> = {
  "top-angebote": "Aktionen",
  "food-highlights-fuer-alle": "Aktionen",
  "weitere-angebote": "Aktionen",
  "sparen-auf-top-marken": "Aktionen",
  "obst-und-gemuese": "Obst & Gemüse",
  naturgut: "Obst & Gemüse",
  "fleisch-und-wurst": "Fleisch & Wurst",
  kuehlregal: "Kühlregal",
  berida: "Kühlregal",
  getraenke: "Getränke",
  "suessigkeiten-und-snacks": "Süßwaren",
  douceur: "Süßwaren",
  "kochen-und-backen": "Grundnahrung",
  "drogerie-und-haushalt": "Drogerie & Haushalt",
  "haushalt-und-wohnen": "Drogerie & Haushalt",
};

function departmentFor(category: string): Department {
  return CATEGORY_DEPARTMENT[category] ?? "Aktionen";
}

/** ISO-Kalenderwoche (Penny adressiert Wochen als „2026-39"). */
function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

function toCents(v: unknown): number | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const n = Number.parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

interface PennyTile {
  title?: string;
  quantity?: string | null;
  price?: string | null;
  listPrice?: string | null;
  productData?: string | null;
}

function toOffer(tile: PennyTile, fallbackCategory: string): Offer | null {
  let product = tile.title?.trim();
  let id: string | undefined;
  let category = fallbackCategory;
  if (tile.productData) {
    try {
      const pd = JSON.parse(tile.productData) as {
        id?: string;
        name?: string;
        category?: string;
      };
      id = pd.id;
      if (pd.category) category = pd.category;
      if (!product && pd.name) product = pd.name;
    } catch {
      // productData ist Beleg-Detail — ohne es fällt der Tile-Titel in den Snapshot.
    }
  }
  const priceCents = toCents(tile.price);
  if (!product || !id || priceCents === null) return null;

  return {
    id,
    store: STORE,
    product,
    amount: tile.quantity ?? null,
    priceCents,
    listPriceCents: toCents(tile.listPrice),
    department: departmentFor(category),
  };
}

async function fetchCategory(week: string, category: string): Promise<PennyTile[]> {
  const res = await fetch(`${API_BASE}/${week}/${category}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${category}: HTTP ${res.status}`);
  const body = (await res.json()) as { offerTiles?: PennyTile[] };
  return body.offerTiles ?? [];
}

const weekArgIdx = process.argv.indexOf("--week");
const week = weekArgIdx !== -1 ? process.argv[weekArgIdx + 1] : isoWeek(new Date());

const byId = new Map<string, Offer>();
for (const category of DEFAULT_CATEGORIES) {
  const tiles = await fetchCategory(week, category);
  let kept = 0;
  for (const tile of tiles) {
    const offer = toOffer(tile, category);
    if (offer && !byId.has(offer.id)) {
      byId.set(offer.id, offer);
      kept++;
    }
  }
  console.log(`  ${category}: ${tiles.length} Tiles, ${kept} neu`);
}

const offers = [...byId.values()];
const snapshot = OffersSnapshot.parse({
  store: STORE,
  week,
  fetchedAt: new Date().toISOString(),
  source: SOURCE,
  offers,
});

const offersDir = join(dataDir, "offers");
mkdirSync(offersDir, { recursive: true });
const file = join(offersDir, `${new Date().toISOString().slice(0, 10)}_penny.json`);
writeFileSync(file, JSON.stringify(snapshot, null, 2) + "\n");

console.log(`\n${offers.length} echte Angebote → ${file}`);

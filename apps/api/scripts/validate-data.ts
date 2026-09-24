/**
 * Mechanische Prüfung der Datenbasis (checklist.md Slice 3):
 * Snapshots, Rezept-Pool und Nährwert-Tabelle gegen die zod-Schemata,
 * plus Querverweise (Rezept-Zutaten ↔ Nährwert-Tabelle, Departments).
 *
 *   pnpm offers:validate
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Department,
  NutritionTable,
  OffersSnapshot,
  RecipesFile,
} from "@fep/shared";
import { dataDir } from "../src/paths.js";

let failures = 0;
function check(ok: boolean, message: string) {
  if (ok) return;
  failures++;
  console.error(`  ✗ ${message}`);
}

// ─── Angebote ───
const offersDir = join(dataDir, "offers");
let snapshotFiles: string[] = [];
try {
  snapshotFiles = readdirSync(offersDir).filter((f) => f.endsWith(".json"));
} catch {
  /* noch kein Verzeichnis */
}

console.log(`Angebots-Snapshots: ${snapshotFiles.length} Datei(en)`);
let newestCount = 0;
for (const file of snapshotFiles) {
  const raw = JSON.parse(readFileSync(join(offersDir, file), "utf8"));
  const result = OffersSnapshot.safeParse(raw);
  check(result.success, `${file} verletzt das Snapshot-Schema: ${result.error?.message}`);
  if (result.success) {
    newestCount = Math.max(newestCount, result.data.offers.length);
    console.log(`  ✓ ${file}: ${result.data.offers.length} Angebote, Stand ${result.data.fetchedAt}`);
    const departments = new Set(result.data.offers.map((o) => o.department));
    check(departments.size > 1, `${file}: alle Angebote in einer Abteilung — Mapping prüfen`);
  }
}
check(snapshotFiles.length > 0, "kein Angebots-Snapshot vorhanden (pnpm offers:fetch)");

// ─── Rezepte ───
console.log("\nRezept-Pool:");
const recipesRaw = JSON.parse(readFileSync(join(dataDir, "recipes.json"), "utf8"));
const recipes = RecipesFile.parse(recipesRaw);
const nutritionRaw = JSON.parse(readFileSync(join(dataDir, "nutrition.json"), "utf8"));
const nutrition = NutritionTable.parse(nutritionRaw);

console.log(`  ✓ ${recipes.recipes.length} Rezepte (Ziel: ~24)`);
check(recipes.recipes.length >= 20, `zu wenige Rezepte: ${recipes.recipes.length}`);

const ids = new Set<string>();
for (const r of recipes.recipes) {
  check(!ids.has(r.id), `Doppelte Rezept-ID: ${r.id}`);
  ids.add(r.id);
  // Leere Tag-Liste ist gültig: ein Gericht ohne einschränkungsrelevante Eigenschaft.
}
const vegetarisch = recipes.recipes.filter((r) => r.tags.includes("vegetarisch")).length;
const milchfrei = recipes.recipes.filter((r) => r.tags.includes("milchfrei")).length;
const schnell = recipes.recipes.filter((r) => r.tags.includes("schnell")).length;
console.log(`  ✓ Tags: ${vegetarisch} vegetarisch, ${milchfrei} milchfrei, ${schnell} schnell`);
check(vegetarisch >= 6, "zu wenige vegetarische Rezepte (Demo-Constraint Maelle)");
check(milchfrei >= 6, "zu wenige milchfreie Rezepte (Demo-Constraint Gustav)");

// ─── Nährwerte ───
console.log(`\nNährwert-Tabelle: ${Object.keys(nutrition).length} Zutaten`);
for (const r of recipes.recipes) {
  for (const ing of r.ingredients) {
    check(nutrition[ing.item] !== undefined, `${r.id}: Zutat „${ing.item}“ fehlt in nutrition.json`);
    check(
      Department.safeParse(ing.department).success,
      `${r.id}: unbekannte Abteilung „${ing.department}“`,
    );
  }
}

if (failures > 0) {
  console.error(`\n${failures} Prüfpunkt(e) fehlgeschlagen.`);
  process.exit(1);
}
console.log("\nDatenbasis vollständig und schema-valide.");

import { randomUUID } from "node:crypto";
import { AppState, Household, HouseholdSettings, Person, type HouseholdSettings as HouseholdSettingsT } from "@fep/shared";
import { db } from "./db/sqlite.js";
import { DEMO_HOUSEHOLD_NAME, demoPersons } from "./demo-seed.js";
import { offersSummary } from "./offers/store.js";
import { loadWeekPlan } from "./plan-repo.js";
import { loadRecipes, recipesSummary } from "./domain/recipes.js";
import { computeNextMeal, countPreparedMeals } from "./domain/weeklogic.js";
import { buildShoppingList, recipeCostPerPortion, recipeKcalPerPortion } from "./domain/aggregation.js";
import { checkedItems } from "./list-repo.js";
import { listEvents } from "./event-repo.js";

interface PersonRow {
  id: string;
  household_id: string;
  name: string;
  role_class: string;
  color_pair: string;
  constraints: string;
  allergies: string | null;
  calorie_goal: number | null;
  activity_profile: string | null;
  complete: number;
}

function rowToPerson(row: PersonRow): Person {
  return Person.parse({
    id: row.id,
    name: row.name,
    roleClass: row.role_class,
    colorPair: row.color_pair,
    constraints: JSON.parse(row.constraints),
    allergies: row.allergies ? JSON.parse(row.allergies) : [],
    calorieGoal: row.calorie_goal,
    activityProfile: row.activity_profile,
    complete: row.complete === 1,
  });
}

/** Alle Personen des (einzigen) Haushalts — Kontext-Baustein für den Planner. */
export function loadPersons(): Person[] {
  const row = db.prepare("SELECT id FROM household LIMIT 1").get() as { id: string } | undefined;
  if (!row) return [];
  const rows = db.prepare("SELECT * FROM person WHERE household_id = ? ORDER BY rowid").all(row.id) as unknown as PersonRow[];
  return rows.map(rowToPerson);
}

/** Einstellungen des Haushalts — Kontext für Planner und Vorschläge. */
export function loadSettings(): HouseholdSettingsT {
  const row = db.prepare("SELECT settings FROM household LIMIT 1").get() as
    | { settings: string | null }
    | undefined;
  return row ? rowToSettings(row) : HouseholdSettings.parse({});
}

function rowToSettings(row: { settings: string | null }): HouseholdSettingsT {
  return HouseholdSettings.parse(row.settings ? JSON.parse(row.settings) : {});
}

/** Ein fester Haushalt im PoC — die erste (einzige) Zeile gilt. */
export function getState(): AppState {
  const offers = offersSummary();
  const events = listEvents();
  // Rezept-Projektion mit „etwa“-Portionspreis und kcal (Checkpoint-Wunsch).
  const recipes = recipesSummary().map((r) => ({
    ...r,
    portionPriceCents: recipeCostPerPortion(r.id),
    kcalPerPortion: recipeKcalPerPortion(r.id),
  }));
  const weekPlan = loadWeekPlan();

  const planView = weekPlan
    ? {
        nextMeal: computeNextMeal(weekPlan, (id) => loadRecipes().find((r) => r.id === id)?.title, new Date()),
        mealsPrepared: countPreparedMeals(weekPlan, new Date()),
        mealsTotal: weekPlan.days
          .filter((d) => !weekPlan.exemptDays.includes(d.day))
          .reduce((n, d) => n + d.meals.length, 0),
      }
    : { nextMeal: null, mealsPrepared: 0, mealsTotal: 0 };

  // Liste: deterministisch neu gerechnet, Abhak aus der Persistenz darübergelegt.
  const checks = checkedItems();
  const listView = weekPlan
    ? (() => {
        const { list, personCalories } = buildShoppingList(weekPlan, new Date(), events);
        return {
          shoppingList: list.map((row) => ({ ...row, checked: checks.has(row.id) })),
          personCalories,
        };
      })()
    : { shoppingList: [], personCalories: [] };

  const householdRow = db.prepare("SELECT id, name, settings FROM household LIMIT 1").get() as
    | { id: string; name: string }
    | undefined;
  if (!householdRow) {
    return AppState.parse({ household: null, offers, recipes, events, ...planView, ...listView });
  }

  const personRows = db
    .prepare("SELECT * FROM person WHERE household_id = ? ORDER BY rowid")
    .all(householdRow.id) as unknown as PersonRow[];

  return AppState.parse({
    household: Household.parse({
      id: householdRow.id,
      name: householdRow.name,
      persons: personRows.map(rowToPerson),
      settings: rowToSettings(householdRow as unknown as { settings: string | null }),
    }),
    offers,
    recipes,
    weekPlan,
    events,
    ...planView,
    ...listView,
  });
}

/** Zwei-Wege-Erststart, Demo-Pfad: seedet Expedition 33, falls noch kein Haushalt existiert. */
export function seedDemoHousehold(): AppState {
  if (getState().household) return getState();

  const id = randomUUID();
  db.prepare("INSERT INTO household (id, name) VALUES (?, ?)").run(id, DEMO_HOUSEHOLD_NAME);

  const insert = db.prepare(`
    INSERT INTO person (id, household_id, name, role_class, color_pair, constraints, calorie_goal, activity_profile, complete)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // node:sqlite hat kein transaction()-Helferlein (better-sqlite3-API) — explizites BEGIN/COMMIT.
  db.exec("BEGIN");
  try {
    for (const p of demoPersons()) {
      insert.run(
        p.id, id, p.name, p.roleClass, p.colorPair,
        JSON.stringify(p.constraints), p.calorieGoal, p.activityProfile, p.complete ? 1 : 0,
      );
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  return getState();
}

/** Zwei-Wege-Erststart, eigener Haushalt: leer anlegen, Personen folgen einzeln. */
export function createHousehold(name: string): AppState {
  if (getState().household) throw new Error("Haushalt existiert bereits.");
  const id = randomUUID();
  db.prepare("INSERT INTO household (id, name, settings) VALUES (?, ?, NULL)").run(id, name);
  return getState();
}

/** Person-für-Person-Onboarding: komplette oder bewusst unvollständige Personen. */
export function addPerson(person: Person): AppState {
  const householdRow = db.prepare("SELECT id FROM household LIMIT 1").get() as { id: string } | undefined;
  if (!householdRow) throw new Error("Kein Haushalt vorhanden.");
  db.prepare(`
    INSERT INTO person (id, household_id, name, role_class, color_pair, constraints, allergies, calorie_goal, activity_profile, complete)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    person.id, householdRow.id, person.name, person.roleClass, person.colorPair,
    JSON.stringify(person.constraints), JSON.stringify(person.allergies),
    person.calorieGoal, person.activityProfile, person.complete ? 1 : 0,
  );
  return getState();
}

export function updatePerson(id: string, person: Person): AppState {
  db.prepare(`
    UPDATE person SET name = ?, role_class = ?, color_pair = ?, constraints = ?, allergies = ?,
      calorie_goal = ?, activity_profile = ?, complete = ?
    WHERE id = ?
  `).run(
    person.name, person.roleClass, person.colorPair,
    JSON.stringify(person.constraints), JSON.stringify(person.allergies),
    person.calorieGoal, person.activityProfile, person.complete ? 1 : 0, id,
  );
  return getState();
}

/** Einstellungen (Slice 7): Budget, Geräte, Koch-Level, Tage, Wochenmuster. */
export function updateSettings(patch: Partial<HouseholdSettingsT>): AppState {
  const householdRow = db.prepare("SELECT settings FROM household LIMIT 1").get() as
    | { settings: string | null }
    | undefined;
  if (!householdRow) throw new Error("Kein Haushalt vorhanden.");
  const merged = HouseholdSettings.parse({ ...rowToSettings(householdRow), ...patch });
  db.prepare("UPDATE household SET settings = ? WHERE id = (SELECT id FROM household LIMIT 1)").run(
    JSON.stringify(merged),
  );
  return getState();
}

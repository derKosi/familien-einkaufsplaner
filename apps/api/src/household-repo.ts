import { randomUUID } from "node:crypto";
import { AppState, Household, Person } from "@fep/shared";
import { db } from "./db/sqlite.js";
import { DEMO_HOUSEHOLD_NAME, demoPersons } from "./demo-seed.js";
import { offersSummary } from "./offers/store.js";

interface PersonRow {
  id: string;
  household_id: string;
  name: string;
  role_class: string;
  color_pair: string;
  constraints: string;
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
    calorieGoal: row.calorie_goal,
    activityProfile: row.activity_profile,
    complete: row.complete === 1,
  });
}

/** Ein fester Haushalt im PoC — die erste (einzige) Zeile gilt. */
export function getState(): AppState {
  const offers = offersSummary();
  const householdRow = db.prepare("SELECT id, name FROM household LIMIT 1").get() as
    | { id: string; name: string }
    | undefined;
  if (!householdRow) return AppState.parse({ household: null, offers });

  const personRows = db
    .prepare("SELECT * FROM person WHERE household_id = ? ORDER BY rowid")
    .all(householdRow.id) as unknown as PersonRow[];

  return AppState.parse({
    household: Household.parse({
      id: householdRow.id,
      name: householdRow.name,
      persons: personRows.map(rowToPerson),
    }),
    offers,
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

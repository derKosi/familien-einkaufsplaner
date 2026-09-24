import { WeekPlan, type WeekPlan as WeekPlanT } from "@fep/shared";
import { db } from "./db/sqlite.js";

/** Persistenz des Wochenplans — genau eine Zeile, Regenerieren ersetzt sie. */

export function loadWeekPlan(): WeekPlanT | null {
  const row = db.prepare("SELECT payload FROM week_plan WHERE id = 1").get() as
    | { payload: string }
    | undefined;
  if (!row) return null;
  return WeekPlan.parse(JSON.parse(row.payload));
}

export function saveWeekPlan(plan: WeekPlanT): void {
  db.prepare(
    `INSERT INTO week_plan (id, week_of, store, payload, created_at)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET week_of = excluded.week_of, store = excluded.store,
       payload = excluded.payload, created_at = excluded.created_at`,
  ).run(plan.weekOf, plan.store, JSON.stringify(plan), new Date().toISOString());
}

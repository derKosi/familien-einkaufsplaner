import { randomUUID } from "node:crypto";
import { Event, type Event as EventT } from "@fep/shared";
import { db } from "./db/sqlite.js";

/** Persistenz der Events (spec.md > Persistenz > event). */

export function listEvents(): EventT[] {
  const rows = db.prepare("SELECT payload FROM event ORDER BY rowid").all() as Array<{ payload: string }>;
  return rows.map((r) => Event.parse(JSON.parse(r.payload)));
}

export function addEvent(event: Omit<EventT, "id">): EventT {
  const withId = Event.parse({ ...event, id: randomUUID() });
  db.prepare("INSERT INTO event (id, payload) VALUES (?, ?)").run(withId.id, JSON.stringify(withId));
  return withId;
}

/** Regenerieren leert die Events — der neue Plan steht für sich. */
export function clearEvents(): void {
  db.exec("DELETE FROM event");
}

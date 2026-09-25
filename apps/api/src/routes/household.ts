import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ConstraintTag, HouseholdSettingsPatch, Person } from "@fep/shared";
import {
  addPerson,
  createHousehold,
  getState,
  updatePerson,
  updateSettings,
} from "../household-repo.js";

/**
 * Zwei-Wege-Erststart & Einstellungen (spec.md > Core Journey 1, prd.md >
 * Onboarding & Einstellungen): eigener Haushalt, Person-für-Person mit
 * Skip/Later, Einstellungen mit Wochenmuster, Budget, Geräten und Koch-Level.
 */

const PersonBody = z.object({
  name: z.string().min(1).max(60),
  roleClass: Person.shape.roleClass,
  colorPair: Person.shape.colorPair.optional(),
  constraints: z.array(ConstraintTag).default([]),
  allergies: z.array(ConstraintTag).default([]),
  calorieGoal: z.number().int().positive().nullable().default(null),
  activityProfile: z.string().max(300).nullable().default(null),
  /** Skip/Later: false = bewusst mit Lücken angelegt. */
  complete: z.boolean().default(true),
});

/** PATCH-Form — OHNE Defaults (sonst wischt jeder Teil-Patch Constraints weg, vgl. SettingsPatch). */
const PersonPatch = z.object({
  name: z.string().min(1).max(60).optional(),
  roleClass: Person.shape.roleClass.optional(),
  colorPair: Person.shape.colorPair.optional(),
  constraints: z.array(ConstraintTag).optional(),
  allergies: z.array(ConstraintTag).optional(),
  calorieGoal: z.number().int().positive().nullable().optional(),
  activityProfile: z.string().max(300).nullable().optional(),
  complete: z.boolean().optional(),
});

/** Skalierungsherz: wer ohne Farbe ankommt, bekommt den nächsten Pastell-Ton. */
const PALETTE = ["salbei", "aprikot", "lavendel", "himmel"] as const;

export async function registerHouseholdRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/household", async (request, reply) => {
    const body = z.object({ name: z.string().min(1).max(60) }).safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Bitte einen Haushaltsnamen angeben.", code: "bad_request" });
    }
    try {
      return createHousehold(body.data.name);
    } catch (e) {
      return reply.code(409).send({ error: (e as Error).message, code: "household_exists" });
    }
  });

  app.post("/api/persons", async (request, reply) => {
    const body = PersonBody.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Ungültige Personenangaben.", code: "bad_request" });
    }
    const persons = getState().household?.persons ?? [];
    const colorPair = body.data.colorPair ?? PALETTE[persons.length % PALETTE.length];
    const person = Person.parse({ id: randomUUID(), ...body.data, colorPair });
    return addPerson(person);
  });

  app.patch("/api/persons/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = PersonPatch.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Ungültige Personenangaben.", code: "bad_request" });
    }
    const existing = getState().household?.persons.find((p) => p.id === id);
    if (!existing) {
      return reply.code(404).send({ error: "Person unbekannt.", code: "no_person" });
    }
    const merged = Person.parse({ ...existing, ...body.data, id });
    return updatePerson(id, merged);
  });

  /** Einstellungen: Budget-Münzen, Geräte, Koch-Level, Einkaufs-/Kochtage, Wochenmuster.
   * HouseholdSettingsPatch statt HouseholdSettings.partial() — partial() injiziert
   * die Defaults der fehlenden Felder und hätte jeden Teil-Patch zum Reset gemacht. */
  app.patch("/api/settings", async (request, reply) => {
    const body = HouseholdSettingsPatch.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Ungültige Einstellungen.", code: "bad_request" });
    }
    try {
      return updateSettings(body.data);
    } catch (e) {
      return reply.code(409).send({ error: (e as Error).message, code: "no_household" });
    }
  });
}

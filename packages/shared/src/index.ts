import { z } from "zod";

/** Rollenklasse — die einzige Personenangabe, die später den Server Richtung LLM verlässt (Kontextvertrag). */
export const RoleClass = z.enum(["Erwachsener", "Jugendlicher", "Kind"]);
export type RoleClass = z.infer<typeof RoleClass>;

/** Bekannte Einschränkungs-Tags; erweiterbar, aber fest benannt für Planner und Filter. */
export const ConstraintTag = z.enum(["vegetarisch", "milchfrei", "vegan", "glutenfrei"]);
export type ConstraintTag = z.infer<typeof ConstraintTag>;

/** Pastell-Paar (Main + Akzent) — identifiziert die Person in der Ansicht. */
export const ColorPair = z.enum(["salbei", "aprikot", "lavendel", "himmel"]);
export type ColorPair = z.infer<typeof ColorPair>;

export const Person = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  roleClass: RoleClass,
  colorPair: ColorPair,
  constraints: z.array(ConstraintTag).default([]),
  /** Optionales Tages-Kalorienziel; der Plan rechnet es ein, die UI zeigt es dezent. */
  calorieGoal: z.number().int().positive().nullable().default(null),
  /** Freitext aus dem Onboarding (Beruf/Alltag) — verlässt den Server nie (PII-Filter). */
  activityProfile: z.string().nullable().default(null),
  /** Skip/Later: eine Person mit Lücken bleibt im Haushalt, wird markiert und später vervollständigt. */
  complete: z.boolean().default(true),
});
export type Person = z.infer<typeof Person>;

export const Household = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  persons: z.array(Person),
});
export type Household = z.infer<typeof Household>;

/** GET /api/state — der komplette Stand beim Öffnen der App. */
export const AppState = z.object({
  household: Household.nullable(),
});
export type AppState = z.infer<typeof AppState>;

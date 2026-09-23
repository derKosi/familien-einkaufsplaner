import { randomUUID } from "node:crypto";
import type { Person } from "@fep/shared";

/** Der Demo-Haushalt „Expedition 33“ — vorbefüllt laut PRD (prd.md > Haushalt & Personen). */
export const DEMO_HOUSEHOLD_NAME = "Familie Expedition 33";

export function demoPersons(): Person[] {
  return [
    {
      id: randomUUID(),
      name: "Lune",
      roleClass: "Erwachsener",
      colorPair: "salbei",
      constraints: [],
      calorieGoal: null,
      activityProfile: "Planung und Kochen, viel unterwegs",
      complete: true,
    },
    {
      id: randomUUID(),
      name: "Verso",
      roleClass: "Erwachsener",
      colorPair: "aprikot",
      constraints: [],
      calorieGoal: 2000,
      activityProfile: "Bürojob, eher wenig Bewegung — will abnehmen",
      complete: true,
    },
    {
      id: randomUUID(),
      name: "Gustav",
      roleClass: "Erwachsener",
      colorPair: "himmel",
      constraints: ["milchfrei"],
      calorieGoal: null,
      activityProfile: null,
      complete: true,
    },
    {
      id: randomUUID(),
      name: "Maelle",
      roleClass: "Jugendlicher",
      colorPair: "lavendel",
      constraints: ["vegetarisch"],
      calorieGoal: null,
      activityProfile: null,
      complete: true,
    },
  ];
}

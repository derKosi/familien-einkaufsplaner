import { ApiError, type AppState, type EventSuggestionsResponse, type HouseholdSettings, type Person, type RecipePricesResponse, type Store } from "@fep/shared";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  const body = await res.json();
  if (!res.ok) {
    const apiError = ApiError.safeParse(body);
    throw new Error(apiError.success ? apiError.data.error : `${path} antwortete ${res.status}`);
  }
  return body as T;
}

export function fetchState(): Promise<AppState> {
  return request<AppState>("/api/state");
}

export function seedDemoHousehold(): Promise<AppState> {
  return request<AppState>("/api/household/demo", { method: "POST" });
}

/** POST /api/plan/generate — der Kernel. allowNoOffers = ehrlicher Fallback (spec.md > Failure Modes). */
export function generatePlan(store: Store, allowNoOffers = false): Promise<AppState> {
  return request<AppState>("/api/plan/generate", {
    method: "POST",
    body: JSON.stringify({ store, allowNoOffers }),
  });
}

/** PATCH /api/plan/meal — Abhak beim Kochen (Checkpoint: „es kann ja was schief gehen"). */
export function setMealPrepared(day: number, slot: string, prepared: boolean): Promise<AppState> {
  return request<AppState>("/api/plan/meal", {
    method: "PATCH",
    body: JSON.stringify({ day, slot, prepared }),
  });
}

/** PATCH /api/shopping-list/:itemId — Abhak im Einkauf (spec.md > Core Journey 4). */
export function setListItemChecked(itemId: string, checked: boolean): Promise<AppState> {
  return request<AppState>(`/api/shopping-list/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify({ checked }),
  });
}

/** POST /api/plan/events — Grillabend & Co., skaliert Plan und Liste sofort. */
export function createEvent(day: number, personCount: number, dishHint: string | null): Promise<AppState> {
  return request<AppState>("/api/plan/events", {
    method: "POST",
    body: JSON.stringify({ day, personCount, dishHint }),
  });
}

/** POST /api/plan/exemptions — Tage aussetzen / wieder aufnehmen (setzt die Liste neu). */
export function setExemptDays(days: number[]): Promise<AppState> {
  return request<AppState>("/api/plan/exemptions", {
    method: "POST",
    body: JSON.stringify({ days }),
  });
}

/** GET /api/plan/event-suggestions — Angebote × Rezepte, mit Preis/kcal. */
export function fetchEventSuggestions(): Promise<EventSuggestionsResponse> {
  return request<EventSuggestionsResponse>("/api/plan/event-suggestions");
}

/** GET /api/recipes/:id/prices — aufklappbares Zutaten-Preis-Panel. */
export function fetchRecipePrices(recipeId: string, servings: number): Promise<RecipePricesResponse> {
  return request<RecipePricesResponse>(`/api/recipes/${encodeURIComponent(recipeId)}/prices?servings=${servings}`);
}

/** POST /api/household — eigener Haushalt (Zwei-Wege-Erststart). */
export function createHousehold(name: string): Promise<AppState> {
  return request<AppState>("/api/household", { method: "POST", body: JSON.stringify({ name }) });
}

/** POST /api/persons — Person-für-Person-Onboarding, complete=false erlaubt Skip/Later. */
export function addPerson(person: Omit<Person, "id">): Promise<AppState> {
  return request<AppState>("/api/persons", { method: "POST", body: JSON.stringify(person) });
}

/** PATCH /api/persons/:id — Person vervollständigen oder korrigieren. */
export function updatePerson(id: string, patch: Partial<Person>): Promise<AppState> {
  return request<AppState>(`/api/persons/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** PATCH /api/settings — Budget, Geräte, Koch-Level, Tage, Wochenmuster. */
export function saveSettings(patch: Partial<HouseholdSettings>): Promise<AppState> {
  return request<AppState>("/api/settings", { method: "PATCH", body: JSON.stringify(patch) });
}

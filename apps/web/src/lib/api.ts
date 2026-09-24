import { ApiError, type AppState, type Store } from "@fep/shared";

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

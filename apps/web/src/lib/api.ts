import type { AppState } from "@fep/shared";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`${path} antwortete ${res.status}`);
  }
  return (await res.json()) as T;
}

export function fetchState(): Promise<AppState> {
  return request<AppState>("/api/state");
}

export function seedDemoHousehold(): Promise<AppState> {
  return request<AppState>("/api/household/demo", { method: "POST" });
}

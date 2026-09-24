/**
 * Darstellung (spec.md > Look and Feel): Light/Dark/System über CSS-Custom-
 * Properties, große-Schrift-Option und „wenig Animation" — alles am Wurzel-
 * Element als data-Attribute, bewahrt im localStorage. „System" folgt
 * prefers-color-scheme live (matchMedia-Listener).
 */

export type ThemePref = "system" | "light" | "dark";
export type FontSizePref = "normal" | "large";
export type MotionPref = "system" | "reduced";

export interface Appearance {
  theme: ThemePref;
  fontsize: FontSizePref;
  motion: MotionPref;
}

const KEY = "fep.appearance";

const DEFAULTS: Appearance = { theme: "system", fontsize: "normal", motion: "system" };

export function loadAppearance(): Appearance {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAppearance(a: Appearance): void {
  localStorage.setItem(KEY, JSON.stringify(a));
}

function resolveTheme(pref: ThemePref): "light" | "dark" {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Wendet die aktuelle Einstellung aufs Wurzel-Element an (CSS-keyt auf data-*). */
export function applyAppearance(a: Appearance): void {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(a.theme);
  root.dataset.fontsize = a.fontsize;
  root.dataset.motion = a.motion;
}

/** Folgt dem System-Wechsel, solange „System" gewählt ist. */
export function watchSystemTheme(get: () => Appearance): void {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (get().theme === "system") applyAppearance(get());
  });
}

# Agent-Hinweise für dieses Repo (macOS 13, Darwin 22)

Diese Datei sammelt Umgebungswissen, das hier schon Schmerzen verursacht hat —
lies sie, bevor du Werkzeuge installierst oder Browserautomatisierung baust.

## Browser-Automatisierung: Safari + AppleScript, NICHT Playwright

**Grund:** Die macOS-Version (13.x) ist aus dem Support-Fenster von Playwright und
anderen Tooling-Ketten gefallen. Playwright-Versionen ab ~1.55 verweigern die
Installation („does not support chromium on mac13"), ältere gecachte Chromium-Builds
werden von Gatekeeper (`com.apple.provenance`) beim Spawn gekillt. Homebrew will
aus denselben Gründen teils nichts Neues bauen/installieren.

**Was funktioniert:** Safari per `osascript` fernsteuern (Voraussetzung: Safari →
Entwicklermenü → „JavaScript von Apple Events erlauben"). Bewährtes Rezept:

```applescript
tell application "Safari"
  set w to make new document          -- EIGENES Fenster, nie das des Nutzers
  set URL of w to "http://localhost:5173"
  delay 4                              -- SPA braucht einen Moment
  do JavaScript "document.querySelectorAll('.day-card').length" in w
end tell
```

- Fensterreferenz (`w`) durchreichen, **nie** `front window`/Indexe benutzen —
  der Nutzer arbeitet parallel im Browser, Indexe verschieben sich.
- Klicks und Zustandslesen funktionieren über `do JavaScript`
  (`element.click()`, `getBoundingClientRect()`, `innerText`).
- Ergebnis-Joins in JS mit `' || '` bauen — literal `\n` im AppleScript-String
  bricht das Quoting.
- Eigene Testfenster am Ende wieder schließen; Dev-Server per
  `lsof -ti:PORT -sTCP:LISTEN | xargs -r kill` stoppen (nicht breites `pkill`).
- `screencapture -x pfad.png` macht Bildschirmfotos — Vorsicht: voller Screen,
  nur wenn der Nutzer einverstanden ist.

## Weitere Umgebungseigenheiten

- **SQLite:** `node:sqlite` (eingebaut) statt `better-sqlite3` — kein
  vorkompiliertes Binary für die Node-26-ABI, node-gyp-Fallback schlägt fehl.
- **TypeScript:** `noEmitOnError: true` in `tsconfig.base.json` — Builds versagen
  hart bei Typfehlern, `dist/` ist immer lauffähig.
- **LLM-Zugang:** über den z.ai-Anthropic-kompatiblen Endpunkt
  (`ANTHROPIC_BASE_URL`/Key in `.env`, Modell `glm-5.3`), Fallback via .env auf
  echtes Anthropic. Details: `devpost/checklist.md > Revisions`.
- **Tests/Build:** `pnpm build` (alles), `pnpm --filter api test` (Vitest),
  `pnpm --filter api offers:fetch` / `offers:validate` / `plan:assert`.

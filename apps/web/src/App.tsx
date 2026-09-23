import { useEffect, useState } from "react";
import type { Person } from "@fep/shared";
import { fetchState, seedDemoHousehold } from "./lib/api.js";
import { FirstStart } from "./views/FirstStart.js";
import { Main } from "./views/Main.js";

const STORAGE_KEY = "fep.current-person";

export default function App() {
  const [state, setState] = useState<"loading" | "ready">("loading");
  const [household, setHousehold] = useState<null | import("@fep/shared").Household>(null);
  const [currentPerson, setCurrentPerson] = useState<Person | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchState()
      .then((s) => {
        setHousehold(s.household);
        setState("ready");
      })
      .catch((e) => {
        setError(String(e));
        setState("ready");
      });
  }, []);

  // Ansichtsidentität: ohne Login, im Browser bewahrt (prd.md > Identität).
  useEffect(() => {
    if (!household) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const found = household.persons.find((p) => p.id === stored) ?? household.persons[0] ?? null;
    setCurrentPerson(found);
  }, [household]);

  useEffect(() => {
    if (currentPerson) localStorage.setItem(STORAGE_KEY, currentPerson.id);
  }, [currentPerson]);

  // Die gewählte Person färbt die Ansicht (Pastell-Paar, prd.md > Look and Feel).
  useEffect(() => {
    document.body.dataset.person = currentPerson?.colorPair ?? "";
  }, [currentPerson]);

  async function startDemo() {
    setBusy(true);
    setError(null);
    try {
      const s = await seedDemoHousehold();
      setHousehold(s.household);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return <div className="first-start">Lädt …</div>;

  if (error) {
    return (
      <div className="first-start">
        <h1>Hoppla.</h1>
        <p className="lead">{error}</p>
        <p className="hint">Läuft der API-Server (pnpm dev)?</p>
      </div>
    );
  }

  if (!household) return <FirstStart onDemo={startDemo} busy={busy} />;

  return (
    <Main
      household={household}
      current={currentPerson}
      onSelectPerson={setCurrentPerson}
    />
  );
}

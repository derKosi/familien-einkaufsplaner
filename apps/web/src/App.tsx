import { useEffect, useState } from "react";
import type { HouseholdSettings, Person, Store } from "@fep/shared";
import {
  addPerson,
  createEvent,
  createHousehold,
  fetchState,
  generatePlan,
  saveSettings,
  seedDemoHousehold,
  setExemptDays,
  setListItemChecked,
  setMealPrepared,
  updatePerson,
} from "./lib/api.js";
import { FirstStart } from "./views/FirstStart.js";
import { Main } from "./views/Main.js";
import { Onboarding } from "./views/Onboarding.js";
import { Settings } from "./views/Settings.js";
import { ShoppingList } from "./views/ShoppingList.js";

const STORAGE_KEY = "fep.current-person";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<import("@fep/shared").AppState | null>(null);
  const [currentPerson, setCurrentPerson] = useState<Person | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showList, setShowList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchState()
      .then((s) => setState(s))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Ansichtsidentität: ohne Login, im Browser bewahrt (prd.md > Identität).
  useEffect(() => {
    const persons = state?.household?.persons ?? [];
    const stored = localStorage.getItem(STORAGE_KEY);
    setCurrentPerson(persons.find((p) => p.id === stored) ?? persons[0] ?? null);
  }, [state?.household]);

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
      setState(await seedDemoHousehold());
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  /** Der Kernel (Slice 4): Plan generieren, State komplett ersetzen. */
  async function runGenerate(store: Store, allowNoOffers: boolean) {
    setGenerating(true);
    setError(null);
    setSelectedDay(null); // neuer Plan → zurück in die Wochenansicht
    try {
      setState(await generatePlan(store, allowNoOffers));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <div className="first-start">Lädt …</div>;

  if (error && !state) {
    return (
      <div className="first-start">
        <h1>Hoppla.</h1>
        <p className="lead">{error}</p>
        <p className="hint">Läuft der API-Server (pnpm dev)?</p>
      </div>
    );
  }

  /** Abhak beim Kochen — Persistenz passiert server-seitig im Wochenplan. */
  async function togglePrepared(day: number, slot: string, prepared: boolean) {
    try {
      setState(await setMealPrepared(day, slot, prepared));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  /** Abhak in der Liste — bleibt über Neuladen hinweg gespeichert. */
  async function toggleChecked(itemId: string, checked: boolean) {
    try {
      setState(await setListItemChecked(itemId, checked));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  /** Event hinzufügen (Grillabend & Co.) — skaliert Plan und Liste sofort. */
  async function addEvent(day: number, personCount: number, dishHint: string | null) {
    setError(null);
    try {
      setState(await createEvent(day, personCount, dishHint));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  /** Tage aussetzen / wieder aufnehmen — Liste rechnet sofort neu. */
  async function changeExempt(days: number[]) {
    setError(null);
    try {
      setState(await setExemptDays(days));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!state?.household) {
    return onboarding ? (
      <Onboarding
        state={state ?? ({ household: null } as never)}
        onCreateHousehold={(name) => {
          setBusy(true);
          createHousehold(name).then(setState).catch((e) => setError(String(e))).finally(() => setBusy(false));
        }}
        onAddPerson={(p) => {
          setBusy(true);
          addPerson(p).then(setState).catch((e) => setError(String(e))).finally(() => setBusy(false));
        }}
        onDone={() => setOnboarding(false)}
        busy={busy}
      />
    ) : (
      <FirstStart onDemo={startDemo} busy={busy} onOwn={() => setOnboarding(true)} />
    );
  }

  if (showSettings) {
    return (
      <Settings
        state={state}
        onBack={() => setShowSettings(false)}
        onSaveSettings={(patch) => {
          saveSettings(patch).then(setState).catch((e) => setError(String(e)));
        }}
        onToggleComplete={(personId, complete) => {
          updatePerson(personId, { complete }).then(setState).catch((e) => setError(String(e)));
        }}
      />
    );
  }

  if (showList) {
    return (
      <ShoppingList
        state={state}
        onBack={() => setShowList(false)}
        onToggleChecked={toggleChecked}
      />
    );
  }

  return (
    <Main
      state={state}
      current={currentPerson}
      onSelectPerson={setCurrentPerson}
      generating={generating}
      generateError={error}
      onGenerate={runGenerate}
      selectedDay={selectedDay}
      onSelectDay={setSelectedDay}
      onTogglePrepared={togglePrepared}
      onShowList={() => setShowList(true)}
      onAddEvent={addEvent}
      onSetExempt={changeExempt}
      onShowSettings={() => setShowSettings(true)}
    />
  );
}

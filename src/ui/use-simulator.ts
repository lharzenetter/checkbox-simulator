import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { State } from "../core/index";
import {
  BLANK_TRUPPZUORDNUNG,
  discardSession,
  loadStores,
  resetToFactory,
  saveDeviceMemory,
  saveSession,
} from "../storage/index";
import type { Truppzuordnung, TruppzuordnungColumn } from "../storage/index";
import {
  reduceSimulator,
  resumeSimulator,
  startSimulator,
} from "../world/index";
import type {
  DeviceInput,
  Fahrzeuge,
  SimulationClock,
  SimulatorEvent,
  Speed,
} from "../world/index";

// The core's Uhrzeit is local wall-clock time counted as if it were UTC (see `Clocks`).
function localTimeOfDay(): number {
  return Date.now() - new Date().getTimezoneOffset() * 60_000;
}

// Reading the `localStorage` global itself throws (SecurityError) when the browser blocks
// storage; the simulator then runs on a storage that keeps nothing.
function browserStorage(): Storage {
  try {
    return localStorage;
  } catch {
    return {
      length: 0,
      clear() {
        // Keeps nothing; see above.
      },
      getItem: () => null,
      key: () => null,
      removeItem() {
        // Keeps nothing; see above.
      },
      setItem() {
        // Keeps nothing; see above.
      },
    };
  }
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** The names the Trainee sets: the Feuerwehrname on the LCD and the Fahrzeuge. */
export interface Names {
  readonly feuerwehrname: string;
  readonly fahrzeuge: Fahrzeuge;
}

export function useSimulator(): {
  readonly state: State;
  readonly dispatch: (input: DeviceInput) => void;
  readonly clock: SimulationClock;
  readonly pause: () => void;
  readonly play: () => void;
  readonly setSpeed: (speed: Speed) => void;
  readonly stepSpeed: (direction: "faster" | "slower") => void;
  readonly togglePause: () => void;
  readonly names: Names;
  readonly firstLaunchDone: boolean;
  // Keeps the names and marks the first launch done.
  readonly setNames: (names: Names) => void;
  readonly muted: boolean;
  readonly toggleMute: () => void;
  readonly truppzuordnung: Truppzuordnung;
  readonly writeTruppzuordnung: (
    truppnummer: number,
    column: TruppzuordnungColumn,
    text: string,
  ) => void;
  readonly truppzuordnungShown: boolean;
  readonly setTruppzuordnungShown: (shown: boolean) => void;
  readonly resetToFactory: () => void;
  // A session saved before the reload waits for "fortsetzen / verwerfen?". The key map is off
  // meanwhile and so releases every key, so keys held when it was saved are not held on play.
  readonly sessionChoicePending: boolean;
  readonly resumeSession: () => void;
  readonly discardSession: () => void;
} {
  const [storage] = useState(browserStorage);
  const [{ deviceMemory, session, truppzuordnung: savedTruppzuordnung }] =
    useState(() => loadStores(storage));
  // Before the first launch is done no key has reached the device, so there is nothing to resume.
  const savedSession = deviceMemory.firstLaunchDone ? session : null;
  const [sessionChoicePending, setSessionChoicePending] = useState(
    savedSession !== null,
  );
  // Off once the stores are cleared for a reload, so nothing is written back before it.
  const persisting = useRef(true);
  const [names, setNamesState] = useState<Names>({
    feuerwehrname: deviceMemory.feuerwehrname,
    fahrzeuge: deviceMemory.fahrzeuge,
  });
  const [firstLaunchDone, setFirstLaunchDone] = useState(
    deviceMemory.firstLaunchDone,
  );
  const [muted, setMuted] = useState(deviceMemory.muted);
  const [truppzuordnung, setTruppzuordnung] = useState(
    savedSession === null ? BLANK_TRUPPZUORDNUNG : savedTruppzuordnung,
  );
  const [truppzuordnungShown, setTruppzuordnungShown] = useState(
    deviceMemory.truppzuordnungShown,
  );
  const [{ clock, state }, dispatchToSimulator] = useReducer(
    reduceSimulator,
    savedSession,
    (saved) =>
      saved === null
        ? startSimulator({
            realNow: performance.now(),
            uhrzeit: localTimeOfDay(),
            stored: deviceMemory,
          })
        : resumeSimulator({ realNow: performance.now(), state: saved }),
  );

  useEffect(() => {
    if (!persisting.current) {
      return;
    }
    saveDeviceMemory(storage, {
      ...names,
      firstLaunchDone,
      muted,
      truppzuordnungShown,
      einsatzprotokolle: state.einsatzprotokolle,
      nextEinsatznummer: state.nextEinsatznummer,
    });
  }, [
    storage,
    names,
    firstLaunchDone,
    muted,
    truppzuordnungShown,
    state.einsatzprotokolle,
    state.nextEinsatznummer,
  ]);

  // Until the Trainee chooses, the saved session stays as it was, so another reload asks again.
  useEffect(() => {
    if (persisting.current && !sessionChoicePending) {
      saveSession(storage, state, truppzuordnung);
    }
  }, [storage, state, truppzuordnung, sessionChoicePending]);

  // The simulator follows the Alarm itself, so the loop only reports real time passing.
  useEffect(() => {
    let frame = requestAnimationFrame(tick);
    function tick(): void {
      dispatchToSimulator({ type: "timePassed", realNow: performance.now() });
      frame = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  // Read real time here, not in the reducer, which React may call twice.
  const dispatchAtRealTime = useCallback(
    (event: DistributiveOmit<SimulatorEvent, "realNow">) => {
      dispatchToSimulator({ ...event, realNow: performance.now() });
    },
    [],
  );
  const dispatch = useCallback(
    (input: DeviceInput) => {
      dispatchAtRealTime({ type: "inputGiven", input });
    },
    [dispatchAtRealTime],
  );
  const pause = useCallback(() => {
    dispatchAtRealTime({ type: "paused" });
  }, [dispatchAtRealTime]);
  const play = useCallback(() => {
    dispatchAtRealTime({ type: "played" });
  }, [dispatchAtRealTime]);
  const setSpeed = useCallback(
    (speed: Speed) => {
      dispatchAtRealTime({ type: "speedChosen", speed });
    },
    [dispatchAtRealTime],
  );
  const stepSpeed = useCallback(
    (direction: "faster" | "slower") => {
      dispatchAtRealTime({ type: "speedStepped", direction });
    },
    [dispatchAtRealTime],
  );
  const togglePause = useCallback(() => {
    dispatchAtRealTime({ type: "pauseToggled" });
  }, [dispatchAtRealTime]);

  const setNames = useCallback((named: Names) => {
    setNamesState(named);
    setFirstLaunchDone(true);
  }, []);
  const toggleMute = useCallback(() => {
    setMuted((current) => !current);
  }, []);
  const writeTruppzuordnung = useCallback(
    (truppnummer: number, column: TruppzuordnungColumn, text: string) => {
      setTruppzuordnung((current) =>
        current.map((written, index) =>
          index === truppnummer - 1 ? { ...written, [column]: text } : written,
        ),
      );
    },
    [],
  );
  // Reloading starts a new session on the cleared storage, so the first-launch dialog returns
  // and the Uhrzeit starts again at the real time of day.
  const resetToFactoryAndReload = useCallback(() => {
    persisting.current = false;
    resetToFactory(storage);
    location.reload();
  }, [storage]);
  // The clock was resumed paused at the saved session; decided in "Decide what survives a page
  // reload".
  const resumeSession = useCallback(() => {
    setSessionChoicePending(false);
  }, []);
  // Reloading without the session starts a new one; decided in "Decide what survives a page
  // reload".
  const discardSessionAndReload = useCallback(() => {
    persisting.current = false;
    discardSession(storage);
    location.reload();
  }, [storage]);

  return {
    state,
    dispatch,
    clock,
    pause,
    play,
    setSpeed,
    stepSpeed,
    togglePause,
    names,
    firstLaunchDone,
    setNames,
    muted,
    toggleMute,
    truppzuordnung,
    writeTruppzuordnung,
    truppzuordnungShown,
    setTruppzuordnungShown,
    resetToFactory: resetToFactoryAndReload,
    sessionChoicePending,
    resumeSession,
    discardSession: discardSessionAndReload,
  };
}

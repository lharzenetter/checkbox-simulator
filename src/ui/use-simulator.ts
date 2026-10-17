import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createInitialState, isAlarmActive, reduce } from "../core/index";
import type { Event, State } from "../core/index";
import {
  BLANK_TRUPPZUORDNUNG,
  discardSession,
  loadStores,
  resetToFactory,
  saveDeviceMemory,
  saveSession,
} from "../storage/index";
import type { Truppzuordnung } from "../storage/index";
import {
  acceptsDeviceKeys,
  followAlarmSignal,
  pauseClock,
  playClock,
  readClocks,
  resumeSimulationClock,
  setClockSpeed,
  stepClockSpeed,
  startSimulationClock,
} from "../world/index";
import type { Fahrzeuge, SimulationClock, Speed } from "../world/index";

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

/** The names the Trainee sets: the Feuerwehrname on the LCD and the Fahrzeuge. */
export interface Names {
  readonly feuerwehrname: string;
  readonly fahrzeuge: Fahrzeuge;
}

export function useSimulator(): {
  readonly state: State;
  readonly dispatch: (event: Event) => void;
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
  readonly writeTruppzuordnung: (truppnummer: number, entry: string) => void;
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
  const [clock, setClock] = useState(() =>
    savedSession === null
      ? startSimulationClock({
          realNow: performance.now(),
          uhrzeit: localTimeOfDay(),
        })
      : resumeSimulationClock({
          realNow: performance.now(),
          clocks: { now: savedSession.now, realNow: savedSession.realNow },
        }),
  );
  const [state, dispatchToCore] = useReducer(
    reduce,
    clock,
    (startedClock) =>
      savedSession ??
      createInitialState(
        readClocks(startedClock, performance.now()),
        deviceMemory,
      ),
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

  // The tick loop reads the Alarm here, so the clock follows it from the next frame on.
  const alarmActive = useRef(isAlarmActive(state));
  useEffect(() => {
    alarmActive.current = isAlarmActive(state);
  }, [state]);

  useEffect(() => {
    let frame = requestAnimationFrame(tick);
    function tick(): void {
      const realNow = performance.now();
      const active = alarmActive.current;
      // Decided in "Drop the simulation to real time while an Alarm sounds", points 1–3, held
      // until the second OK as amended in "Correct the simulator against the real Checkbox".
      if (active !== clock.heldAtRealTime) {
        setClock((current) => followAlarmSignal(current, active, realNow));
      }
      dispatchToCore({ type: "tick", ...readClocks(clock, realNow) });
      frame = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [clock]);

  const dispatch = useCallback(
    (event: Event) => {
      // A release always gets through, so a key let go while paused is not held on play.
      if (
        event.type !== "tick" &&
        event.type !== "keyReleased" &&
        !acceptsDeviceKeys(clock)
      ) {
        return;
      }
      dispatchToCore(event);
    },
    [clock],
  );

  // Read real time outside the updater, which React may call twice.
  const updateClock = useCallback(
    (
      update: (current: SimulationClock, realNow: number) => SimulationClock,
    ) => {
      const realNow = performance.now();
      setClock((current) => update(current, realNow));
    },
    [],
  );
  const pause = useCallback(() => {
    updateClock(pauseClock);
  }, [updateClock]);
  const play = useCallback(() => {
    updateClock(playClock);
  }, [updateClock]);
  const setSpeed = useCallback(
    (speed: Speed) => {
      updateClock((current, realNow) => setClockSpeed(current, speed, realNow));
    },
    [updateClock],
  );
  const stepSpeed = useCallback(
    (direction: "faster" | "slower") => {
      updateClock((current, realNow) =>
        stepClockSpeed(current, direction, realNow),
      );
    },
    [updateClock],
  );
  const togglePause = useCallback(() => {
    updateClock((current, realNow) =>
      current.paused
        ? playClock(current, realNow)
        : pauseClock(current, realNow),
    );
  }, [updateClock]);

  const setNames = useCallback((named: Names) => {
    setNamesState(named);
    setFirstLaunchDone(true);
  }, []);
  const toggleMute = useCallback(() => {
    setMuted((current) => !current);
  }, []);
  const writeTruppzuordnung = useCallback(
    (truppnummer: number, entry: string) => {
      setTruppzuordnung((current) =>
        current.map((written, index) =>
          index === truppnummer - 1 ? entry : written,
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

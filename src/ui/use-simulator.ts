import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createInitialState, reduce } from "../core/index";
import type { Event, State } from "../core/index";
import {
  discardSession,
  loadStores,
  resetToFactory,
  saveDeviceMemory,
  saveSession,
} from "../storage/index";
import {
  acceptsDeviceKeys,
  pauseClock,
  playClock,
  readClocks,
  resumeSimulationClock,
  setClockSpeed,
  stepClockSpeed,
  startSimulationClock,
} from "../world/index";
import type { SimulationClock, Speed, Vehicles } from "../world/index";

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

export function useSimulator(): {
  readonly state: State;
  readonly dispatch: (event: Event) => void;
  readonly clock: SimulationClock;
  readonly pause: () => void;
  readonly play: () => void;
  readonly setSpeed: (speed: Speed) => void;
  readonly stepSpeed: (direction: "faster" | "slower") => void;
  readonly togglePause: () => void;
  readonly vehicles: Vehicles;
  readonly firstLaunchDone: boolean;
  // Keeps the vehicles' names and marks the first launch done.
  readonly nameVehicles: (vehicles: Vehicles) => void;
  readonly muted: boolean;
  readonly toggleMute: () => void;
  readonly resetToFactory: () => void;
  // A session saved before the reload waits for "fortsetzen / verwerfen?". The key map is off
  // meanwhile and so releases every key, so keys held when it was saved are not held on play.
  readonly sessionChoicePending: boolean;
  readonly resumeSession: () => void;
  readonly discardSession: () => void;
} {
  const [storage] = useState(browserStorage);
  const [{ deviceMemory, session }] = useState(() => loadStores(storage));
  // Before the first launch is done no key has reached the device, so there is nothing to resume.
  const savedSession = deviceMemory.firstLaunchDone ? session : null;
  const [sessionChoicePending, setSessionChoicePending] = useState(
    savedSession !== null,
  );
  // Off once the stores are cleared for a reload, so nothing is written back before it.
  const persisting = useRef(true);
  const [vehicles, setVehicles] = useState(deviceMemory.vehicles);
  const [firstLaunchDone, setFirstLaunchDone] = useState(
    deviceMemory.firstLaunchDone,
  );
  const [muted, setMuted] = useState(deviceMemory.muted);
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
        deviceMemory.einsatzprotokolle,
      ),
  );

  useEffect(() => {
    if (!persisting.current) {
      return;
    }
    saveDeviceMemory(storage, {
      vehicles,
      firstLaunchDone,
      muted,
      einsatzprotokolle: state.einsatzprotokolle,
    });
  }, [storage, vehicles, firstLaunchDone, muted, state.einsatzprotokolle]);

  // Until the Trainee chooses, the saved session stays as it was, so another reload asks again.
  useEffect(() => {
    if (persisting.current && !sessionChoicePending) {
      saveSession(storage, state);
    }
  }, [storage, state, sessionChoicePending]);

  useEffect(() => {
    let frame = requestAnimationFrame(tick);
    function tick(): void {
      dispatchToCore({ type: "tick", ...readClocks(clock, performance.now()) });
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

  const nameVehicles = useCallback((named: Vehicles) => {
    setVehicles(named);
    setFirstLaunchDone(true);
  }, []);
  const toggleMute = useCallback(() => {
    setMuted((current) => !current);
  }, []);
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
    vehicles,
    firstLaunchDone,
    nameVehicles,
    muted,
    toggleMute,
    resetToFactory: resetToFactoryAndReload,
    sessionChoicePending,
    resumeSession,
    discardSession: discardSessionAndReload,
  };
}

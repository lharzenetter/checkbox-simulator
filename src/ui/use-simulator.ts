import { useCallback, useEffect, useReducer, useState } from "react";
import { createInitialState, reduce } from "../core/index";
import type { Event, State } from "../core/index";
import {
  loadDeviceMemory,
  resetToFactory,
  saveDeviceMemory,
} from "../storage/index";
import {
  acceptsDeviceKeys,
  pauseClock,
  playClock,
  readClocks,
  setClockSpeed,
  startSimulationClock,
} from "../world/index";
import type { SimulationClock, Speed, Vehicles } from "../world/index";

// The core's Uhrzeit is local wall-clock time counted as if it were UTC (see `Clocks`).
function localTimeOfDay(): number {
  return Date.now() - new Date().getTimezoneOffset() * 60_000;
}

export function useSimulator(): {
  readonly state: State;
  readonly dispatch: (event: Event) => void;
  readonly clock: SimulationClock;
  readonly pause: () => void;
  readonly play: () => void;
  readonly setSpeed: (speed: Speed) => void;
  readonly vehicles: Vehicles;
  readonly firstLaunchDone: boolean;
  /** Keeps the vehicles' names and marks the first launch done. */
  readonly nameVehicles: (vehicles: Vehicles) => void;
  readonly muted: boolean;
  readonly toggleMute: () => void;
  readonly resetToFactory: () => void;
} {
  const [deviceMemory] = useState(() => loadDeviceMemory(localStorage));
  const [vehicles, setVehicles] = useState(deviceMemory.vehicles);
  const [firstLaunchDone, setFirstLaunchDone] = useState(
    deviceMemory.firstLaunchDone,
  );
  const [muted, setMuted] = useState(deviceMemory.muted);
  const [clock, setClock] = useState(() =>
    startSimulationClock({
      realNow: performance.now(),
      uhrzeit: localTimeOfDay(),
    }),
  );
  const [state, dispatchToCore] = useReducer(reduce, clock, (startedClock) =>
    createInitialState(
      readClocks(startedClock, performance.now()),
      deviceMemory.einsatzprotokolle,
    ),
  );

  useEffect(() => {
    saveDeviceMemory(localStorage, {
      vehicles,
      firstLaunchDone,
      muted,
      einsatzprotokolle: state.einsatzprotokolle,
    });
  }, [vehicles, firstLaunchDone, muted, state.einsatzprotokolle]);

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
    resetToFactory(localStorage);
    location.reload();
  }, []);

  return {
    state,
    dispatch,
    clock,
    pause,
    play,
    setSpeed,
    vehicles,
    firstLaunchDone,
    nameVehicles,
    muted,
    toggleMute,
    resetToFactory: resetToFactoryAndReload,
  };
}

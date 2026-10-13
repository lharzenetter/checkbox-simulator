import { useCallback, useEffect, useReducer, useState } from "react";
import { createInitialState, reduce } from "../core/index";
import type { Event, State } from "../core/index";
import {
  acceptsDeviceKeys,
  pauseClock,
  playClock,
  readClocks,
  setClockSpeed,
  startSimulationClock,
} from "../world/index";
import type { SimulationClock, Speed } from "../world/index";

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
} {
  const [clock, setClock] = useState(() =>
    startSimulationClock({
      realNow: performance.now(),
      uhrzeit: localTimeOfDay(),
    }),
  );
  const [state, dispatchToCore] = useReducer(reduce, clock, (startedClock) =>
    createInitialState(readClocks(startedClock, performance.now())),
  );

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
      if (event.type === "keyPressed" && !acceptsDeviceKeys(clock)) {
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

  return { state, dispatch, clock, pause, play, setSpeed };
}

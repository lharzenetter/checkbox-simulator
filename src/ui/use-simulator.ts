import { useEffect, useReducer, useState } from "react";
import { createInitialState, reduce } from "../core/index";
import type { Event, State } from "../core/index";
import { readClocks, startSimulationClock } from "../world/index";

// The core's Uhrzeit is local wall-clock time counted as if it were UTC (see `Clocks`).
function localTimeOfDay(): number {
  return Date.now() - new Date().getTimezoneOffset() * 60_000;
}

export function useSimulator(): {
  readonly state: State;
  readonly dispatch: (event: Event) => void;
} {
  const [clock] = useState(() =>
    startSimulationClock({
      realNow: performance.now(),
      uhrzeit: localTimeOfDay(),
    }),
  );
  const [state, dispatch] = useReducer(reduce, clock, (startedClock) =>
    createInitialState(readClocks(startedClock, performance.now())),
  );

  useEffect(() => {
    let frame = requestAnimationFrame(tick);
    function tick(): void {
      dispatch({ type: "tick", ...readClocks(clock, performance.now()) });
      frame = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [clock]);

  return { state, dispatch };
}

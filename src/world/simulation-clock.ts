import type { Clocks } from "../core/index";

/** Where a session's simulated time began, against real time. */
export interface SimulationClock {
  readonly realStart: number;
  readonly uhrzeitStart: number;
}

/**
 * Starts a session's clock. `realNow` is a real monotonic reading; `uhrzeit` is the real time of
 * day in the core's Uhrzeit convention (see `Clocks`). Decided in "Decide what survives a page
 * reload".
 */
export function startSimulationClock({
  realNow,
  uhrzeit,
}: {
  readonly realNow: number;
  readonly uhrzeit: number;
}): SimulationClock {
  return { realStart: Math.round(realNow), uhrzeitStart: uhrzeit };
}

/** Both clocks for a `tick`, in whole milliseconds, at 1×. */
export function readClocks(clock: SimulationClock, realNow: number): Clocks {
  const roundedRealNow = Math.round(realNow);
  return {
    now: clock.uhrzeitStart + roundedRealNow - clock.realStart,
    realNow: roundedRealNow,
  };
}

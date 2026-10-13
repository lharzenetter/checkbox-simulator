import type { Clocks } from "../core/index";

/**
 * The speed presets the Trainee can run the simulation at. Decided in "Design how the Trainee
 * handles Tallys and the clock".
 */
export const SPEEDS = [1, 2, 5, 10] as const;

/** One of the {@link SPEEDS}. */
export type Speed = (typeof SPEEDS)[number];

/**
 * A session's simulated time against real time. `anchor` holds both clocks as they read at the
 * real reading `anchorRealMs`; they run on from there at `speed`, unless `paused` holds them at
 * `anchor`. The two differ because `anchor.realNow` excludes the real time spent paused.
 */
export interface SimulationClock {
  readonly speed: Speed;
  readonly paused: boolean;
  readonly anchorRealMs: number;
  readonly anchor: Clocks;
}

/**
 * Starts a session's clock at 1×. `realNow` is a real monotonic reading; `uhrzeit` is the real
 * time of day in the core's Uhrzeit convention (see `Clocks`). Decided in "Decide what survives
 * a page reload".
 */
export function startSimulationClock({
  realNow,
  uhrzeit,
}: {
  readonly realNow: number;
  readonly uhrzeit: number;
}): SimulationClock {
  const realStart = Math.round(realNow);
  return {
    speed: 1,
    paused: false,
    anchorRealMs: realStart,
    anchor: { now: uhrzeit, realNow: realStart },
  };
}

/**
 * The clock of a session resumed after a reload: paused, holding both clocks where the saved
 * session stopped. `realNow` is a real monotonic reading of the new page. The time the page was
 * closed is frozen, never caught up. Decided in "Decide what survives a page reload".
 */
export function resumeSimulationClock({
  realNow,
  clocks,
}: {
  readonly realNow: number;
  readonly clocks: Clocks;
}): SimulationClock {
  // ASSUMPTION: the speed is not part of the saved session, so a resumed session starts at 1×
  // like a new one; "Decide what survives a page reload" saves only the device core's state.
  return {
    speed: 1,
    paused: true,
    anchorRealMs: Math.round(realNow),
    anchor: clocks,
  };
}

/** Both clocks for a `tick` at the real reading `realNow`, in whole milliseconds. */
export function readClocks(clock: SimulationClock, realNow: number): Clocks {
  if (clock.paused) {
    return clock.anchor;
  }
  const elapsedMs = Math.round(realNow) - clock.anchorRealMs;
  return {
    now: clock.anchor.now + elapsedMs * clock.speed,
    realNow: clock.anchor.realNow + elapsedMs,
  };
}

/** Runs simulated time at `speed` from the real reading `realNow` on. */
export function setClockSpeed(
  clock: SimulationClock,
  speed: Speed,
  realNow: number,
): SimulationClock {
  return { ...reanchor(clock, realNow), speed };
}

/** Stops both clocks at the real reading `realNow`; timing-and-alarm-rules §9.1. */
export function pauseClock(
  clock: SimulationClock,
  realNow: number,
): SimulationClock {
  return { ...reanchor(clock, realNow), paused: true };
}

/** Runs both clocks on from where they were paused, starting at the real reading `realNow`. */
export function playClock(
  clock: SimulationClock,
  realNow: number,
): SimulationClock {
  return { ...reanchor(clock, realNow), paused: false };
}

function reanchor(clock: SimulationClock, realNow: number): SimulationClock {
  return {
    ...clock,
    anchorRealMs: Math.round(realNow),
    anchor: readClocks(clock, realNow),
  };
}

/**
 * Whether the device keys and Tallys on Check act; while paused they do nothing. Decided in
 * "Decide how alarms are presented".
 */
export function acceptsDeviceKeys(clock: SimulationClock): boolean {
  return !clock.paused;
}

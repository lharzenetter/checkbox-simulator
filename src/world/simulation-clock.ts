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
 * `heldAtRealTime` holds the speed at 1× while the Checkbox's Alarm signal runs.
 */
export interface SimulationClock {
  readonly speed: Speed;
  readonly paused: boolean;
  readonly heldAtRealTime: boolean;
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
    heldAtRealTime: false,
    anchorRealMs: realStart,
    anchor: { now: uhrzeit, realNow: realStart },
  };
}

/**
 * The clock of a session resumed after a reload: paused, holding both clocks where the saved
 * session stopped. `realNow` is a real monotonic reading of the new page. Decided in "Decide what
 * survives a page reload".
 */
export function resumeSimulationClock({
  realNow,
  clocks,
}: {
  readonly realNow: number;
  readonly clocks: Clocks;
}): SimulationClock {
  // ASSUMPTION: a resumed session starts at 1× like a new one, since only the device core's state
  // is saved; decided in "Resume the running session after a reload" (#39).
  return {
    speed: 1,
    paused: true,
    heldAtRealTime: false,
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

/**
 * Runs simulated time at `speed` from the real reading `realNow` on, unless the clock is held at
 * real time.
 */
export function setClockSpeed(
  clock: SimulationClock,
  speed: Speed,
  realNow: number,
): SimulationClock {
  if (clock.heldAtRealTime) {
    return clock;
  }
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

/**
 * Whether the Trainee can change the speed: not while paused, nor while held at real time.
 * Decided in "Drop the simulation to real time while an Alarm sounds".
 */
export function acceptsSpeedChange(clock: SimulationClock): boolean {
  return !clock.paused && !clock.heldAtRealTime;
}

/**
 * Moves to the next of the {@link SPEEDS} up or down, staying put at either end and while paused.
 * Decided in "Design how the Trainee handles Tallys and the clock".
 */
export function stepClockSpeed(
  clock: SimulationClock,
  direction: "faster" | "slower",
  realNow: number,
): SimulationClock {
  const next =
    SPEEDS[SPEEDS.indexOf(clock.speed) + (direction === "faster" ? 1 : -1)];
  if (!acceptsSpeedChange(clock) || next === undefined) {
    return clock;
  }
  return setClockSpeed(clock, next, realNow);
}

/**
 * Follows the Checkbox's Alarm signal at the real reading `realNow`: while `alarmSounding`,
 * simulated time runs at 1× and the speed cannot change; once it stops, the speed stays at 1×.
 * Decided in "Drop the simulation to real time while an Alarm sounds".
 */
export function followAlarmSignal(
  clock: SimulationClock,
  alarmSounding: boolean,
  realNow: number,
): SimulationClock {
  if (alarmSounding === clock.heldAtRealTime) {
    return clock;
  }
  if (!alarmSounding) {
    return { ...clock, heldAtRealTime: false };
  }
  return { ...reanchor(clock, realNow), speed: 1, heldAtRealTime: true };
}

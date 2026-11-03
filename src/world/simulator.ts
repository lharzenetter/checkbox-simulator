import {
  assertNever,
  createInitialState,
  isAlarmActive,
  reduce,
} from "../core/index";
import type { Event, State, StoredEinsatzprotokolle } from "../core/index";
import {
  acceptsDeviceKeys,
  followAlarmSignal,
  pauseClock,
  playClock,
  readClocks,
  resumeSimulationClock,
  setClockSpeed,
  startSimulationClock,
  stepClockSpeed,
} from "./simulation-clock";
import type { SimulationClock, Speed } from "./simulation-clock";

/** The Checkbox's device state together with the simulation clock that drives it. */
export interface Simulator {
  readonly clock: SimulationClock;
  readonly state: State;
}

/** What the Trainee does with the device, everything but the `tick` the clock sends. */
export type DeviceInput = Exclude<Event, { readonly type: "tick" }>;

/**
 * What happened to the simulator at the real reading `realNow`: the Trainee's input on the
 * device, real time passing, or the clock controls.
 */
export type SimulatorEvent =
  | {
      readonly type: "inputGiven";
      readonly input: DeviceInput;
      readonly realNow: number;
    }
  | { readonly type: "timePassed"; readonly realNow: number }
  | { readonly type: "paused"; readonly realNow: number }
  | { readonly type: "played"; readonly realNow: number }
  | { readonly type: "pauseToggled"; readonly realNow: number }
  | {
      readonly type: "speedChosen";
      readonly speed: Speed;
      readonly realNow: number;
    }
  | {
      readonly type: "speedStepped";
      readonly direction: "faster" | "slower";
      readonly realNow: number;
    };

/**
 * A new session: the Checkbox off at 1×. `realNow` is a real monotonic reading; `uhrzeit` is the
 * real time of day in the core's Uhrzeit convention.
 */
export function startSimulator({
  realNow,
  uhrzeit,
  stored,
}: {
  readonly realNow: number;
  readonly uhrzeit: number;
  readonly stored?: StoredEinsatzprotokolle;
}): Simulator {
  const clock = startSimulationClock({ realNow, uhrzeit });
  return {
    clock,
    state: createInitialState(readClocks(clock, realNow), stored),
  };
}

/** A session saved before a reload, resumed paused where it stopped. */
export function resumeSimulator({
  realNow,
  state,
}: {
  readonly realNow: number;
  readonly state: State;
}): Simulator {
  return {
    clock: resumeSimulationClock({
      realNow,
      clocks: { now: state.now, realNow: state.realNow },
    }),
    state,
  };
}

/** The simulator after `event`: pure, so the UI and the acceptance driver share it. */
export function reduceSimulator(
  simulator: Simulator,
  event: SimulatorEvent,
): Simulator {
  switch (event.type) {
    case "inputGiven":
      // A release always gets through, so a key let go while paused is not held on play.
      if (
        event.input.type !== "keyReleased" &&
        !acceptsDeviceKeys(simulator.clock)
      ) {
        return simulator;
      }
      return followDevice(simulator, event.input, event.realNow);
    case "timePassed":
      return followDevice(
        simulator,
        { type: "tick", ...readClocks(simulator.clock, event.realNow) },
        event.realNow,
      );
    case "paused":
      return withClock(simulator, pauseClock(simulator.clock, event.realNow));
    case "played":
      return withClock(simulator, playClock(simulator.clock, event.realNow));
    case "pauseToggled":
      return withClock(
        simulator,
        simulator.clock.paused
          ? playClock(simulator.clock, event.realNow)
          : pauseClock(simulator.clock, event.realNow),
      );
    case "speedChosen":
      return withClock(
        simulator,
        setClockSpeed(simulator.clock, event.speed, event.realNow),
      );
    case "speedStepped":
      return withClock(
        simulator,
        stepClockSpeed(simulator.clock, event.direction, event.realNow),
      );
    default:
      return assertNever(event);
  }
}

// The clock follows the Alarm from the device state the event produced, so it drops to 1× on
// the firing tick and frees the speed on the second OK. Decided in "Drop the simulation to real
// time while an Alarm sounds", as amended in "Correct the simulator against the real Checkbox".
function followDevice(
  simulator: Simulator,
  event: Event,
  realNow: number,
): Simulator {
  const state = reduce(simulator.state, event);
  const clock = followAlarmSignal(
    simulator.clock,
    isAlarmActive(state),
    realNow,
  );
  return state === simulator.state && clock === simulator.clock
    ? simulator
    : { clock, state };
}

function withClock(simulator: Simulator, clock: SimulationClock): Simulator {
  return clock === simulator.clock ? simulator : { ...simulator, clock };
}

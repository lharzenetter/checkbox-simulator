import { describe, expect, it } from "vitest";
import { isAlarmActive } from "../core/index";
import type { Key } from "../core/index";
import { reduceSimulator, startSimulator } from "./index";
import type { DeviceInput, Simulator, SimulatorEvent } from "./index";

// 12.04.17 11:11:00 local time, as the core expects the Uhrzeit.
const TIME_OF_DAY = Date.UTC(2017, 3, 12, 11, 11, 0);

const HLF_AT_F: DeviceInput = {
  type: "tallyHeld",
  tallyId: "1",
  name: "HLF AT-F",
};
const HLF_AT_M: DeviceInput = {
  type: "tallyHeld",
  tallyId: "2",
  name: "HLF AT-M",
};

function run(
  simulator: Simulator,
  ...events: readonly SimulatorEvent[]
): Simulator {
  return events.reduce(reduceSimulator, simulator);
}

function started(): Simulator {
  return startSimulator({ realNow: 0, uhrzeit: TIME_OF_DAY });
}

function input(event: DeviceInput, realNow = 0): SimulatorEvent {
  return { type: "inputGiven", input: event, realNow };
}

function press(key: Key, realNow = 0): readonly SimulatorEvent[] {
  return [
    input({ type: "keyPressed", key }, realNow),
    input({ type: "keyReleased", key }, realNow),
  ];
}

// Trupp 01 of two, logged in to Anmarsch for 30 min at 300 bar: Alarm 1 fires at 9:54.
function truppInAnmarsch(): Simulator {
  return run(
    started(),
    input(HLF_AT_F),
    ...press("OK"),
    input(HLF_AT_M),
    ...press("OK"),
    ...press("OK"),
  );
}

describe("the simulator", () => {
  it("starts the Checkbox switched off at 1×", () => {
    const simulator = started();
    expect(simulator.state.screen).toBe("aus");
    expect(simulator.clock).toMatchObject({ speed: 1, paused: false });
  });

  it("ticks the device with both clocks as real time passes", () => {
    const simulator = run(
      started(),
      { type: "speedChosen", speed: 10, realNow: 0 },
      { type: "timePassed", realNow: 1_000 },
    );
    expect(simulator.state.now).toBe(TIME_OF_DAY + 10_000);
    expect(simulator.state.realNow).toBe(1_000);
  });

  // decided in "Decide how alarms are presented": paused, the device keys and Tallys do nothing
  it("ignores the Trainee's input while paused", () => {
    const paused = run(started(), { type: "paused", realNow: 0 });
    expect(run(paused, ...press("Check")).state.screen).toBe("aus");
  });

  it("lets a key go while paused, so it is not held on play", () => {
    const held = run(
      truppInAnmarsch(),
      ...press("X"),
      input({ type: "keyPressed", key: "X" }),
      input({ type: "keyPressed", key: "Check" }),
      { type: "paused", realNow: 0 },
      input({ type: "keyReleased", key: "X" }),
      { type: "played", realNow: 0 },
    );
    expect(held.state.notausschaltungKeysHeld).toEqual(["Check"]);
  });

  it("toggles pause", () => {
    const paused = run(started(), { type: "pauseToggled", realNow: 0 });
    expect(paused.clock.paused).toBe(true);
    expect(run(paused, { type: "pauseToggled", realNow: 0 }).clock.paused).toBe(
      false,
    );
  });

  it("steps the speed", () => {
    const simulator = run(started(), {
      type: "speedStepped",
      direction: "faster",
      realNow: 0,
    });
    expect(simulator.clock.speed).toBe(2);
  });

  // decided in "Drop the simulation to real time while an Alarm sounds", point 1; point 5 accepts
  // a late drop, which following on the firing tick avoids
  it("drops to 1× on the tick the Alarm starts", () => {
    const alarm = run(
      truppInAnmarsch(),
      { type: "speedChosen", speed: 10, realNow: 0 },
      { type: "timePassed", realNow: 59_400 },
    );
    expect(isAlarmActive(alarm.state)).toBe(true);
    expect(alarm.clock).toMatchObject({ speed: 1, heldAtRealTime: true });
    const later = run(alarm, { type: "timePassed", realNow: 60_400 });
    expect(later.state.now - alarm.state.now).toBe(1_000);
  });

  // as amended in "Correct the simulator against the real Checkbox": held until the second OK
  it("lets the Trainee choose a speed again right after the second OK", () => {
    const alarm = run(truppInAnmarsch(), {
      type: "timePassed",
      realNow: 594_000,
    });
    const silenced = run(alarm, ...press("OK", 594_000), {
      type: "speedChosen",
      speed: 10,
      realNow: 594_000,
    });
    expect(silenced.clock.speed).toBe(1);
    const ended = run(silenced, ...press("OK", 594_000), {
      type: "speedChosen",
      speed: 10,
      realNow: 594_000,
    });
    expect(ended.clock).toMatchObject({ speed: 10, heldAtRealTime: false });
  });
});

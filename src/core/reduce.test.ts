import { describe, expect, it } from "vitest";
import { abschaltzeitRestMs, createInitialState, reduce } from "./index";
import type { Event, Key, State } from "./index";

const SESSION_START = { now: 1_000_000, realNow: 500 };

function run(state: State, ...events: readonly Event[]): State {
  return events.reduce(reduce, state);
}

function press(key: Key): Event {
  return { type: "keyPressed", key };
}

function tickAfter(state: State, elapsedMs: number): Event {
  return {
    type: "tick",
    now: state.now + elapsedMs,
    realNow: state.realNow + elapsedMs,
  };
}

function poweredOn(): State {
  return run(createInitialState(SESSION_START), press("Check"));
}

describe("powering on", () => {
  it.each<Key>(["Up", "Down", "OK", "X"])(
    "stays switched off when %s is pressed",
    (key) => {
      const aus = createInitialState(SESSION_START);
      expect(reduce(aus, press(key))).toBe(aus);
    },
  );
});

describe("the Startdisplay", () => {
  // decided in "Define the key-by-screen navigation model"
  it.each<Key>(["Up", "Down", "X", "Check"])("ignores %s", (key) => {
    const startdisplay = poweredOn();
    expect(reduce(startdisplay, press(key))).toBe(startdisplay);
  });
});

describe("the Abschaltzeit", () => {
  // timing-and-alarm-rules §9
  it("starts at 25 s on the Startdisplay", () => {
    expect(abschaltzeitRestMs(poweredOn())).toBe(25_000);
  });

  // timing-and-alarm-rules §9.1
  it("counts down on real time only", () => {
    const startdisplay = poweredOn();
    const ticked = reduce(startdisplay, {
      type: "tick",
      now: startdisplay.now + 1_000,
      realNow: startdisplay.realNow + 10_000,
    });
    expect(abschaltzeitRestMs(ticked)).toBe(15_000);
  });

  // manual 5.2
  it("switches the Checkbox to Aus when it runs out", () => {
    const startdisplay = poweredOn();
    const justBefore = run(startdisplay, tickAfter(startdisplay, 24_999));
    expect(justBefore.screen).toBe("startdisplay");
    expect(run(justBefore, tickAfter(justBefore, 1)).screen).toBe("aus");
  });

  // timing-and-alarm-rules §9.1
  it("does not run out on simulated time", () => {
    const startdisplay = poweredOn();
    const ticked = reduce(startdisplay, {
      type: "tick",
      now: startdisplay.now + 60_000,
      realNow: startdisplay.realNow + 1_000,
    });
    expect(ticked.screen).toBe("startdisplay");
  });
});

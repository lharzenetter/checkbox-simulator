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
  it("starts switched off", () => {
    expect(createInitialState(SESSION_START).screen).toBe("aus");
  });

  // manual 5.2
  it("wakes to the Startdisplay when Check is pressed", () => {
    expect(poweredOn().screen).toBe("startdisplay");
  });

  it.each<Key>(["Up", "Down", "OK", "X"])(
    "stays switched off when %s is pressed",
    (key) => {
      const aus = createInitialState(SESSION_START);
      expect(reduce(aus, press(key))).toBe(aus);
    },
  );
});

describe("the Startdisplay", () => {
  // manual 5.2
  it("opens SERVICE on OK", () => {
    expect(run(poweredOn(), press("OK")).screen).toBe("service");
  });

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

  it("restarts when the Startdisplay is re-entered from SERVICE", () => {
    const service = run(poweredOn(), press("OK"));
    const later = run(service, tickAfter(service, 60_000));
    expect(later.screen).toBe("service");
    const startdisplay = run(later, press("X"));
    expect(abschaltzeitRestMs(startdisplay)).toBe(25_000);
  });
});

describe("the SERVICE menu", () => {
  // manual 5.2
  it("returns to the Startdisplay on X", () => {
    expect(run(poweredOn(), press("OK"), press("X")).screen).toBe(
      "startdisplay",
    );
  });

  // decided in "Draw the simulator's scope"
  it.each<Key>(["Up", "Down", "OK", "Check"])(
    "keeps every item inert on %s",
    (key) => {
      const service = run(poweredOn(), press("OK"));
      expect(reduce(service, press(key))).toBe(service);
    },
  );
});

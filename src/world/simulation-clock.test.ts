import { describe, expect, it } from "vitest";
import { readClocks, startSimulationClock } from "./index";

// 12.04.17 11:11:00 local time, as the core expects the Uhrzeit.
const TIME_OF_DAY = Date.UTC(2017, 3, 12, 11, 11, 0);

describe("the simulation clock", () => {
  // decided in "Decide what survives a page reload"
  it("starts the device's Uhrzeit at the real time of day", () => {
    const clock = startSimulationClock({
      realNow: 1234.5,
      uhrzeit: TIME_OF_DAY,
    });
    expect(readClocks(clock, 1234.5)).toEqual({
      now: TIME_OF_DAY,
      realNow: 1235,
    });
  });

  it("runs the Uhrzeit at 1× with real time, in whole milliseconds", () => {
    const clock = startSimulationClock({ realNow: 100, uhrzeit: TIME_OF_DAY });
    expect(readClocks(clock, 10_100.4)).toEqual({
      now: TIME_OF_DAY + 10_000,
      realNow: 10_100,
    });
  });
});

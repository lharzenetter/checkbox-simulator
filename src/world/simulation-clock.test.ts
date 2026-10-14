import { describe, expect, it } from "vitest";
import { abschaltzeitRestMs, createInitialState, reduce } from "../core/index";
import type { Key, State } from "../core/index";
import {
  acceptsDeviceKeys,
  acceptsSpeedChange,
  followAlarmSignal,
  pauseClock,
  playClock,
  readClocks,
  resumeSimulationClock,
  setClockSpeed,
  startSimulationClock,
  stepClockSpeed,
} from "./index";
import type { SimulationClock, Speed } from "./index";

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

  // timing-and-alarm-rules §9.1
  it("runs simulated time ten times faster at 10× while real time keeps its pace", () => {
    const clock = setClockSpeed(
      startSimulationClock({ realNow: 100, uhrzeit: TIME_OF_DAY }),
      10,
      100,
    );
    expect(readClocks(clock, 1_100)).toEqual({
      now: TIME_OF_DAY + 10_000,
      realNow: 1_100,
    });
  });

  it("keeps the time already run when the speed changes", () => {
    const atOnefold = startSimulationClock({
      realNow: 0,
      uhrzeit: TIME_OF_DAY,
    });
    const atTwofold = setClockSpeed(atOnefold, 2, 5_000);
    expect(readClocks(atTwofold, 6_000)).toEqual({
      now: TIME_OF_DAY + 7_000,
      realNow: 6_000,
    });
  });

  // timing-and-alarm-rules §9.1
  it("freezes both clocks while paused", () => {
    const running = startSimulationClock({ realNow: 0, uhrzeit: TIME_OF_DAY });
    const paused = pauseClock(setClockSpeed(running, 10, 0), 1_000);
    expect(readClocks(paused, 61_000)).toEqual({
      now: TIME_OF_DAY + 10_000,
      realNow: 1_000,
    });
  });

  it("resumes at the speed and the time where it was paused", () => {
    const running = startSimulationClock({ realNow: 0, uhrzeit: TIME_OF_DAY });
    const paused = pauseClock(setClockSpeed(running, 5, 0), 1_000);
    const resumed = playClock(paused, 61_000);
    expect(readClocks(resumed, 62_000)).toEqual({
      now: TIME_OF_DAY + 10_000,
      realNow: 2_000,
    });
  });

  it("keeps a speed chosen while paused for when it resumes", () => {
    const running = startSimulationClock({ realNow: 0, uhrzeit: TIME_OF_DAY });
    const paused = setClockSpeed(pauseClock(running, 1_000), 2, 30_000);
    expect(readClocks(paused, 40_000).realNow).toBe(1_000);
    const resumed = playClock(paused, 60_000);
    expect(readClocks(resumed, 61_000)).toEqual({
      now: TIME_OF_DAY + 3_000,
      realNow: 2_000,
    });
  });
});

describe("the resumed simulation clock", () => {
  const SAVED = { now: TIME_OF_DAY + 600_000, realNow: 90_000 };

  // decided in "Decide what survives a page reload": the time the page was closed is frozen
  it("holds both clocks paused where the saved session stopped", () => {
    const clock = resumeSimulationClock({ realNow: 3_000.4, clocks: SAVED });
    expect(clock.paused).toBe(true);
    expect(readClocks(clock, 50_000)).toEqual(SAVED);
  });

  it("runs on from the saved clocks on play, never catching up", () => {
    const clock = resumeSimulationClock({ realNow: 3_000, clocks: SAVED });
    const playing = playClock(clock, 10_000);
    expect(readClocks(playing, 11_000)).toEqual({
      now: SAVED.now + 1_000,
      realNow: SAVED.realNow + 1_000,
    });
  });
});

const FRAME_MS = 100;

// A session driven by a fake real-time reading, ticking the core once per frame.
interface Session {
  readonly realMs: number;
  readonly clock: SimulationClock;
  readonly device: State;
}

function startSession(): Session {
  const clock = startSimulationClock({ realNow: 0, uhrzeit: 1_000_000 });
  return { realMs: 0, clock, device: createInitialState(readClocks(clock, 0)) };
}

function waitReal(session: Session, durationMs: number): Session {
  let { realMs, device } = session;
  const endMs = realMs + durationMs;
  while (realMs < endMs) {
    realMs = Math.min(realMs + FRAME_MS, endMs);
    device = reduce(device, {
      type: "tick",
      ...readClocks(session.clock, realMs),
    });
  }
  return { ...session, realMs, device };
}

function press(session: Session, key: Key): Session {
  if (!acceptsDeviceKeys(session.clock)) {
    return session;
  }
  return {
    ...session,
    device: reduce(session.device, { type: "keyPressed", key }),
  };
}

function runAt(session: Session, speed: Speed): Session {
  return {
    ...session,
    clock: setClockSpeed(session.clock, speed, session.realMs),
  };
}

function pause(session: Session): Session {
  return { ...session, clock: pauseClock(session.clock, session.realMs) };
}

function play(session: Session): Session {
  return { ...session, clock: playClock(session.clock, session.realMs) };
}

// verification-scenarios V23; timing-and-alarm-rules §9.1, §9.2
describe("display timings under the speed control and pause", () => {
  it("switches the Startdisplay to Aus after 25 s real at 10×", () => {
    const startdisplay = press(runAt(startSession(), 10), "Check");
    const justBefore = waitReal(startdisplay, 24_900);
    expect(justBefore.device.screen).toBe("startdisplay");
    expect(waitReal(justBefore, 100).device.screen).toBe("aus");
  });

  it("runs the Uhrzeit ten times faster at 10×", () => {
    const session = runAt(startSession(), 10);
    const later = waitReal(session, 15_000);
    expect(later.device.now - session.device.now).toBe(150_000);
  });

  it("freezes the Startdisplay's Abschaltzeit while paused", () => {
    const startdisplay = waitReal(press(startSession(), "Check"), 5_000);
    const paused = waitReal(pause(startdisplay), 60_000);
    expect(paused.device.screen).toBe("startdisplay");
    expect(paused.device.now).toBe(startdisplay.device.now);
    expect(abschaltzeitRestMs(paused.device)).toBe(20_000);
  });

  // decided in "Decide how alarms are presented"
  it("ignores device keys while paused", () => {
    const paused = pause(startSession());
    expect(press(paused, "Check").device.screen).toBe("aus");
  });

  it("resumes the Abschaltzeit where it stopped on play", () => {
    const startdisplay = waitReal(press(startSession(), "Check"), 5_000);
    const resumed = play(waitReal(pause(startdisplay), 60_000));
    expect(press(resumed, "OK").device.screen).toBe("service");
    const later = waitReal(resumed, 19_900);
    expect(later.device.screen).toBe("startdisplay");
    expect(waitReal(later, 100).device.screen).toBe("aus");
  });

  it.todo(
    "returns from the Trupp-Ansicht to the Einsatzliste after 15 s real at 10×",
  );
  it.todo("alternates SICHER and the status glyph once per real second at 10×");
  it.todo("opens the Notausschaltung after X + Check held 4 s real at 10×");
  it.todo(
    "keeps the Restzeit and fires no Alarm on the Trupp-Ansicht while paused",
  );
  it.todo(
    "silences the siren and holds the LED while paused, resuming both on play",
  );
});

function runningAt(speed: Speed): SimulationClock {
  return setClockSpeed(
    startSimulationClock({ realNow: 0, uhrzeit: 0 }),
    speed,
    0,
  );
}

// decided in "Design how the Trainee handles Tallys and the clock"
describe("stepping the simulation speed", () => {
  it.each<[Speed, Speed]>([
    [1, 2],
    [2, 5],
    [5, 10],
  ])("speeds %d× up to %d×", (from, to) => {
    expect(stepClockSpeed(runningAt(from), "faster", 1_000).speed).toBe(to);
  });

  it.each<[Speed, Speed]>([
    [10, 5],
    [5, 2],
    [2, 1],
  ])("slows %d× down to %d×", (from, to) => {
    expect(stepClockSpeed(runningAt(from), "slower", 1_000).speed).toBe(to);
  });

  it("stops at 10× and at 1×", () => {
    expect(stepClockSpeed(runningAt(10), "faster", 1_000).speed).toBe(10);
    expect(stepClockSpeed(runningAt(1), "slower", 1_000).speed).toBe(1);
  });

  it("keeps the simulated time already run when the speed changes", () => {
    const stepped = stepClockSpeed(runningAt(2), "faster", 1_000);
    expect(stepped).toEqual(setClockSpeed(runningAt(2), 5, 1_000));
  });

  it("leaves the speed alone while paused", () => {
    const paused = pauseClock(runningAt(2), 1_000);
    expect(stepClockSpeed(paused, "faster", 2_000)).toBe(paused);
  });
});

// decided in "Drop the simulation to real time while an Alarm sounds"
describe("the simulation clock while an Alarm sounds", () => {
  it("drops to 1× when the signal starts, keeping the time already run", () => {
    const held = followAlarmSignal(runningAt(10), true, 1_000);
    expect(held.speed).toBe(1);
    expect(readClocks(held, 2_000)).toEqual({ now: 11_000, realNow: 2_000 });
  });

  it("keeps 1× while the signal runs, whatever speed is chosen", () => {
    const held = followAlarmSignal(runningAt(10), true, 1_000);
    expect(setClockSpeed(held, 10, 2_000).speed).toBe(1);
    expect(stepClockSpeed(held, "faster", 2_000).speed).toBe(1);
    expect(acceptsSpeedChange(held)).toBe(false);
  });

  it("stays at 1× once the signal stops, letting the Trainee choose again", () => {
    const held = followAlarmSignal(runningAt(10), true, 1_000);
    const released = followAlarmSignal(held, false, 2_000);
    expect(released.speed).toBe(1);
    expect(acceptsSpeedChange(released)).toBe(true);
    expect(setClockSpeed(released, 5, 3_000).speed).toBe(5);
  });

  it("is still held at 1× when play resumes during the signal", () => {
    const held = followAlarmSignal(runningAt(10), true, 1_000);
    const resumed = playClock(pauseClock(held, 2_000), 5_000);
    expect(resumed.speed).toBe(1);
    expect(acceptsSpeedChange(resumed)).toBe(false);
  });
});

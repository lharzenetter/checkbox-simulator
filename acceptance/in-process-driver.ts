import {
  createInitialState,
  FACTORY_FEUERWEHRNAME,
  isAlarmActive,
  isAlarmSounding,
  reduce,
} from "../src/core/index";
import type { Event, Key, State } from "../src/core/index";
import { screenModel, screenText } from "../src/lcd/index";
import {
  acceptsDeviceKeys,
  DEFAULT_FAHRZEUGE,
  followAlarmSignal,
  pauseClock,
  playClock,
  readClocks,
  rosterTallys,
  setClockSpeed,
  startSimulationClock,
  tallyHeld,
} from "../src/world/index";
import type { SimulationClock } from "../src/world/index";
import type { Span, LineSeen, TallyName, Window } from "./window";

// Real time between two ticks: a few animation frames, short enough that every Alarmgrenze
// fires on the tick that reaches it, at whole seconds even at 10×.
const TICK_MS = 50;

// Any fixed Uhrzeit keeps the scenarios repeatable: 12.04.17 11:11:00, as in the Startdisplay
// figure of manual 5.2.
const START_UHRZEIT = Date.UTC(2017, 3, 12, 11, 11, 0);

interface Simulator {
  readonly realMs: number;
  readonly clock: SimulationClock;
  readonly state: State;
}

/**
 * A fresh simulator run in-process through `core`, `world` and the LCD screen model: first-launch
 * defaults accepted, the default Roster, Checkbox off. Decided in "State use cases as acceptance
 * scenarios with swappable drivers", points 2 and 7.
 */
export function inProcessWindow(): Window {
  const clock = startSimulationClock({ realNow: 0, uhrzeit: START_UHRZEIT });
  let simulator: Simulator = {
    realMs: 0,
    clock,
    state: createInitialState(readClocks(clock, 0)),
  };

  // Like the UI, the clock follows the Alarm the device state shows; decided in "Drop the
  // simulation to real time while an Alarm sounds".
  function dispatch(event: Event): void {
    const state = reduce(simulator.state, event);
    simulator = {
      ...simulator,
      state,
      clock: followAlarmSignal(
        simulator.clock,
        isAlarmActive(state),
        simulator.realMs,
      ),
    };
  }

  // While paused the device keys and Tallys do nothing, but a release always gets through.
  function dispatchFromTrainee(event: Event): void {
    if (event.type === "keyReleased" || acceptsDeviceKeys(simulator.clock)) {
      dispatch(event);
    }
  }

  function letTimePass(span: Span): void {
    const endMs = simulator.realMs + spanMs(span);
    while (simulator.realMs < endMs) {
      const realMs = Math.min(simulator.realMs + TICK_MS, endMs);
      simulator = { ...simulator, realMs };
      dispatch({ type: "tick", ...readClocks(simulator.clock, realMs) });
    }
  }

  function updateClock(
    update: (clock: SimulationClock, realNow: number) => SimulationClock,
  ): void {
    simulator = {
      ...simulator,
      clock: update(simulator.clock, simulator.realMs),
    };
  }

  function lcdLines(): readonly string[] {
    return screenText(screenModel(simulator.state, FACTORY_FEUERWEHRNAME));
  }

  return {
    trainee: {
      press: (key: Key) =>
        step(() => {
          dispatchFromTrainee({ type: "keyPressed", key });
          dispatchFromTrainee({ type: "keyReleased", key });
        }),
      hold: (key: Key, span: Span) =>
        step(() => {
          dispatchFromTrainee({ type: "keyPressed", key });
          letTimePass(span);
          dispatchFromTrainee({ type: "keyReleased", key });
        }),
      holdTally: (tally: TallyName) =>
        step(() => {
          dispatchFromTrainee(tallyEvent(tally));
        }),
      setSpeed: (speed) =>
        step(() => {
          updateClock((clock, realNow) => setClockSpeed(clock, speed, realNow));
        }),
      pause: () =>
        step(() => {
          updateClock(pauseClock);
        }),
      play: () =>
        step(() => {
          updateClock(playClock);
        }),
    },
    see: {
      lcd: () => ({
        reads: (lines) =>
          step(() => {
            expectLcdReads(lcdLines(), lines);
          }),
        shows: (line) =>
          step(() => {
            expectLcdShows(lcdLines(), line);
          }),
        isOff: () =>
          step(() => {
            expectLcdReads(lcdLines(), []);
          }),
      }),
      alarmLed: () => ({
        isBlinking: () =>
          step(() => {
            expectAlarmLed(isAlarmSounding(simulator.state), true);
          }),
        isOff: () =>
          step(() => {
            expectAlarmLed(isAlarmSounding(simulator.state), false);
          }),
      }),
    },
    time: {
      passes: (span) =>
        step(() => {
          letTimePass(span);
        }),
    },
  };
}

// Async though everything here is synchronous, so a Playwright driver can sit behind the same
// Window; a failing observation rejects rather than throws.
function step(run: () => void): Promise<void> {
  return new Promise((resolve) => {
    run();
    resolve();
  });
}

function spanMs({ minutes = 0, seconds = 0 }: Span): number {
  return (minutes * 60 + seconds) * 1000;
}

function tallyEvent({ fahrzeug, role }: TallyName): Event {
  const named = DEFAULT_FAHRZEUGE.find(
    (candidate) => candidate.kurzname === fahrzeug,
  );
  const tally = rosterTallys(DEFAULT_FAHRZEUGE).find(
    (candidate) =>
      candidate.fahrzeugId === named?.id && candidate.role === role,
  );
  if (named === undefined || tally === undefined) {
    throw new Error(`The Roster has no Tally ${fahrzeug} ${role}`);
  }
  return tallyHeld(tally, DEFAULT_FAHRZEUGE);
}

function matches(text: string, line: LineSeen): boolean {
  return typeof line === "string" ? text === line : line.test(text);
}

function describeLcd(lines: readonly LineSeen[]): string {
  return lines.length === 0
    ? "Display aus"
    : lines.map((line) => `  ${String(line)}`).join("\n");
}

function expectLcdReads(
  shown: readonly string[],
  expected: readonly LineSeen[],
): void {
  const same =
    shown.length === expected.length &&
    expected.every((line, index) => matches(shown[index] ?? "", line));
  if (!same) {
    throw new Error(
      `The LCD read:\n${describeLcd(shown)}\ninstead of:\n${describeLcd(expected)}`,
    );
  }
}

function expectLcdShows(shown: readonly string[], line: LineSeen): void {
  if (!shown.some((text) => matches(text, line))) {
    throw new Error(
      `The LCD showed no line ${String(line)}; it read:\n${describeLcd(shown)}`,
    );
  }
}

function expectAlarmLed(blinking: boolean, expected: boolean): void {
  if (blinking !== expected) {
    throw new Error(
      blinking
        ? "The Alarm-LED was blinking, not off"
        : "The Alarm-LED was off, not blinking",
    );
  }
}

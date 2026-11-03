import { FACTORY_FEUERWEHRNAME, isAlarmSounding } from "../src/core/index";
import type { Key } from "../src/core/index";
import { screenModel, screenText } from "../src/lcd/index";
import {
  DEFAULT_FAHRZEUGE,
  reduceSimulator,
  rosterTallys,
  startSimulator,
  tallyHeld,
} from "../src/world/index";
import type { DeviceInput, SimulatorEvent } from "../src/world/index";
import type { Span, LineSeen, TallyName, Window } from "./window";

// Real time between two ticks: a few animation frames, short enough that every Alarmgrenze
// fires on the tick that reaches it, at whole seconds even at 10×.
const TICK_MS = 50;

// Any fixed Uhrzeit keeps the scenarios repeatable: 12.04.17 11:11:00, as in the Startdisplay
// figure of manual 5.2.
const START_UHRZEIT = Date.UTC(2017, 3, 12, 11, 11, 0);

/**
 * A fresh simulator run in-process through `core`, `world` and the LCD screen model: first-launch
 * defaults accepted, the default Roster, Checkbox off. Decided in "State use cases as acceptance
 * scenarios with swappable drivers", points 2 and 7.
 */
export function inProcessWindow(): Window {
  let realMs = 0;
  let simulator = startSimulator({ realNow: realMs, uhrzeit: START_UHRZEIT });

  // The same reducer the UI's useSimulator runs, so the pause and the drop to real time are not
  // restated here.
  function dispatch(event: SimulatorEvent): void {
    simulator = reduceSimulator(simulator, event);
  }

  function give(input: DeviceInput): void {
    dispatch({ type: "inputGiven", input, realNow: realMs });
  }

  function letTimePass(span: Span): void {
    const endMs = realMs + spanMs(span);
    while (realMs < endMs) {
      realMs = Math.min(realMs + TICK_MS, endMs);
      dispatch({ type: "timePassed", realNow: realMs });
    }
  }

  function lcdLines(): readonly string[] {
    return screenText(screenModel(simulator.state, FACTORY_FEUERWEHRNAME));
  }

  return {
    trainee: {
      press: (key: Key) =>
        step(() => {
          give({ type: "keyPressed", key });
          give({ type: "keyReleased", key });
        }),
      hold: (key: Key, span: Span) =>
        step(() => {
          give({ type: "keyPressed", key });
          letTimePass(span);
          give({ type: "keyReleased", key });
        }),
      holdTally: (tally: TallyName) =>
        step(() => {
          give(tallyEvent(tally));
        }),
      setSpeed: (speed) =>
        step(() => {
          dispatch({ type: "speedChosen", speed, realNow: realMs });
        }),
      pause: () =>
        step(() => {
          dispatch({ type: "paused", realNow: realMs });
        }),
      play: () =>
        step(() => {
          dispatch({ type: "played", realNow: realMs });
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

function tallyEvent({ fahrzeug, role }: TallyName): DeviceInput {
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

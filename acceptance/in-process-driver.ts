import { FACTORY_FEUERWEHRNAME, isAlarmSounding } from "../src/core/index";
import type { Key } from "../src/core/index";
import { screenModel, screenText } from "../src/lcd/index";
import {
  DEFAULT_FAHRZEUGE,
  reduceSimulator,
  startSimulator,
  tallyHeld,
} from "../src/world/index";
import type { DeviceInput, SimulatorEvent } from "../src/world/index";
import {
  expectAlarmLed,
  expectLcdReads,
  expectLcdShows,
  rosterTally,
  spanMs,
  START_UHRZEIT,
  TICK_MS,
} from "./drivers";
import type { Span, TallyName, Window } from "./window";

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
          give(tallyHeld(rosterTally(tally), DEFAULT_FAHRZEUGE));
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

// Async though everything here is synchronous, so the Playwright driver sits behind the same
// Window; a failing observation rejects rather than throws.
function step(run: () => void): Promise<void> {
  return new Promise((resolve) => {
    run();
    resolve();
  });
}

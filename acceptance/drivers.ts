import { DEFAULT_FAHRZEUGE, rosterTallys } from "../src/world/index";
import type { RosterTally } from "../src/world/index";
import type { LineSeen, Span, TallyName } from "./window";

// What every driver shares, so a scenario passes or fails the same way on each.

/**
 * Real time between two ticks: a few animation frames, short enough that every Alarmgrenze
 * fires on the tick that reaches it, at whole seconds even at 10×. The Playwright driver moves
 * `page.clock` in the same steps, so both drivers tick alike.
 */
export const TICK_MS = 50;

/**
 * Any fixed Uhrzeit keeps the scenarios repeatable: 12.04.17 11:11:00, as in the Startdisplay
 * figure of manual 5.2, in the core's convention of local time counted as if it were UTC.
 */
export const START_UHRZEIT = Date.UTC(2017, 3, 12, 11, 11, 0);

/** A span in milliseconds. */
export function spanMs({ minutes = 0, seconds = 0 }: Span): number {
  return (minutes * 60 + seconds) * 1000;
}

/** The default Roster's Tally of this Kurzname and Role. */
export function rosterTally({ fahrzeug, role }: TallyName): RosterTally {
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
  return tally;
}

function matches(text: string, line: LineSeen): boolean {
  return typeof line === "string" ? text === line : line.test(text);
}

function describeLcd(lines: readonly LineSeen[]): string {
  return lines.length === 0
    ? "Display aus"
    : lines.map((line) => `  ${String(line)}`).join("\n");
}

/** Throws unless the LCD shows exactly these lines; no lines is "Display aus". */
export function expectLcdReads(
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

/** Throws unless one of the LCD's lines is this one. */
export function expectLcdShows(shown: readonly string[], line: LineSeen): void {
  if (!shown.some((text) => matches(text, line))) {
    throw new Error(
      `The LCD showed no line ${String(line)}; it read:\n${describeLcd(shown)}`,
    );
  }
}

/** Throws unless the Alarm-LED blinks as expected. */
export function expectAlarmLed(blinking: boolean, expected: boolean): void {
  if (blinking !== expected) {
    throw new Error(
      blinking
        ? "The Alarm-LED was blinking, not off"
        : "The Alarm-LED was off, not blinking",
    );
  }
}

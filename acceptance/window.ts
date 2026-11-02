import type { Key } from "../src/core/index";
import type { Role, Speed } from "../src/world/index";

// Every call is async so a Playwright driver can sit behind the same interface; decided in
// "State use cases as acceptance scenarios with swappable drivers", point 9.

/** A Roster Tally as the Trainee reads it on the Roster: its Fahrzeug's Kurzname and its Role. */
export interface TallyName {
  readonly fahrzeug: string;
  readonly role: Role;
}

/** A stretch of real time, as the Trainee waits it out. */
export interface Span {
  readonly minutes?: number;
  readonly seconds?: number;
}

/** What the Trainee does with their hands: the Keys, the Tallys and the clock controls. */
export interface Trainee {
  /** Presses a Key on the front panel ("Taste OK") and lets go at once. */
  press(key: Key): Promise<void>;
  /** Keeps a Key on the front panel pressed while `span` of real time passes, then lets go. */
  hold(key: Key, span: Span): Promise<void>;
  /** Holds a Tally of the Roster to Check. */
  holdTally(tally: TallyName): Promise<void>;
  /** Picks a speed preset ("10×") on the clock controls. */
  setSpeed(speed: Speed): Promise<void>;
  /** "Pause" on the clock controls. */
  pause(): Promise<void>;
  /** "Weiter" on the clock controls. */
  play(): Promise<void>;
}

/** One expected LCD line: the exact text, or a pattern it matches. */
export type LineSeen = string | RegExp;

/** The LCD, read as text line by line, without its graphics. */
export interface LcdSeen {
  /** Exact and in order: every line the LCD shows. */
  reads(lines: readonly LineSeen[]): Promise<void>;
  /** One of the lines the LCD shows. */
  shows(line: LineSeen): Promise<void>;
  /** The LCD is dark: "Display aus". */
  isOff(): Promise<void>;
}

/** The red Alarm-LED, which blinks in step with the siren. */
export interface AlarmLedSeen {
  /** "Alarm-LED blinkt". */
  isBlinking(): Promise<void>;
  /** "Alarm-LED aus". */
  isOff(): Promise<void>;
}

/** What the Trainee sees: the LCD and the Alarm-LED. Nothing here returns the device's state. */
export interface See {
  /** The LCD on the front panel, labelled with its text lines or "Display aus". */
  lcd(): LcdSeen;
  /** The red LED on the front panel. */
  alarmLed(): AlarmLedSeen;
}

/** The time the Trainee lets pass. */
export interface Time {
  /**
   * Real time passes; simulated time follows the simulation clock at its speed, or not at all
   * while paused.
   */
  passes(span: Span): Promise<void>;
}

/** The simulator as one Trainee uses it, fresh for each scenario. */
export interface Window {
  /** The Trainee's hands on the front panel, the Roster and the clock controls. */
  readonly trainee: Trainee;
  /** The Trainee's eyes on the front panel. */
  readonly see: See;
  /** The wall clock the Trainee waits on. */
  readonly time: Time;
}

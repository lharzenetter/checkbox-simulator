import type { Key } from "../src/core/index";
import type { TallyName, Window } from "./window";

/** Wakes the Checkbox from Aus to the Startdisplay with Check; manual 5.2. */
export async function powerOn({ trainee }: Window): Promise<void> {
  await trainee.press("Check");
}

/**
 * Opens the Einsatzprotokoll screen from Aus: Check wakes the Startdisplay, OK opens SERVICE with
 * the bar on `Einsatzprotokoll`, and OK opens it. Manual 5.10.
 */
export async function openEinsatzprotokoll(window: Window): Promise<void> {
  await powerOn(window);
  await window.trainee.press("OK");
  await window.trainee.press("OK");
}

/** The Anmeldefenster's choices that log a Trupp in, as the LCD shows them. Manual 5.3. */
export type Anmeldeaktion =
  "Trupp OK Einsatz" | "Trupp OK Bereitschaft" | "Sicherheitstrupp OK";

/** How `logIn` logs a Trupp in; each option left out takes its default. */
export interface LogInOptions {
  /** The Anmeldefenster's choice; `Trupp OK Einsatz` by default. */
  readonly anmeldeaktion?: Anmeldeaktion;
  /** The Einsatzzeit in minutes, one of Einsatzzeit wählen's three; 30 by default. */
  readonly einsatzzeitMinutes?: 30 | 20 | 180;
  /** The Anfangsdruck, in 5 bar steps from the cylinder's 300 bar; 300 by default. */
  readonly anfangsdruckBar?: number;
}

// The real-device photo einsatzzeit-waehlen.jpeg: 30, 20 and 180 min, the cursor on 30 min;
// ASSUMPTION in reduce.ts: the cursor wraps. Manual 5.3 step 5: 20 and 180 min ask a second OK.
const EINSATZZEIT_KEYS: Readonly<Record<30 | 20 | 180, readonly Key[]>> = {
  30: [],
  20: ["Down", "OK"],
  180: ["Up", "OK"],
};

// manual 5.3, Anmeldefenster figure: the cursor starts on `Trupp OK Einsatz`
const ANMELDEAKTION_DOWNS: Readonly<Record<Anmeldeaktion, number>> = {
  "Trupp OK Einsatz": 0,
  "Trupp OK Bereitschaft": 1,
  "Sicherheitstrupp OK": 2,
};

// manual 5.3, S06 figure; parameter [76]: the editor opens at 300 bar and steps 5 bar a key
const FLASCHE_BAR = 300;
const DRUCK_STEP_BAR = 5;

/**
 * Logs a Trupp of these Tallys in, ending on its Trupp-Ansicht: the first Tally opens Einsatzzeit
 * wählen, OK takes the Einsatzzeit, the others join on the Anmeldefenster, OK on the
 * Anmeldeaktion and OK on the Anfangsdruck. By default to Anmarsch for 30 min at the cylinder's
 * 300 bar. Manual 5.3.
 */
export async function logIn(
  { trainee }: Window,
  [first, ...others]: readonly [TallyName, ...TallyName[]],
  {
    anmeldeaktion = "Trupp OK Einsatz",
    einsatzzeitMinutes = 30,
    anfangsdruckBar = FLASCHE_BAR,
  }: LogInOptions = {},
): Promise<void> {
  await trainee.holdTally(first);
  for (const key of EINSATZZEIT_KEYS[einsatzzeitMinutes]) {
    await trainee.press(key);
  }
  await trainee.press("OK");
  for (const tally of others) {
    await trainee.holdTally(tally);
  }
  for (let down = 0; down < ANMELDEAKTION_DOWNS[anmeldeaktion]; down++) {
    await trainee.press("Down");
  }
  await trainee.press("OK");
  const steps = (anfangsdruckBar - FLASCHE_BAR) / DRUCK_STEP_BAR;
  for (let step = 0; step < Math.abs(steps); step++) {
    await trainee.press(steps > 0 ? "Up" : "Down");
  }
  await trainee.press("OK");
}

/**
 * Logs a Trupp off: each of its Atemschutzträger holds their Tally to Check, which marks them on
 * ABMELDEN, and OK logs the Trupp off. Pass every Atemschutzträger of the Trupp; with one missing,
 * OK leaves the Trupp on ABMELDEN. Manual 5.8.
 */
export async function logOff(
  { trainee }: Window,
  atemschutztraeger: readonly [TallyName, ...TallyName[]],
): Promise<void> {
  for (const tally of atemschutztraeger) {
    await trainee.holdTally(tally);
  }
  await trainee.press("OK");
}

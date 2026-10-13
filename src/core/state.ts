/** The LCD screen the Checkbox is showing; ids from the LCD screen catalogue. */
export type Screen =
  | "aus"
  | "startdisplay"
  | "service"
  | "einsatzzeitWaehlen"
  | "anmeldefenster"
  | "anfangsdruckEditor"
  /** The Flaschendruck editor `Esz-Zeit ändern`, opened by `Druck ändern` on the Anmeldefenster. */
  | "flaschendruckAendern"
  | "einsatzliste"
  /** S13 Trupp ABMELDEN. */
  | "abmelden";

/** An Atemschutzträger as the Checkbox knows them: by their Tally and the name stored on it. */
export interface Atemschutztraeger {
  readonly tallyId: string;
  readonly name: string;
}

/** The Einsatzstatus values simulated so far. */
export type Einsatzstatus = "bereitschaft" | "anmarsch";

/** A logged-in Trupp. */
export interface Trupp {
  readonly truppnummer: number;
  readonly einsatzzeitMs: number;
  readonly atemschutztraeger: readonly Atemschutztraeger[];
  readonly einsatzstatus: Einsatzstatus;
  readonly sicherheitstrupp: boolean;
  /** Negative once the Einsatzzeit is exceeded. */
  readonly restzeitMs: number;
  /** The Uhrzeit at login. */
  readonly einsatzVonMs: number;
}

/** The record of one Trupp's Einsatz, written at logoff. */
export interface Einsatzprotokoll {
  readonly truppnummer: number;
  readonly einsatzzeitMs: number;
  readonly atemschutztraeger: readonly Atemschutztraeger[];
  /** The Einsatzstatus at logoff. */
  readonly einsatzstatus: Einsatzstatus;
  readonly sicherheitstrupp: boolean;
  readonly einsatzVonMs: number;
  /** The Uhrzeit at logoff. */
  readonly einsatzBisMs: number;
}

/** The Anmeldefenster's choices, top to bottom. */
export type Anmeldeaktion =
  | "truppOkEinsatz"
  | "truppOkBereitschaft"
  | "sicherheitstruppOk"
  | "flaschendruckAendern";

/** A Trupp being logged in, from Einsatzzeit wählen to the Anfangsdruck editor (S06). */
export interface Login {
  readonly truppnummer: number;
  /** The Einsatzzeit chosen, or under the cursor on Einsatzzeit wählen. */
  readonly einsatzzeitMs: number;
  /** Einsatzzeit wählen asks `Langzeiteinsatz? OK` before the Anmeldefenster opens. */
  readonly awaitingLangzeiteinsatzOk: boolean;
  readonly atemschutztraeger: readonly Atemschutztraeger[];
  /** The Anmeldefenster's choice under the cursor. */
  readonly anmeldeaktion: Anmeldeaktion;
  /** The Anfangsdruck editor's current value; `Druck ändern` sets it in advance. */
  readonly anfangsdruckBar: number;
  /** The value being edited on `Esz-Zeit ändern`; `null` on every other screen. */
  readonly draftFlaschendruckBar: number | null;
}

/** A Trupp being logged off on ABMELDEN. */
export interface Abmeldung {
  readonly truppnummer: number;
  /** The Atemschutzträger who have held their Tally to Check, in that order. */
  readonly markierteTallyIds: readonly string[];
}

/** The whole device state: plain immutable data that serialises to storage as-is. */
export interface State {
  readonly screen: Screen;
  /** Simulated time of the last `tick`, see {@link Clocks}. */
  readonly now: number;
  /** Real time of the last `tick`, see {@link Clocks}. */
  readonly realNow: number;
  /** Real time at which the current screen was entered; drives the display timings. */
  readonly screenEnteredRealMs: number;
  readonly login: Login | null;
  readonly abmeldung: Abmeldung | null;
  /** The logged-in Trupps, ordered by Truppnummer. */
  readonly trupps: readonly Trupp[];
  /** The Truppnummer marked on the Einsatzliste. */
  readonly selectedTruppnummer: number | null;
  /** The device memory's Einsatzprotokolle, oldest first. */
  readonly einsatzprotokolle: readonly Einsatzprotokoll[];
}

/**
 * The two clocks every `tick` carries, in integer milliseconds.
 *
 * `now` is simulated time, scaled by the speed control, and is the device's Uhrzeit: wall-clock
 * milliseconds since 1970-01-01 00:00 **local** time, so it can be shown without time zones.
 * `realNow` is real time from any monotonic origin and drives only the display timings.
 */
export interface Clocks {
  readonly now: number;
  readonly realNow: number;
}

/** The Checkbox as it is when a new session begins: switched off. */
export function createInitialState({ now, realNow }: Clocks): State {
  return {
    screen: "aus",
    now,
    realNow,
    screenEnteredRealMs: realNow,
    login: null,
    abmeldung: null,
    trupps: [],
    selectedTruppnummer: null,
    einsatzprotokolle: [],
  };
}

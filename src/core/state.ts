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
  /** S11, showing the selected Trupp. */
  | "truppAnsicht"
  /** S09, for the selected Trupp. */
  | "truppMenue"
  /**
   * The Flaschendruck editor opened from the Trupp-Menü by `Druck ändern`, `Einsatzziel erreicht`
   * or `Rückzug antreten`; the Trupp-Menü's item says which.
   */
  | "truppFlaschendruckAendern"
  /** S13 Trupp ABMELDEN. */
  | "abmelden"
  /** S12 Trupp ALARM, for the Trupp whose Alarm is pending first. */
  | "alarm"
  /** S14 Notausschaltung – Auswahl. */
  | "notausschaltungAuswahl"
  /** S15 Notausschaltung – Bestätigung, for the choice made on S14. */
  | "notausschaltungBestaetigung";

/** An Atemschutzträger as the Checkbox knows them: by their Tally and the name stored on it. */
export interface Atemschutztraeger {
  readonly tallyId: string;
  readonly name: string;
}

export type Einsatzstatus =
  "bereitschaft" | "anmarsch" | "einsatzzielErreicht" | "rueckmarsch";

/** A logged-in Trupp. */
export interface Trupp {
  readonly truppnummer: number;
  readonly einsatzzeitMs: number;
  readonly atemschutztraeger: readonly Atemschutztraeger[];
  readonly einsatzstatus: Einsatzstatus;
  readonly sicherheitstrupp: boolean;
  /** Negative once the Einsatzzeit is exceeded. */
  readonly restzeitMs: number;
  /** Simulated time the Einsatz has run, Bereitschaft excluded: `t_run`, timing-and-alarm-rules. */
  readonly runningTimeMs: number;
  /** The running time at which the current Anmarsch began. */
  readonly anmarschBeganAtRunningTimeMs: number;
  /** Simulated time since the Trupp entered its current Bereitschaft; 0 outside Bereitschaft. */
  readonly timeInBereitschaftMs: number;
  /** `t_A` of the current Anmarsch, once it reported Einsatzziel erreicht; `null` before. */
  readonly anmarschzeitMs: number | null;
  /** Whether the Rückzugsalarm of the current Anmarsch leg is still to fire. */
  readonly rueckzugsalarmArmed: boolean;
  readonly loggedInAtMs: number;
}

/** The record of one Trupp's Einsatz, written at logoff. */
export interface Einsatzprotokoll {
  readonly truppnummer: number;
  readonly einsatzzeitMs: number;
  readonly atemschutztraeger: readonly Atemschutztraeger[];
  /** The Einsatzstatus at logoff. */
  readonly einsatzstatus: Einsatzstatus;
  readonly sicherheitstrupp: boolean;
  readonly loggedInAtMs: number;
  readonly loggedOffAtMs: number;
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
  /** Real time at which the login Daueralarm started; `null` while it is silent. */
  readonly daueralarmSinceRealMs: number | null;
}

/** A Trupp being logged off on ABMELDEN. */
export interface Logoff {
  readonly truppnummer: number;
  /** The Atemschutzträger who have held their Tally to Check, in that order. */
  readonly markedTallyIds: readonly string[];
  /** Real time at which the logoff Daueralarm started; `null` while it is silent. */
  readonly daueralarmSinceRealMs: number | null;
}

/** The Trupp-Menü's items. */
export type TruppMenueAktion =
  | "truppEinsatz"
  | "truppBereitschaft"
  | "einsatzzielErreicht"
  | "rueckzugAntreten"
  | "flaschendruckAendern"
  | "attributeEintragen";

/** The Trupp-Menü open for the selected Trupp, and the editors it opens. */
export interface TruppMenue {
  /** The item under the cursor, and the one that opened the Flaschendruck editor. */
  readonly aktion: TruppMenueAktion;
  /** The value being edited in the Flaschendruck editor; `null` on the Trupp-Menü. */
  readonly draftFlaschendruckBar: number | null;
}

/** The choices of Notausschaltung – Auswahl, top to bottom. */
export type NotausschaltungAktion =
  "markierterTrupp" | "alleTrupps" | "zurueck";

/** The whole device state: plain immutable data that serialises to storage as-is. */
export interface State {
  readonly screen: Screen;
  /** Simulated time of the last `tick`, see {@link Clocks}. */
  readonly now: number;
  /** Real time of the last `tick`, see {@link Clocks}. */
  readonly realNow: number;
  /** Real time at which the current screen was entered; drives the display timings. */
  readonly screenEnteredRealMs: number;
  /** Real time of the last screen change or key press there; drives the [13] timeout. */
  readonly idleSinceRealMs: number;
  readonly login: Login | null;
  readonly logoff: Logoff | null;
  readonly truppMenue: TruppMenue | null;
  /** The logged-in Trupps, ordered by Truppnummer. */
  readonly trupps: readonly Trupp[];
  /** The Truppnummer marked on the Einsatzliste. */
  readonly selectedTruppnummer: number | null;
  /** The device memory's Einsatzprotokolle, oldest first. */
  readonly einsatzprotokolle: readonly Einsatzprotokoll[];
  /** The Truppnummern with an Alarm waiting for OK, in firing order. */
  readonly pendingAlarms: readonly number[];
  /** The screen S12 took over from, shown again after the last OK; `null` for the Einsatzliste. */
  readonly interruptedScreen: Screen | null;
  /** Of X and Check, those held down since they were pressed on the Einsatzliste. */
  readonly notausschaltungKeysHeld: readonly ("X" | "Check")[];
  /** Real time since X and Check are held together on the Einsatzliste; `null` while they are not. */
  readonly notausschaltungHeldSinceRealMs: number | null;
  /** The choice under the cursor on S14, and the one S15 confirms; `null` on every other screen. */
  readonly notausschaltung: NotausschaltungAktion | null;
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

/**
 * The Checkbox as it is when a new session begins: switched off, with the Einsatzprotokolle its
 * device memory kept from earlier sessions.
 */
export function createInitialState(
  { now, realNow }: Clocks,
  einsatzprotokolle: readonly Einsatzprotokoll[] = [],
): State {
  return {
    screen: "aus",
    now,
    realNow,
    screenEnteredRealMs: realNow,
    idleSinceRealMs: realNow,
    login: null,
    logoff: null,
    truppMenue: null,
    trupps: [],
    selectedTruppnummer: null,
    einsatzprotokolle,
    pendingAlarms: [],
    interruptedScreen: null,
    notausschaltungKeysHeld: [],
    notausschaltungHeldSinceRealMs: null,
    notausschaltung: null,
  };
}

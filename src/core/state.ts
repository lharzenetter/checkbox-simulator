/** The LCD screen the Checkbox is showing; ids from the LCD screen catalogue. */
export type Screen =
  | "aus"
  | "startdisplay"
  | "service"
  /** S16, the stored Einsatzprotokolle opened from SERVICE. */
  | "einsatzprotokoll"
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
  /** The Flaschendruck entered at login: `P_0`, timing-and-alarm-rules. */
  readonly anfangsdruckBar: number;
  /** Simulated time the Einsatz has run, Bereitschaft excluded: `t_run`, timing-and-alarm-rules. */
  readonly runningTimeMs: number;
  /** Simulated time since the Trupp entered its current Bereitschaft; 0 outside Bereitschaft. */
  readonly timeInBereitschaftMs: number;
  /**
   * The Einsatzstatus the Trupp left for its current Bereitschaft; `null` outside Bereitschaft and
   * for a Trupp that started in it.
   */
  readonly einsatzstatusBeforeBereitschaft: Exclude<
    Einsatzstatus,
    "bereitschaft"
  > | null;
  /** `t_A`, once the Trupp reported Einsatzziel erreicht; `null` before. */
  readonly anmarschzeitMs: number | null;
  /** Set at Einsatzziel erreicht; `null` until it is first reached. */
  readonly anmarschdruckBar: number | null;
  /** Whether the Rückzugsalarm is still to fire. */
  readonly rueckzugsalarmArmed: boolean;
  readonly loggedInAtMs: number;
}

/**
 * What fired an Alarm, which S12's header names: an Alarmgrenze, the Rückzugsalarm, Einsatzzeit
 * erreicht or one of its overdue repeats, or the Bereitschaft Alarm.
 */
export type AlarmCause =
  | "alarmgrenze1"
  | "alarmgrenze2"
  | "rueckzugsalarm"
  | "einsatzzeit"
  | "bereitschaft";

/** An Alarm waiting for its two OKs. */
export interface PendingAlarm {
  readonly truppnummer: number;
  readonly cause: AlarmCause;
}

/** The record of one Trupp's Einsatz, written at logoff and at a Notausschaltung. */
export interface Einsatzprotokoll {
  readonly einsatznummer: number;
  readonly truppnummer: number;
  readonly einsatzzeitMs: number;
  readonly atemschutztraeger: readonly Atemschutztraeger[];
  /** The Einsatzstatus at logoff. */
  readonly einsatzstatus: Einsatzstatus;
  readonly sicherheitstrupp: boolean;
  readonly loggedInAtMs: number;
  readonly loggedOffAtMs: number;
  /** `davon aktiv`: the Trupp's `t_run` at logoff, Bereitschaft excluded. */
  readonly davonAktivMs: number;
  /** Whether a Notausschaltung ended the Trupp. */
  readonly notausschaltung: boolean;
}

/** The SERVICE menu's items as drawn, top to bottom. */
export type ServiceAktion =
  "einsatzprotokoll" | "zeitDatumEinstellen" | "kontrast" | "testprogramm";

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
  /** Einsatzzeit wählen asks `Kurzzeiteinsatz? OK` or `Langzeiteinsatz? OK` before the Anmeldefenster opens. */
  readonly awaitingEinsatzzeitOk: boolean;
  readonly atemschutztraeger: readonly Atemschutztraeger[];
  /** The Anmeldefenster's choice under the cursor. */
  readonly anmeldeaktion: Anmeldeaktion;
  /** The Anfangsdruck editor's current value; `Druck ändern` sets it in advance. */
  readonly anfangsdruckBar: number;
  /** The value being edited on `Esz-Zeit ändern`; `null` on every other screen. */
  readonly draftFlaschendruckBar: number | null;
  /** The box `Zu wenig Einsatzkräfte!` shows over the Anmeldefenster. */
  readonly zuWenigEinsatzkraefteShown: boolean;
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
  | "flaschendruckAendern";

/** The Trupp-Menü open for the selected Trupp, and the editors it opens. */
export interface TruppMenue {
  /** The item under the cursor, and the one that opened the Flaschendruck editor. */
  readonly aktion: TruppMenueAktion;
  /** The value being edited in the Flaschendruck editor; `null` on the Trupp-Menü. */
  readonly draftFlaschendruckBar: number | null;
  /** The box `Sicherheitstrupp deaktivieren?` shows over the Trupp-Menü. */
  readonly sicherheitstruppDeaktivierenShown: boolean;
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
  /** The Alarms waiting for OK, first in, first out; several may be one Trupp's. */
  readonly pendingAlarms: readonly PendingAlarm[];
  /** Whether the first OK has silenced the Alarm S12 shows; the second OK ends it. */
  readonly alarmSilenced: boolean;
  /** The screen S12 took over from, shown again after the last OK; `null` for the Einsatzliste. */
  readonly interruptedScreen: Screen | null;
  /** Of X and Check, those held down since they were pressed on the Einsatzliste. */
  readonly notausschaltungKeysHeld: readonly ("X" | "Check")[];
  /** Real time since X and Check are held together on the Einsatzliste; `null` while they are not. */
  readonly notausschaltungHeldSinceRealMs: number | null;
  /** The choice under the cursor on S14, and the one S15 confirms; `null` on every other screen. */
  readonly notausschaltung: NotausschaltungAktion | null;
  /** The SERVICE item under the bar, kept while S16 is open; `null` on every other screen. */
  readonly serviceAktion: ServiceAktion | null;
  /** The Einsatzprotokoll strip's line at the top of S16; 0 on every other screen. */
  readonly einsatzprotokollFirstLine: number;
  /** The Einsatznummer the next Einsatzprotokoll gets; device memory, never reused. */
  readonly nextEinsatznummer: number;
}

/** What the Checkbox's non-volatile memory brings into a new session. */
export interface StoredEinsatzprotokolle {
  /** Oldest first. */
  readonly einsatzprotokolle: readonly Einsatzprotokoll[];
  readonly nextEinsatznummer: number;
}

/** The device memory as it leaves the factory: no Einsatzprotokoll, and numbering from 1. */
export const FACTORY_STORED_EINSATZPROTOKOLLE: StoredEinsatzprotokolle = {
  einsatzprotokolle: [],
  nextEinsatznummer: 1,
};

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
 * The Checkbox as it is when a new session begins: switched off, with the Einsatzprotokolle and
 * the Einsatznummer its device memory kept from earlier sessions.
 */
export function createInitialState(
  { now, realNow }: Clocks,
  {
    einsatzprotokolle,
    nextEinsatznummer,
  }: StoredEinsatzprotokolle = FACTORY_STORED_EINSATZPROTOKOLLE,
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
    alarmSilenced: false,
    interruptedScreen: null,
    notausschaltungKeysHeld: [],
    notausschaltungHeldSinceRealMs: null,
    notausschaltung: null,
    serviceAktion: null,
    einsatzprotokollFirstLine: 0,
    nextEinsatznummer,
  };
}

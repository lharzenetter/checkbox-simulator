import { ALARM_BLINK_PHASE_MS, SICHER_PHASE_MS } from "./parameters";
import type { Einsatzstatus, State, Trupp, TruppMenueAktion } from "./state";

/** Whether the siren sounds and the LED blinks; decided in "Decide how alarms are presented". */
export function isAlarmSounding(state: State): boolean {
  return state.pendingAlarms.length > 0;
}

/**
 * Real milliseconds into the current wail cycle of the siren and the LED: the LED is lit for the
 * first {@link ALARM_BLINK_PHASE_MS}, dark for the second. Cycles run from the moment S12 is
 * entered.
 */
// decided in "Decide how alarms are presented", points 2 and 8
export function alarmCycleMs(state: State): number {
  return (
    (state.realNow - state.screenEnteredRealMs) % (2 * ALARM_BLINK_PHASE_MS)
  );
}

/** Whether the red LED is lit now; it blinks in step with the siren. */
export function isAlarmLedLit(state: State): boolean {
  return isAlarmSounding(state) && alarmCycleMs(state) < ALARM_BLINK_PHASE_MS;
}

/** The Trupp whose Alarm S12 shows: the first one pending; only valid while one is. */
export function alarmTrupp(state: State): Trupp {
  const truppnummer = state.pendingAlarms[0];
  const trupp = state.trupps.find(
    (candidate) => candidate.truppnummer === truppnummer,
  );
  if (trupp === undefined) {
    throw new Error(`The ${state.screen} screen has no pending Alarm`);
  }
  return trupp;
}

/** The logged-in Trupp whose Atemschutzträger holds the Tally, if any. */
export function truppOfTally(state: State, tallyId: string): Trupp | undefined {
  return state.trupps.find((trupp) =>
    trupp.atemschutztraeger.some(
      (atemschutztraeger) => atemschutztraeger.tallyId === tallyId,
    ),
  );
}

/** The Trupp ABMELDEN is logging off; only valid while ABMELDEN is open. */
export function truppLoggingOff(state: State): Trupp {
  const truppnummer = state.logoff?.truppnummer;
  const trupp = state.trupps.find(
    (candidate) => candidate.truppnummer === truppnummer,
  );
  if (trupp === undefined) {
    throw new Error(`The ${state.screen} screen logs no Trupp off`);
  }
  return trupp;
}

/**
 * Whether the Einsatzliste shows `SICHER` in the Trupp's row now, instead of its Statussymbol.
 * The alternation runs on real time and starts with `SICHER` when the screen is entered.
 */
// manual 5.3.1 step 4; timing-and-alarm-rules §9, 9.1
export function isSicherShown(state: State, trupp: Trupp): boolean {
  const phase = Math.floor(
    (state.realNow - state.screenEnteredRealMs) / SICHER_PHASE_MS,
  );
  return trupp.sicherheitstrupp && phase % 2 === 0;
}

/** The Trupp selected on the Einsatzliste; only valid while one is. */
export function selectedTrupp(state: State): Trupp {
  const trupp = state.trupps.find(
    (candidate) => candidate.truppnummer === state.selectedTruppnummer,
  );
  if (trupp === undefined) {
    throw new Error(`The ${state.screen} screen has no Trupp selected`);
  }
  return trupp;
}

// decided in "Define the key-by-screen navigation model", its Trupp-Menü table
const TRUPP_MENUE_AKTIONEN: Readonly<
  Record<Einsatzstatus, readonly TruppMenueAktion[]>
> = {
  anmarsch: [
    "truppEinsatz",
    "truppBereitschaft",
    "einsatzzielErreicht",
    "rueckzugAntreten",
    "flaschendruckAendern",
    "attributeEintragen",
  ],
  einsatzzielErreicht: [
    "truppEinsatz",
    "truppBereitschaft",
    "rueckzugAntreten",
    "flaschendruckAendern",
    "attributeEintragen",
  ],
  rueckmarsch: [
    "truppEinsatz",
    "truppBereitschaft",
    "flaschendruckAendern",
    "attributeEintragen",
  ],
  bereitschaft: [
    "truppEinsatz",
    "truppBereitschaft",
    "flaschendruckAendern",
    "attributeEintragen",
  ],
};

/** The Trupp-Menü's items for the selected Trupp, top to bottom. */
export function truppMenueAktionen(state: State): readonly TruppMenueAktion[] {
  return TRUPP_MENUE_AKTIONEN[selectedTrupp(state).einsatzstatus];
}

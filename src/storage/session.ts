import type {
  AlarmCause,
  Anmeldeaktion,
  Login,
  Logoff,
  NotausschaltungAktion,
  PendingAlarm,
  Screen,
  ServiceAktion,
  State,
  Trupp,
  TruppMenue,
  TruppMenueAktion,
} from "../core/index";
import {
  assertNever,
  EINSATZZEITEN_MS,
  P72_ANZAHL_DER_MAXIMALEN_TRUPPS,
} from "../core/index";
import { KEY_PREFIX, loadDeviceMemory, resetToFactory } from "./device-memory";
import type { DeviceMemory } from "./device-memory";
import {
  isAtemschutztraeger,
  isEinsatzstatus,
  isMemberOf,
  isRecord,
  readItem,
  tryWrite,
} from "./guards";

/** What the Trainee wrote on one row of the Truppzuordnung. */
export interface TruppzuordnungRow {
  readonly ort: string;
  readonly auftrag: string;
}

/** One of the two columns the Trainee writes in on the Truppzuordnung. */
export type TruppzuordnungColumn = keyof TruppzuordnungRow;

/** What the Trainee wrote on the Truppzuordnung: one row per Truppnummer, in order. */
export type Truppzuordnung = readonly TruppzuordnungRow[];

/** The Truppzuordnung with nothing written on it. */
export const BLANK_TRUPPZUORDNUNG: Truppzuordnung = Array.from(
  { length: P72_ANZAHL_DER_MAXIMALEN_TRUPPS },
  () => ({ ort: "", auftrag: "" }),
);

/** The most characters one Ort or one Auftrag on the Truppzuordnung takes. */
export const TRUPPZUORDNUNG_MAX_LENGTH = 40;

/** Both stores as a page load finds them. */
export interface Stores {
  readonly deviceMemory: DeviceMemory;
  /** The running session saved before the reload; `null` when there is none. */
  readonly session: State | null;
  /** Saved with the running session; blank when there is none. */
  readonly truppzuordnung: Truppzuordnung;
}

const SESSION_KEY = `${KEY_PREFIX}session`;

// Raise on any change to the core's state or the Truppzuordnung: older sessions are then wiped with the device memory,
// never migrated (decided in "Decide what survives a page reload").
const SESSION_VERSION = 7;

// Keyed by every member of each union, so a member added to the core fails the typecheck here.
const SCREENS: Readonly<Record<Screen, true>> = {
  aus: true,
  startdisplay: true,
  service: true,
  einsatzprotokoll: true,
  einsatzzeitWaehlen: true,
  anmeldefenster: true,
  anfangsdruckEditor: true,
  flaschendruckAendern: true,
  einsatzliste: true,
  truppAnsicht: true,
  truppMenue: true,
  truppFlaschendruckAendern: true,
  abmelden: true,
  alarm: true,
  notausschaltungAuswahl: true,
  notausschaltungBestaetigung: true,
};
const ANMELDEAKTIONEN: Readonly<Record<Anmeldeaktion, true>> = {
  truppOkEinsatz: true,
  truppOkBereitschaft: true,
  sicherheitstruppOk: true,
  flaschendruckAendern: true,
};
const TRUPP_MENUE_AKTIONEN: Readonly<Record<TruppMenueAktion, true>> = {
  truppEinsatz: true,
  truppBereitschaft: true,
  einsatzzielErreicht: true,
  rueckzugAntreten: true,
  flaschendruckAendern: true,
  attributeEintragen: true,
};
const NOTAUSSCHALTUNG_AKTIONEN: Readonly<Record<NotausschaltungAktion, true>> =
  {
    markierterTrupp: true,
    alleTrupps: true,
    zurueck: true,
  };
// decided in "Define the key-by-screen navigation model", its pressure editor table
const OPENS_FLASCHENDRUCK_EDITOR: Readonly<Record<TruppMenueAktion, boolean>> =
  {
    truppEinsatz: false,
    truppBereitschaft: false,
    einsatzzielErreicht: true,
    rueckzugAntreten: true,
    flaschendruckAendern: true,
    attributeEintragen: false,
  };
const SERVICE_AKTIONEN: Readonly<Record<ServiceAktion, true>> = {
  einsatzprotokoll: true,
  zeitDatumEinstellen: true,
  kontrast: true,
  testprogramm: true,
};
const ALARM_CAUSES: Readonly<Record<AlarmCause, true>> = {
  alarmgrenze1: true,
  alarmgrenze2: true,
  rueckzugsalarm: true,
  einsatzzeit: true,
  bereitschaft: true,
};
const NOTAUSSCHALTUNG_KEYS: Readonly<Record<"X" | "Check", true>> = {
  X: true,
  Check: true,
};

/**
 * Reads both stores. Stored data the simulator can no longer read, in either store, wipes both
 * in full; the factory device memory and no session are returned instead.
 */
export function loadStores(storage: Storage): Stores {
  const deviceMemory = loadDeviceMemory(storage);
  const stored = readItem(storage, SESSION_KEY);
  if (stored === null) {
    return {
      deviceMemory,
      session: null,
      truppzuordnung: BLANK_TRUPPZUORDNUNG,
    };
  }
  const saved = parseSavedSession(stored, deviceMemory);
  if (saved === null) {
    resetToFactory(storage);
    return {
      deviceMemory: loadDeviceMemory(storage),
      session: null,
      truppzuordnung: BLANK_TRUPPZUORDNUNG,
    };
  }
  return { deviceMemory, ...saved };
}

/**
 * Writes the running session and the Truppzuordnung beside it, replacing those saved before. The
 * session's Einsatzprotokolle and Einsatznummer are left out: they are device memory, saved with
 * {@link saveDeviceMemory}.
 */
export function saveSession(
  storage: Storage,
  session: State,
  truppzuordnung: Truppzuordnung,
): void {
  tryWrite(() => {
    storage.setItem(
      SESSION_KEY,
      JSON.stringify({
        version: SESSION_VERSION,
        ...session,
        einsatzprotokolle: undefined,
        nextEinsatznummer: undefined,
        truppzuordnung,
      }),
    );
  });
}

/** Drops the running session and its Truppzuordnung; the device memory is kept. */
export function discardSession(storage: Storage): void {
  tryWrite(() => {
    storage.removeItem(SESSION_KEY);
  });
}

function parseSavedSession(
  stored: string,
  deviceMemory: DeviceMemory,
): Pick<Stores, "session" | "truppzuordnung"> | null {
  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    return null;
  }
  if (!isRecord(value) || value.version !== SESSION_VERSION) {
    return null;
  }
  const session = parseSession(value, deviceMemory);
  const { truppzuordnung } = value;
  return session !== null && isTruppzuordnung(truppzuordnung)
    ? { session, truppzuordnung }
    : null;
}

function isPendingAlarm(value: unknown): value is PendingAlarm {
  return (
    isRecord(value) &&
    isInteger(value.truppnummer) &&
    isMemberOf(ALARM_CAUSES, value.cause)
  );
}

function isTruppzuordnung(value: unknown): value is Truppzuordnung {
  return (
    Array.isArray(value) &&
    value.length === P72_ANZAHL_DER_MAXIMALEN_TRUPPS &&
    value.every(
      (row) =>
        isRecord(row) &&
        isTruppzuordnungField(row.ort) &&
        isTruppzuordnungField(row.auftrag),
    )
  );
}

function isTruppzuordnungField(value: unknown): value is string {
  return typeof value === "string" && value.length <= TRUPPZUORDNUNG_MAX_LENGTH;
}

function parseSession(
  value: Readonly<Record<string, unknown>>,
  { einsatzprotokolle, nextEinsatznummer }: DeviceMemory,
): State | null {
  const {
    screen,
    now,
    realNow,
    screenEnteredRealMs,
    idleSinceRealMs,
    login,
    logoff,
    truppMenue,
    trupps,
    selectedTruppnummer,
    pendingAlarms,
    alarmSilenced,
    interruptedScreen,
    notausschaltungKeysHeld,
    notausschaltungHeldSinceRealMs,
    notausschaltung,
    serviceAktion,
    einsatzprotokollFirstLine,
  } = value;
  if (
    !isMemberOf(SCREENS, screen) ||
    !isInteger(now) ||
    !isInteger(realNow) ||
    !isInteger(screenEnteredRealMs) ||
    !isInteger(idleSinceRealMs) ||
    !(login === null || isLogin(login)) ||
    !(logoff === null || isLogoff(logoff)) ||
    !(truppMenue === null || isTruppMenue(truppMenue)) ||
    !Array.isArray(trupps) ||
    !trupps.every(isTrupp) ||
    !isNullableInteger(selectedTruppnummer) ||
    !Array.isArray(pendingAlarms) ||
    !pendingAlarms.every(isPendingAlarm) ||
    typeof alarmSilenced !== "boolean" ||
    !(interruptedScreen === null || isMemberOf(SCREENS, interruptedScreen)) ||
    !Array.isArray(notausschaltungKeysHeld) ||
    !notausschaltungKeysHeld.every((key) =>
      isMemberOf(NOTAUSSCHALTUNG_KEYS, key),
    ) ||
    !isNullableInteger(notausschaltungHeldSinceRealMs) ||
    !(
      notausschaltung === null ||
      isMemberOf(NOTAUSSCHALTUNG_AKTIONEN, notausschaltung)
    ) ||
    !(serviceAktion === null || isMemberOf(SERVICE_AKTIONEN, serviceAktion)) ||
    !isInteger(einsatzprotokollFirstLine) ||
    einsatzprotokollFirstLine < 0
  ) {
    return null;
  }
  const session: State = {
    screen,
    now,
    realNow,
    screenEnteredRealMs,
    idleSinceRealMs,
    login,
    logoff,
    truppMenue,
    trupps,
    selectedTruppnummer,
    einsatzprotokolle,
    pendingAlarms,
    alarmSilenced,
    interruptedScreen,
    notausschaltungKeysHeld,
    notausschaltungHeldSinceRealMs,
    notausschaltung,
    serviceAktion,
    einsatzprotokollFirstLine,
    nextEinsatznummer,
  };
  return isConsistent(session) ? session : null;
}

// The core and the LCD throw on a state that breaks these, so such a session is as unreadable as
// a malformed one and is wiped in full (decided in "Decide what survives a page reload").
function isConsistent(state: State): boolean {
  return (
    state.trupps.every(({ einsatzzeitMs }) =>
      EINSATZZEITEN_MS.some((offered) => offered === einsatzzeitMs),
    ) &&
    state.pendingAlarms.every(({ truppnummer }) =>
      namesTrupp(state, truppnummer),
    ) &&
    (state.pendingAlarms.length > 0 || !state.alarmSilenced) &&
    (state.selectedTruppnummer === null ||
      namesTrupp(state, state.selectedTruppnummer)) &&
    hasScreenSubState(state)
  );
}

function hasScreenSubState(state: State): boolean {
  switch (state.screen) {
    case "aus":
    case "startdisplay":
    case "einsatzliste":
      return true;
    case "service":
    case "einsatzprotokoll":
      return state.serviceAktion !== null;
    case "einsatzzeitWaehlen":
    case "anmeldefenster":
    case "anfangsdruckEditor":
      return state.login !== null;
    case "flaschendruckAendern":
      return state.login !== null && state.login.draftFlaschendruckBar !== null;
    case "truppAnsicht":
      return state.selectedTruppnummer !== null;
    case "truppMenue":
      return state.selectedTruppnummer !== null && state.truppMenue !== null;
    case "truppFlaschendruckAendern":
      return (
        state.selectedTruppnummer !== null &&
        state.truppMenue !== null &&
        hasFlaschendruckEditor(state.truppMenue)
      );
    case "abmelden":
      return (
        state.logoff !== null && namesTrupp(state, state.logoff.truppnummer)
      );
    // The last OK shows the interrupted screen again, so it must be one that can be shown.
    case "alarm":
      return (
        state.pendingAlarms.length > 0 &&
        (state.interruptedScreen === null ||
          hasScreenSubState({
            ...state,
            screen: state.interruptedScreen,
            interruptedScreen: null,
            pendingAlarms: [],
            alarmSilenced: false,
          }))
      );
    case "notausschaltungAuswahl":
      return (
        state.notausschaltung !== null && state.selectedTruppnummer !== null
      );
    // OK ends the marked Trupp unless all Trupps were chosen.
    case "notausschaltungBestaetigung":
      return (
        state.notausschaltung === "alleTrupps" ||
        (state.notausschaltung !== null && state.selectedTruppnummer !== null)
      );
    default:
      return assertNever(state.screen);
  }
}

function hasFlaschendruckEditor({
  aktion,
  draftFlaschendruckBar,
}: TruppMenue): boolean {
  return draftFlaschendruckBar !== null && OPENS_FLASCHENDRUCK_EDITOR[aktion];
}

function namesTrupp(state: State, truppnummer: number): boolean {
  return state.trupps.some((trupp) => trupp.truppnummer === truppnummer);
}

function isTrupp(value: unknown): value is Trupp {
  return (
    isRecord(value) &&
    isInteger(value.truppnummer) &&
    isInteger(value.einsatzzeitMs) &&
    Array.isArray(value.atemschutztraeger) &&
    value.atemschutztraeger.every(isAtemschutztraeger) &&
    isEinsatzstatus(value.einsatzstatus) &&
    typeof value.sicherheitstrupp === "boolean" &&
    isInteger(value.restzeitMs) &&
    isInteger(value.anfangsdruckBar) &&
    isInteger(value.runningTimeMs) &&
    isInteger(value.timeInBereitschaftMs) &&
    (value.einsatzstatusBeforeBereitschaft === null ||
      (isEinsatzstatus(value.einsatzstatusBeforeBereitschaft) &&
        value.einsatzstatusBeforeBereitschaft !== "bereitschaft")) &&
    isNullableInteger(value.anmarschzeitMs) &&
    isNullableInteger(value.anmarschdruckBar) &&
    typeof value.rueckzugsalarmArmed === "boolean" &&
    isInteger(value.loggedInAtMs)
  );
}

function isLogin(value: unknown): value is Login {
  return (
    isRecord(value) &&
    isInteger(value.truppnummer) &&
    isInteger(value.einsatzzeitMs) &&
    typeof value.awaitingLangzeiteinsatzOk === "boolean" &&
    Array.isArray(value.atemschutztraeger) &&
    value.atemschutztraeger.every(isAtemschutztraeger) &&
    isMemberOf(ANMELDEAKTIONEN, value.anmeldeaktion) &&
    isInteger(value.anfangsdruckBar) &&
    isNullableInteger(value.draftFlaschendruckBar) &&
    typeof value.zuWenigEinsatzkraefteShown === "boolean"
  );
}

function isLogoff(value: unknown): value is Logoff {
  return (
    isRecord(value) &&
    isInteger(value.truppnummer) &&
    Array.isArray(value.markedTallyIds) &&
    value.markedTallyIds.every((tallyId) => typeof tallyId === "string") &&
    isNullableInteger(value.daueralarmSinceRealMs)
  );
}

function isTruppMenue(value: unknown): value is TruppMenue {
  return (
    isRecord(value) &&
    isMemberOf(TRUPP_MENUE_AKTIONEN, value.aktion) &&
    isNullableInteger(value.draftFlaschendruckBar)
  );
}

function isNullableInteger(value: unknown): value is number | null {
  return value === null || isInteger(value);
}

function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

import type {
  Anmeldeaktion,
  Login,
  Logoff,
  NotausschaltungAktion,
  Screen,
  State,
  Trupp,
  TruppMenue,
  TruppMenueAktion,
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

/** Both stores as a page load finds them. */
export interface Stores {
  readonly deviceMemory: DeviceMemory;
  /** The running session saved before the reload; `null` when there is none. */
  readonly session: State | null;
}

const SESSION_KEY = `${KEY_PREFIX}session`;

// Raise on any change to the core's state: older sessions are then wiped with the device memory,
// never migrated (decided in "Decide what survives a page reload").
const SESSION_VERSION = 1;

// Keyed by every member of each union, so a member added to the core fails the typecheck here.
const SCREENS: Readonly<Record<Screen, true>> = {
  aus: true,
  startdisplay: true,
  service: true,
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
    return { deviceMemory, session: null };
  }
  const session = parseSession(stored, deviceMemory);
  if (session === null) {
    resetToFactory(storage);
    return { deviceMemory: loadDeviceMemory(storage), session: null };
  }
  return { deviceMemory, session };
}

/**
 * Writes the running session, replacing the one saved before. Its Einsatzprotokolle are left
 * out: they are device memory, saved with {@link saveDeviceMemory}.
 */
export function saveSession(storage: Storage, session: State): void {
  tryWrite(() => {
    storage.setItem(
      SESSION_KEY,
      JSON.stringify({
        version: SESSION_VERSION,
        ...session,
        einsatzprotokolle: undefined,
      }),
    );
  });
}

/** Drops the running session; the device memory is kept. */
export function discardSession(storage: Storage): void {
  tryWrite(() => {
    storage.removeItem(SESSION_KEY);
  });
}

function parseSession(
  stored: string,
  { einsatzprotokolle }: DeviceMemory,
): State | null {
  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    return null;
  }
  if (!isRecord(value) || value.version !== SESSION_VERSION) {
    return null;
  }
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
    interruptedScreen,
    notausschaltungKeysHeld,
    notausschaltungHeldSinceRealMs,
    notausschaltung,
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
    !pendingAlarms.every(isInteger) ||
    !(interruptedScreen === null || isMemberOf(SCREENS, interruptedScreen)) ||
    !Array.isArray(notausschaltungKeysHeld) ||
    !notausschaltungKeysHeld.every((key) =>
      isMemberOf(NOTAUSSCHALTUNG_KEYS, key),
    ) ||
    !isNullableInteger(notausschaltungHeldSinceRealMs) ||
    !(
      notausschaltung === null ||
      isMemberOf(NOTAUSSCHALTUNG_AKTIONEN, notausschaltung)
    )
  ) {
    return null;
  }
  return {
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
    interruptedScreen,
    notausschaltungKeysHeld,
    notausschaltungHeldSinceRealMs,
    notausschaltung,
  };
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
    isInteger(value.runningTimeMs) &&
    isInteger(value.anmarschBeganAtRunningTimeMs) &&
    isInteger(value.timeInBereitschaftMs) &&
    isNullableInteger(value.anmarschzeitMs) &&
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
    isNullableInteger(value.daueralarmSinceRealMs)
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

import {
  FACTORY_FEUERWEHRNAME,
  FACTORY_STORED_EINSATZPROTOKOLLE,
  isValidFeuerwehrname,
} from "../core/index";
import type { Einsatzprotokoll } from "../core/index";
import { DEFAULT_FAHRZEUGE, isValidRoster } from "../world/index";
import type { Fahrzeug, Fahrzeuge } from "../world/index";
import {
  isAtemschutztraeger,
  isEinsatzstatus,
  isRecord,
  readItem,
  tryWrite,
} from "./guards";

/** What the Checkbox's non-volatile memory keeps until a factory reset. */
export interface DeviceMemory {
  readonly feuerwehrname: string;
  readonly fahrzeuge: Fahrzeuge;
  /** Whether the Trainee has confirmed the first-launch dialog. */
  readonly firstLaunchDone: boolean;
  readonly muted: boolean;
  /** Oldest first, as the device core keeps them. */
  readonly einsatzprotokolle: readonly Einsatzprotokoll[];
  /** The Einsatznummer the next Einsatzprotokoll gets. */
  readonly nextEinsatznummer: number;
}

/** The device memory as it leaves the factory, and after a factory reset. */
export const FACTORY_DEVICE_MEMORY: DeviceMemory = {
  feuerwehrname: FACTORY_FEUERWEHRNAME,
  fahrzeuge: DEFAULT_FAHRZEUGE,
  firstLaunchDone: false,
  muted: false,
  ...FACTORY_STORED_EINSATZPROTOKOLLE,
};

// Every key the simulator stores starts with this prefix, so a wipe can find the session too.
export const KEY_PREFIX = "checkbox-simulator/";
const DEVICE_MEMORY_KEY = `${KEY_PREFIX}device-memory`;

// Raise on any change to the stored shape: older data is then wiped, never migrated (decided in
// "Decide what survives a page reload").
const DEVICE_MEMORY_VERSION = 3;

/**
 * Reads the device memory. Stored data the simulator can no longer read is wiped in full,
 * together with the running session, and the factory device memory is returned instead.
 */
export function loadDeviceMemory(storage: Storage): DeviceMemory {
  const stored = readItem(storage, DEVICE_MEMORY_KEY);
  if (stored === null) {
    return FACTORY_DEVICE_MEMORY;
  }
  const memory = parseDeviceMemory(stored);
  if (memory === null) {
    resetToFactory(storage);
    return FACTORY_DEVICE_MEMORY;
  }
  return memory;
}

/** Writes the device memory, replacing what was kept before. */
export function saveDeviceMemory(storage: Storage, memory: DeviceMemory): void {
  tryWrite(() => {
    storage.setItem(
      DEVICE_MEMORY_KEY,
      JSON.stringify({ version: DEVICE_MEMORY_VERSION, ...memory }),
    );
  });
}

/** Clears the device memory and the running session; other sites' keys are left alone. */
export function resetToFactory(storage: Storage): void {
  tryWrite(() => {
    const simulatorKeys = Array.from({ length: storage.length }, (_, index) =>
      storage.key(index),
    ).filter((key): key is string => key?.startsWith(KEY_PREFIX) ?? false);
    for (const key of simulatorKeys) {
      storage.removeItem(key);
    }
  });
}

function parseDeviceMemory(stored: string): DeviceMemory | null {
  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    return null;
  }
  if (!isRecord(value) || value.version !== DEVICE_MEMORY_VERSION) {
    return null;
  }
  const fahrzeuge = parseFahrzeuge(value.fahrzeuge);
  const {
    feuerwehrname,
    firstLaunchDone,
    muted,
    einsatzprotokolle,
    nextEinsatznummer,
  } = value;
  if (
    typeof feuerwehrname !== "string" ||
    !isValidFeuerwehrname(feuerwehrname) ||
    fahrzeuge === null ||
    typeof firstLaunchDone !== "boolean" ||
    typeof muted !== "boolean" ||
    !Array.isArray(einsatzprotokolle) ||
    !einsatzprotokolle.every(isEinsatzprotokoll) ||
    typeof nextEinsatznummer !== "number" ||
    !Number.isInteger(nextEinsatznummer) ||
    nextEinsatznummer < 1
  ) {
    return null;
  }
  return {
    feuerwehrname,
    fahrzeuge,
    firstLaunchDone,
    muted,
    einsatzprotokolle,
    nextEinsatznummer,
  };
}

function parseFahrzeuge(value: unknown): Fahrzeuge | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const fahrzeuge = value.filter(isFahrzeug);
  return fahrzeuge.length === value.length && isValidRoster(fahrzeuge)
    ? fahrzeuge.map(({ id, funkrufname, kurzname }) => ({
        id,
        funkrufname,
        kurzname,
      }))
    : null;
}

function isFahrzeug(value: unknown): value is Fahrzeug {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.funkrufname === "string" &&
    typeof value.kurzname === "string"
  );
}

function isEinsatzprotokoll(value: unknown): value is Einsatzprotokoll {
  return (
    isRecord(value) &&
    Number.isInteger(value.einsatznummer) &&
    Number.isInteger(value.truppnummer) &&
    Number.isInteger(value.einsatzzeitMs) &&
    Array.isArray(value.atemschutztraeger) &&
    value.atemschutztraeger.every(isAtemschutztraeger) &&
    isEinsatzstatus(value.einsatzstatus) &&
    typeof value.sicherheitstrupp === "boolean" &&
    Number.isInteger(value.loggedInAtMs) &&
    Number.isInteger(value.loggedOffAtMs) &&
    Number.isInteger(value.davonAktivMs) &&
    typeof value.notausschaltung === "boolean"
  );
}

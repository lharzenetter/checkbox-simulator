import type { Einsatzprotokoll } from "../core/index";
import { DEFAULT_VEHICLES, isValidVehicle } from "../world/index";
import type { Vehicle, Vehicles } from "../world/index";
import { isAtemschutztraeger, isEinsatzstatus, isRecord } from "./parse";

/** What the Checkbox's non-volatile memory keeps until a factory reset. */
export interface DeviceMemory {
  readonly vehicles: Vehicles;
  /** Whether the Trainee has confirmed the first-launch dialog. */
  readonly firstLaunchDone: boolean;
  readonly muted: boolean;
  /** Oldest first, as the device core keeps them. */
  readonly einsatzprotokolle: readonly Einsatzprotokoll[];
}

/** The device memory as it leaves the factory, and after a factory reset. */
export const FACTORY_DEVICE_MEMORY: DeviceMemory = {
  vehicles: DEFAULT_VEHICLES,
  firstLaunchDone: false,
  muted: false,
  einsatzprotokolle: [],
};

// Every key the simulator stores starts with this prefix, so a wipe can find the session too.
export const KEY_PREFIX = "checkbox-simulator/";
const DEVICE_MEMORY_KEY = `${KEY_PREFIX}device-memory`;

// Raise on any change to the stored shape: older data is then wiped, never migrated (decided in
// "Decide what survives a page reload").
const DEVICE_MEMORY_VERSION = 1;

/**
 * Reads the device memory. Stored data the simulator can no longer read is wiped in full,
 * together with the running session, and the factory device memory is returned instead.
 */
export function loadDeviceMemory(storage: Storage): DeviceMemory {
  const stored = storage.getItem(DEVICE_MEMORY_KEY);
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
  storage.setItem(
    DEVICE_MEMORY_KEY,
    JSON.stringify({ version: DEVICE_MEMORY_VERSION, ...memory }),
  );
}

/** Clears the device memory and the running session; other sites' keys are left alone. */
export function resetToFactory(storage: Storage): void {
  const simulatorKeys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).filter((key): key is string => key?.startsWith(KEY_PREFIX) ?? false);
  for (const key of simulatorKeys) {
    storage.removeItem(key);
  }
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
  const vehicles = parseVehicles(value.vehicles);
  const { firstLaunchDone, muted, einsatzprotokolle } = value;
  if (
    vehicles === null ||
    typeof firstLaunchDone !== "boolean" ||
    typeof muted !== "boolean" ||
    !Array.isArray(einsatzprotokolle) ||
    !einsatzprotokolle.every(isEinsatzprotokoll)
  ) {
    return null;
  }
  return { vehicles, firstLaunchDone, muted, einsatzprotokolle };
}

function parseVehicles(value: unknown): Vehicles | null {
  if (!Array.isArray(value) || value.length !== 2) {
    return null;
  }
  const first: unknown = value[0];
  const second: unknown = value[1];
  return isVehicle(first) && isVehicle(second) ? [first, second] : null;
}

function isVehicle(value: unknown): value is Vehicle {
  return (
    isRecord(value) &&
    typeof value.funkrufname === "string" &&
    typeof value.kurzname === "string" &&
    isValidVehicle({
      funkrufname: value.funkrufname,
      kurzname: value.kurzname,
    })
  );
}

function isEinsatzprotokoll(value: unknown): value is Einsatzprotokoll {
  return (
    isRecord(value) &&
    Number.isInteger(value.truppnummer) &&
    Number.isInteger(value.einsatzzeitMs) &&
    Array.isArray(value.atemschutztraeger) &&
    value.atemschutztraeger.every(isAtemschutztraeger) &&
    isEinsatzstatus(value.einsatzstatus) &&
    typeof value.sicherheitstrupp === "boolean" &&
    Number.isInteger(value.loggedInAtMs) &&
    Number.isInteger(value.loggedOffAtMs)
  );
}

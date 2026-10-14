import { describe, expect, it } from "vitest";
import type { Einsatzprotokoll } from "../core/index";
import {
  FACTORY_DEVICE_MEMORY,
  loadDeviceMemory,
  resetToFactory,
  saveDeviceMemory,
} from "./index";
import type { DeviceMemory } from "./index";

const DEVICE_MEMORY_KEY = "checkbox-simulator/device-memory";
const SESSION_KEY = "checkbox-simulator/session";

class MemoryStorage implements Storage {
  readonly #items = new Map<string, string>();

  get length(): number {
    return this.#items.size;
  }

  clear(): void {
    this.#items.clear();
  }

  getItem(key: string): string | null {
    return this.#items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.#items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.#items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#items.set(key, value);
  }
}

const EINSATZPROTOKOLL: Einsatzprotokoll = {
  truppnummer: 1,
  einsatzzeitMs: 30 * 60_000,
  atemschutztraeger: [
    { tallyId: "1", name: "HLF 1 AT-F" },
    { tallyId: "2", name: "HLF 1 AT-M" },
  ],
  einsatzstatus: "rueckmarsch",
  sicherheitstrupp: false,
  loggedInAtMs: 1_000_000,
  loggedOffAtMs: 2_000_000,
};

const CHANGED: DeviceMemory = {
  feuerwehrname: "FF-Übersee",
  fahrzeuge: [
    { id: "2", funkrufname: "Florian Musterstadt 1/44-1", kurzname: "LF Süd" },
    { id: "3", funkrufname: "1/33", kurzname: "DLK" },
    { id: "4", funkrufname: "Florian Musterstadt 1/46-1", kurzname: "HLF 1" },
  ],
  firstLaunchDone: true,
  muted: true,
  einsatzprotokolle: [EINSATZPROTOKOLL],
};

// The current version's stored form of CHANGED, with these fields replaced.
function stored(fields: Readonly<Record<string, unknown>>): string {
  return JSON.stringify({ version: 2, ...CHANGED, ...fields });
}

function storageWith(items: Readonly<Record<string, string>>): Storage {
  const storage = new MemoryStorage();
  for (const [key, value] of Object.entries(items)) {
    storage.setItem(key, value);
  }
  return storage;
}

describe("the device memory", () => {
  // decided in "Decide the contents of the fixed Tally roster"
  it("starts with the default names and the first launch still to do", () => {
    expect(loadDeviceMemory(new MemoryStorage())).toEqual({
      feuerwehrname: "FF-Musterstadt",
      fahrzeuge: [
        { id: "1", funkrufname: "1/43", kurzname: "HLF" },
        { id: "2", funkrufname: "1/45", kurzname: "LF" },
      ],
      firstLaunchDone: false,
      muted: false,
      einsatzprotokolle: [],
    });
  });

  // decided in "Decide what survives a page reload"
  // decided in "Let the Trainee add and remove Fahrzeuge", point 3
  it("keeps the Fahrzeuge with their identity", () => {
    const storage = new MemoryStorage();
    saveDeviceMemory(storage, CHANGED);
    expect(loadDeviceMemory(storage).fahrzeuge).toEqual(CHANGED.fahrzeuge);
  });

  it("keeps the Feuerwehrname, the names, the first launch, the mute setting and the Einsatzprotokolle", () => {
    const storage = new MemoryStorage();
    saveDeviceMemory(storage, CHANGED);
    expect(loadDeviceMemory(storage)).toEqual(CHANGED);
  });
});

describe("incompatible stored data", () => {
  // decided in "Decide what survives a page reload": discarded in full, never migrated
  it.each([
    ["is not JSON", "{not json"],
    ["has no version", JSON.stringify({ ...CHANGED })],
    ["has an old version", JSON.stringify({ version: 1, ...CHANGED })],
    [
      "has a Feuerwehrname longer than an LCD line",
      JSON.stringify({
        version: 2,
        ...CHANGED,
        feuerwehrname: "Freiwillige Feuerwehr Musterstadt",
      }),
    ],
    [
      "has a Kurzname longer than 10 characters",
      stored({
        fahrzeuge: [
          ...CHANGED.fahrzeuge.slice(1),
          { id: "5", funkrufname: "LF", kurzname: "LF Süd-Ost 2" },
        ],
      }),
    ],
    [
      "has the vehicles of the old shape",
      stored({
        fahrzeuge: undefined,
        vehicles: [
          { funkrufname: "1/43", kurzname: "HLF" },
          { funkrufname: "1/45", kurzname: "LF" },
        ],
      }),
    ],
    ["has no Fahrzeug", stored({ fahrzeuge: [] })],
    [
      "has five Fahrzeuge",
      stored({
        fahrzeuge: [
          ...CHANGED.fahrzeuge,
          { id: "5", funkrufname: "1/23", kurzname: "TLF" },
          { id: "6", funkrufname: "1/11", kurzname: "ELW" },
        ],
      }),
    ],
    [
      "has a Fahrzeug without its identity",
      stored({
        fahrzeuge: [{ funkrufname: "1/43", kurzname: "HLF" }],
      }),
    ],
    [
      "has two Fahrzeuge with the same Kurzname",
      stored({
        fahrzeuge: [
          { id: "1", funkrufname: "1/43", kurzname: "HLF" },
          { id: "2", funkrufname: "1/45", kurzname: "hlf" },
        ],
      }),
    ],
    [
      "has an Einsatzprotokoll with an unknown Einsatzstatus",
      JSON.stringify({
        version: 2,
        ...CHANGED,
        einsatzprotokolle: [{ ...EINSATZPROTOKOLL, einsatzstatus: "pause" }],
      }),
    ],
    [
      "has an Einsatzprotokoll without its Atemschutzträger",
      JSON.stringify({
        version: 2,
        ...CHANGED,
        einsatzprotokolle: [{ ...EINSATZPROTOKOLL, atemschutztraeger: null }],
      }),
    ],
  ])("is wiped with the session when it %s", (_, stored) => {
    const storage = storageWith({
      [DEVICE_MEMORY_KEY]: stored,
      [SESSION_KEY]: "{}",
      "another-app": "kept",
    });
    expect(loadDeviceMemory(storage)).toEqual(FACTORY_DEVICE_MEMORY);
    expect(storage.getItem(DEVICE_MEMORY_KEY)).toBeNull();
    expect(storage.getItem(SESSION_KEY)).toBeNull();
    expect(storage.getItem("another-app")).toBe("kept");
  });

  it("keeps compatible data as it is", () => {
    const storage = storageWith({
      [DEVICE_MEMORY_KEY]: JSON.stringify({ version: 2, ...CHANGED }),
    });
    expect(loadDeviceMemory(storage)).toEqual(CHANGED);
  });
});

describe("the factory reset", () => {
  // decided in "Decide what survives a page reload": it clears both stores
  it("clears the device memory and the session, so the first launch comes back", () => {
    const storage = storageWith({ [SESSION_KEY]: "{}", "another-app": "kept" });
    saveDeviceMemory(storage, CHANGED);
    resetToFactory(storage);
    expect(loadDeviceMemory(storage)).toEqual(FACTORY_DEVICE_MEMORY);
    expect(FACTORY_DEVICE_MEMORY.firstLaunchDone).toBe(false);
    expect(storage.getItem(SESSION_KEY)).toBeNull();
    expect(storage.getItem("another-app")).toBe("kept");
  });
});

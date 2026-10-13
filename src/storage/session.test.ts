import { describe, expect, it } from "vitest";
import { createInitialState } from "../core/index";
import type { Einsatzprotokoll, State, Trupp } from "../core/index";
import {
  discardSession,
  FACTORY_DEVICE_MEMORY,
  loadStores,
  saveDeviceMemory,
  saveSession,
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
    { tallyId: "1", name: "HLF AT-F" },
    { tallyId: "2", name: "HLF AT-M" },
  ],
  einsatzstatus: "rueckmarsch",
  sicherheitstrupp: false,
  loggedInAtMs: 1_000_000,
  loggedOffAtMs: 2_000_000,
};

const DEVICE_MEMORY: DeviceMemory = {
  ...FACTORY_DEVICE_MEMORY,
  firstLaunchDone: true,
  einsatzprotokolle: [EINSATZPROTOKOLL],
};

const TRUPP: Trupp = {
  truppnummer: 2,
  einsatzzeitMs: 30 * 60_000,
  atemschutztraeger: [
    { tallyId: "3", name: "HLF WT-F" },
    { tallyId: "4", name: "HLF WT-M" },
  ],
  einsatzstatus: "anmarsch",
  sicherheitstrupp: false,
  restzeitMs: -10_000,
  runningTimeMs: 30 * 60_000 + 10_000,
  anmarschBeganAtRunningTimeMs: 0,
  timeInBereitschaftMs: 0,
  anmarschzeitMs: null,
  rueckzugsalarmArmed: true,
  loggedInAtMs: 3_000_000,
};

// Every part of the state filled in, as it is with an Alarm pending over a half-done login.
const MID_EINSATZ: State = {
  ...createInitialState({ now: 5_000_000, realNow: 90_000 }, [
    EINSATZPROTOKOLL,
  ]),
  screen: "alarm",
  screenEnteredRealMs: 80_000,
  idleSinceRealMs: 85_000,
  login: {
    truppnummer: 3,
    einsatzzeitMs: 60 * 60_000,
    awaitingLangzeiteinsatzOk: false,
    atemschutztraeger: [{ tallyId: "5", name: "LF AT-F" }],
    anmeldeaktion: "flaschendruckAendern",
    anfangsdruckBar: 300,
    draftFlaschendruckBar: 280,
    daueralarmSinceRealMs: 70_000,
  },
  logoff: {
    truppnummer: 2,
    markedTallyIds: ["3"],
    daueralarmSinceRealMs: null,
  },
  truppMenue: { aktion: "rueckzugAntreten", draftFlaschendruckBar: null },
  trupps: [TRUPP, { ...TRUPP, truppnummer: 4, einsatzstatus: "bereitschaft" }],
  selectedTruppnummer: 2,
  pendingAlarms: [2, 4],
  interruptedScreen: "anmeldefenster",
  notausschaltungKeysHeld: ["X"],
  notausschaltungHeldSinceRealMs: null,
  notausschaltung: "alleTrupps",
};

function storageWith(items: Readonly<Record<string, string>>): Storage {
  const storage = new MemoryStorage();
  for (const [key, value] of Object.entries(items)) {
    storage.setItem(key, value);
  }
  return storage;
}

function savedStorage(session: State): Storage {
  const storage = new MemoryStorage();
  saveDeviceMemory(storage, DEVICE_MEMORY);
  saveSession(storage, session);
  return storage;
}

describe("the running session", () => {
  it("is not there before a session was saved", () => {
    const storage = new MemoryStorage();
    saveDeviceMemory(storage, DEVICE_MEMORY);
    expect(loadStores(storage)).toEqual({
      deviceMemory: DEVICE_MEMORY,
      session: null,
    });
  });

  // decided in "Decide what survives a page reload"; "Decide how alarms are presented", point 9
  it("comes back as it was saved, with its pending Alarms and the screen S12 interrupted", () => {
    expect(loadStores(savedStorage(MID_EINSATZ))).toEqual({
      deviceMemory: DEVICE_MEMORY,
      session: MID_EINSATZ,
    });
  });

  it("comes back as a freshly started session", () => {
    const started = createInitialState({ now: 5_000_000, realNow: 90_000 }, [
      EINSATZPROTOKOLL,
    ]);
    expect(loadStores(savedStorage(started)).session).toEqual(started);
  });
});

describe("discarding the running session", () => {
  // decided in "Decide what survives a page reload": verwerfen keeps the device memory
  it("drops the session and keeps the device memory", () => {
    const storage = savedStorage(MID_EINSATZ);
    discardSession(storage);
    expect(loadStores(storage)).toEqual({
      deviceMemory: DEVICE_MEMORY,
      session: null,
    });
  });
});

describe("incompatible stored session data", () => {
  function sessionJson(changes: Readonly<Record<string, unknown>>): string {
    return JSON.stringify({
      version: 1,
      ...MID_EINSATZ,
      einsatzprotokolle: undefined,
      ...changes,
    });
  }

  // decided in "Decide what survives a page reload": discarded in full, never migrated
  it.each([
    ["is not JSON", "{not json"],
    ["has no version", sessionJson({ version: undefined })],
    ["has an old version", sessionJson({ version: 0 })],
    ["has an unknown screen", sessionJson({ screen: "pause" })],
    ["lacks a field", sessionJson({ pendingAlarms: undefined })],
    [
      "has a Trupp with an unknown Einsatzstatus",
      sessionJson({ trupps: [{ ...TRUPP, einsatzstatus: "pause" }] }),
    ],
    [
      "has a Trupp without its Restzeit",
      sessionJson({ trupps: [{ ...TRUPP, restzeitMs: null }] }),
    ],
    [
      "has a login with an unknown Anmeldeaktion",
      sessionJson({
        login: { ...MID_EINSATZ.login, anmeldeaktion: "truppAbmelden" },
      }),
    ],
    [
      "has a Trupp-Menü with an unknown item",
      sessionJson({ truppMenue: { aktion: "x", draftFlaschendruckBar: null } }),
    ],
    [
      "has an unknown key held for the Notausschaltung",
      sessionJson({ notausschaltungKeysHeld: ["OK"] }),
    ],
  ])("is wiped with the device memory when it %s", (_, stored) => {
    const storage = storageWith({
      [SESSION_KEY]: stored,
      "another-app": "kept",
    });
    saveDeviceMemory(storage, DEVICE_MEMORY);
    expect(loadStores(storage)).toEqual({
      deviceMemory: FACTORY_DEVICE_MEMORY,
      session: null,
    });
    expect(storage.getItem(DEVICE_MEMORY_KEY)).toBeNull();
    expect(storage.getItem(SESSION_KEY)).toBeNull();
    expect(storage.getItem("another-app")).toBe("kept");
  });

  it("is wiped when the device memory beside it is incompatible", () => {
    const storage = savedStorage(MID_EINSATZ);
    storage.setItem(DEVICE_MEMORY_KEY, "{not json");
    expect(loadStores(storage)).toEqual({
      deviceMemory: FACTORY_DEVICE_MEMORY,
      session: null,
    });
    expect(storage.getItem(SESSION_KEY)).toBeNull();
  });
});

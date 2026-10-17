import { describe, expect, it } from "vitest";
import { createInitialState } from "../core/index";
import type { Einsatzprotokoll, State, Trupp } from "../core/index";
import {
  BLANK_TRUPPZUORDNUNG,
  discardSession,
  FACTORY_DEVICE_MEMORY,
  loadStores,
  resetToFactory,
  saveDeviceMemory,
  saveSession,
} from "./index";
import type { DeviceMemory, Truppzuordnung } from "./index";

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
  einsatznummer: 7,
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
  davonAktivMs: 600_000,
  notausschaltung: false,
};

const DEVICE_MEMORY: DeviceMemory = {
  ...FACTORY_DEVICE_MEMORY,
  firstLaunchDone: true,
  einsatzprotokolle: [EINSATZPROTOKOLL],
  nextEinsatznummer: 8,
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

// Every part of the state filled in, as it is with two Alarms pending over a half-done login, the
// first silenced by its first OK.
const MID_EINSATZ: State = {
  ...createInitialState({ now: 5_000_000, realNow: 90_000 }, DEVICE_MEMORY),
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
    zuWenigEinsatzkraefteShown: true,
  },
  logoff: {
    truppnummer: 2,
    markedTallyIds: ["3"],
    daueralarmSinceRealMs: null,
  },
  truppMenue: { aktion: "rueckzugAntreten", draftFlaschendruckBar: null },
  trupps: [TRUPP, { ...TRUPP, truppnummer: 4, einsatzstatus: "bereitschaft" }],
  selectedTruppnummer: 2,
  pendingAlarms: [
    { truppnummer: 2, cause: "rueckzugsalarm" },
    { truppnummer: 4, cause: "bereitschaft" },
  ],
  alarmSilenced: true,
  interruptedScreen: "anmeldefenster",
  notausschaltungKeysHeld: ["X"],
  notausschaltungHeldSinceRealMs: null,
  notausschaltung: "alleTrupps",
};

const BLANK_ROW = { ort: "", auftrag: "" };

const TRUPPZUORDNUNG: Truppzuordnung = [
  BLANK_ROW,
  { ort: "1. OG links", auftrag: "Menschenrettung" },
  BLANK_ROW,
  { ort: "", auftrag: "Brandbekämpfung" },
  { ort: "Keller", auftrag: "" },
  BLANK_ROW,
];

function storageWith(items: Readonly<Record<string, string>>): Storage {
  const storage = new MemoryStorage();
  for (const [key, value] of Object.entries(items)) {
    storage.setItem(key, value);
  }
  return storage;
}

function savedStorage(
  session: State,
  truppzuordnung: Truppzuordnung = BLANK_TRUPPZUORDNUNG,
): Storage {
  const storage = new MemoryStorage();
  saveDeviceMemory(storage, DEVICE_MEMORY);
  saveSession(storage, session, truppzuordnung);
  return storage;
}

describe("the running session", () => {
  it("is not there before a session was saved", () => {
    const storage = new MemoryStorage();
    saveDeviceMemory(storage, DEVICE_MEMORY);
    expect(loadStores(storage)).toEqual({
      deviceMemory: DEVICE_MEMORY,
      session: null,
      truppzuordnung: BLANK_TRUPPZUORDNUNG,
    });
  });

  // decided in "Decide what survives a page reload"; "Decide how alarms are presented", point 9
  it("comes back as it was saved, with its pending Alarms, whether the first OK was given and the screen S12 interrupted", () => {
    expect(loadStores(savedStorage(MID_EINSATZ))).toEqual({
      deviceMemory: DEVICE_MEMORY,
      session: MID_EINSATZ,
      truppzuordnung: BLANK_TRUPPZUORDNUNG,
    });
  });

  it("comes back as a freshly started session", () => {
    const started = createInitialState(
      { now: 5_000_000, realNow: 90_000 },
      DEVICE_MEMORY,
    );
    expect(loadStores(savedStorage(started)).session).toEqual(started);
  });

  // decided in "Decide what survives a page reload": the session is the core's state as it was
  it("comes back on the Einsatzprotokoll screen where it was scrolled to", () => {
    const einsatzprotokollScreen: State = {
      ...createInitialState({ now: 5_000_000, realNow: 90_000 }, DEVICE_MEMORY),
      screen: "einsatzprotokoll",
      serviceAktion: "einsatzprotokoll",
      einsatzprotokollFirstLine: 3,
    };
    expect(loadStores(savedStorage(einsatzprotokollScreen)).session).toEqual(
      einsatzprotokollScreen,
    );
  });

  // decided in "Decide what survives a page reload": fortsetzen restores the running session
  it("comes back with the Ort and Auftrag of each Truppzuordnung row written beside it", () => {
    expect(
      loadStores(savedStorage(MID_EINSATZ, TRUPPZUORDNUNG)).truppzuordnung,
    ).toEqual(TRUPPZUORDNUNG);
  });

  // decided in "Decide what survives a page reload": the Einsatznummer is device memory
  it("takes its Einsatznummer from the device memory", () => {
    const storage = savedStorage({ ...MID_EINSATZ, nextEinsatznummer: 3 });
    expect(loadStores(storage).session?.nextEinsatznummer).toBe(8);
  });
});

describe("discarding the running session", () => {
  // decided in "Decide what survives a page reload": verwerfen keeps the device memory
  it("drops the session and the Truppzuordnung and keeps the device memory", () => {
    const storage = savedStorage(MID_EINSATZ, TRUPPZUORDNUNG);
    discardSession(storage);
    expect(loadStores(storage)).toEqual({
      deviceMemory: DEVICE_MEMORY,
      session: null,
      truppzuordnung: BLANK_TRUPPZUORDNUNG,
    });
  });
});

describe("the factory reset", () => {
  // decided in "Decide what survives a page reload": it clears both stores
  it("blanks the Truppzuordnung", () => {
    const storage = savedStorage(MID_EINSATZ, TRUPPZUORDNUNG);
    resetToFactory(storage);
    expect(loadStores(storage)).toEqual({
      deviceMemory: FACTORY_DEVICE_MEMORY,
      session: null,
      truppzuordnung: BLANK_TRUPPZUORDNUNG,
    });
  });
});

describe("incompatible stored session data", () => {
  function sessionJson(changes: Readonly<Record<string, unknown>>): string {
    return JSON.stringify({
      version: 5,
      ...MID_EINSATZ,
      einsatzprotokolle: undefined,
      nextEinsatznummer: undefined,
      truppzuordnung: TRUPPZUORDNUNG,
      ...changes,
    });
  }

  // decided in "Decide what survives a page reload": discarded in full, never migrated
  it.each([
    ["is not JSON", "{not json"],
    ["has no version", sessionJson({ version: undefined })],
    ["has an old version", sessionJson({ version: 1 })],
    [
      "has version 3, with an Alarm queue of bare Truppnummern",
      sessionJson({
        version: 3,
        pendingAlarms: [2, 4],
        alarmSilenced: undefined,
      }),
    ],
    [
      "has version 2, without the Truppzuordnung",
      sessionJson({ version: 2, truppzuordnung: undefined }),
    ],
    [
      "has version 4, with a Truppzuordnung of one-field rows",
      sessionJson({
        version: 4,
        truppzuordnung: ["", "HLF AT – Müller/Schmidt", "", "LF WT", "", ""],
      }),
    ],
    [
      "has a Truppzuordnung of one-field rows",
      sessionJson({ truppzuordnung: ["", "LF WT", "", "", "", ""] }),
    ],
    [
      "has a Truppzuordnung with five rows",
      sessionJson({ truppzuordnung: TRUPPZUORDNUNG.slice(1) }),
    ],
    [
      "has a Truppzuordnung row without its Auftrag",
      sessionJson({
        truppzuordnung: [{ ort: "Keller" }, ...TRUPPZUORDNUNG.slice(1)],
      }),
    ],
    [
      "has a Truppzuordnung Ort that is no text",
      sessionJson({
        truppzuordnung: [{ ort: 1, auftrag: "" }, ...TRUPPZUORDNUNG.slice(1)],
      }),
    ],
    [
      "has a Truppzuordnung Ort longer than 40 characters",
      sessionJson({
        truppzuordnung: [
          { ort: "x".repeat(41), auftrag: "" },
          ...TRUPPZUORDNUNG.slice(1),
        ],
      }),
    ],
    [
      "has a Truppzuordnung Auftrag longer than 40 characters",
      sessionJson({
        truppzuordnung: [
          { ort: "", auftrag: "x".repeat(41) },
          ...TRUPPZUORDNUNG.slice(1),
        ],
      }),
    ],
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
    [
      "shows S12 with no Alarm pending",
      sessionJson({ pendingAlarms: [], alarmSilenced: false }),
    ],
    [
      "has an Alarm pending for no logged-in Trupp",
      sessionJson({
        pendingAlarms: [{ truppnummer: 5, cause: "alarmgrenze1" }],
      }),
    ],
    [
      "has an Alarm with an unknown cause",
      sessionJson({
        pendingAlarms: [{ truppnummer: 2, cause: "alarmgrenze3" }],
      }),
    ],
    [
      "has a first OK that is no yes or no",
      sessionJson({ alarmSilenced: "ja" }),
    ],
    [
      "has a first OK given with no Alarm pending",
      sessionJson({
        screen: "anmeldefenster",
        pendingAlarms: [],
        alarmSilenced: true,
      }),
    ],
    [
      "has a Trupp with an Einsatzzeit the device does not offer",
      sessionJson({
        trupps: MID_EINSATZ.trupps.map((trupp) => ({
          ...trupp,
          einsatzzeitMs: 3_600_000,
        })),
      }),
    ],
    [
      "shows the Anmeldefenster without a login",
      sessionJson({ screen: "anmeldefenster", login: null }),
    ],
    ["has an unknown SERVICE item", sessionJson({ serviceAktion: "drucken" })],
    [
      "has a negative Einsatzprotokoll scroll position",
      sessionJson({ einsatzprotokollFirstLine: -1 }),
    ],
    [
      "shows SERVICE without an item under the bar",
      sessionJson({ screen: "service", serviceAktion: null }),
    ],
    [
      "shows the Einsatzprotokoll screen without an item under the bar",
      sessionJson({ screen: "einsatzprotokoll", serviceAktion: null }),
    ],
    [
      "shows the Trupp-Menü without a Trupp selected",
      sessionJson({ screen: "truppMenue", selectedTruppnummer: null }),
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
      truppzuordnung: BLANK_TRUPPZUORDNUNG,
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
      truppzuordnung: BLANK_TRUPPZUORDNUNG,
    });
    expect(storage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe("browser storage that is blocked or full", () => {
  class BlockedStorage extends MemoryStorage {
    override getItem(): string | null {
      throw new DOMException("", "SecurityError");
    }
  }

  class FullStorage extends MemoryStorage {
    override setItem(): void {
      throw new DOMException("", "QuotaExceededError");
    }

    override removeItem(): void {
      throw new DOMException("", "SecurityError");
    }
  }

  // decided in the issue #28 branch review: the simulator runs without storage
  it("starts from the factory device memory and no session when it cannot be read", () => {
    expect(loadStores(new BlockedStorage())).toEqual({
      deviceMemory: FACTORY_DEVICE_MEMORY,
      session: null,
      truppzuordnung: BLANK_TRUPPZUORDNUNG,
    });
  });

  // decided in the issue #28 branch review: the simulator runs without storage
  it("drops the writes it cannot take", () => {
    const storage = new FullStorage();
    expect(() => {
      saveSession(storage, MID_EINSATZ, TRUPPZUORDNUNG);
      saveDeviceMemory(storage, DEVICE_MEMORY);
      discardSession(storage);
    }).not.toThrow();
  });
});

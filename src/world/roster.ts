import { truppOfTally } from "../core/index";
import type { Event, State } from "../core/index";

/** A Roster Tally's role, as the Roster table names it. */
export type Role =
  | "Angriffstruppführer"
  | "Angriffstruppmann"
  | "Wassertruppführer"
  | "Wassertruppmann";

/**
 * A Fahrzeug of the Roster: its Funkrufname for the world panel, its Kurzname for the LCD, and
 * the identity it keeps from being added until it is removed.
 */
export interface Fahrzeug {
  readonly id: string;
  readonly funkrufname: string;
  readonly kurzname: string;
}

/** The Roster's one to four Fahrzeuge, in Roster order. */
export type Fahrzeuge = readonly Fahrzeug[];

/** One of the Roster's Tallys: the role it stands for on one Fahrzeug. */
export interface RosterTally {
  readonly tallyId: string;
  readonly fahrzeugId: string;
  readonly role: Role;
}

// The role codes and default names, decided in "Decide the contents of the fixed Tally roster".
const ROLE_CODES: Readonly<Record<Role, string>> = {
  Angriffstruppführer: "AT-F",
  Angriffstruppmann: "AT-M",
  Wassertruppführer: "WT-F",
  Wassertruppmann: "WT-M",
};

const ROLES: readonly Role[] = [
  "Angriffstruppführer",
  "Angriffstruppmann",
  "Wassertruppführer",
  "Wassertruppmann",
];

/** The most Fahrzeuge the Roster holds. Decided in "Let the Trainee add and remove Fahrzeuge". */
export const MAX_FAHRZEUGE = 4;

// The names a new Fahrzeug is prefilled with, decided in "Let the Trainee add and remove
// Fahrzeuge", point 6. Four names, so one is always free while fewer than four Fahrzeuge exist.
const PREFILLS: readonly Omit<Fahrzeug, "id">[] = [
  { funkrufname: "1/43", kurzname: "HLF" },
  { funkrufname: "1/45", kurzname: "LF" },
  { funkrufname: "1/33", kurzname: "DLK" },
  { funkrufname: "1/23", kurzname: "TLF" },
];

/** The Fahrzeuge until the Trainee changes them. */
export const DEFAULT_FAHRZEUGE: Fahrzeuge = PREFILLS.slice(0, 2).map(
  (prefill, index) => ({ id: String(index + 1), ...prefill }),
);

/**
 * The longest Kurzname, so the longest LCD text (`<Kurzname> AT-F`) fits a line. Decided in
 * "Decide the contents of the fixed Tally roster".
 */
export const KURZNAME_MAX_LENGTH = 10;

// ASSUMPTION: a Kurzname may use only the characters the LCD font draws (printable ASCII plus
// the German umlauts and ß), so no name can break the LCD; decided while implementing #38.
const KURZNAME_PATTERN = /^[\x20-\x7EÄÖÜäöüß]+$/;

/**
 * The Roster Tallys in shortcut order: each Fahrzeug's four Tallys, Fahrzeug by Fahrzeug. A
 * Tally's id derives from its Fahrzeug's identity, so it survives the removal of another
 * Fahrzeug.
 */
export function rosterTallys(fahrzeuge: Fahrzeuge): readonly RosterTally[] {
  return fahrzeuge.flatMap((fahrzeug) =>
    ROLES.map((role) => ({
      tallyId: `${fahrzeug.id}/${ROLE_CODES[role]}`,
      fahrzeugId: fahrzeug.id,
      role,
    })),
  );
}

/** The event of tapping a Roster Tally on Check; the Checkbox reads the LCD text stored on it. */
export function tallyHeld(tally: RosterTally, fahrzeuge: Fahrzeuge): Event {
  const fahrzeug = fahrzeuge.find(
    (candidate) => candidate.id === tally.fahrzeugId,
  );
  if (fahrzeug === undefined) {
    throw new Error(`The Roster has no Fahrzeug ${tally.fahrzeugId}`);
  }
  return {
    type: "tallyHeld",
    tallyId: tally.tallyId,
    name: `${fahrzeug.kurzname} ${ROLE_CODES[tally.role]}`,
  };
}

/** The role code a Roster Tally's fob shows, e.g. `AT-F`. */
export function roleCode(tally: RosterTally): string {
  return ROLE_CODES[tally.role];
}

/** Whether the Roster has room for another Fahrzeug. */
export function canAddFahrzeug(fahrzeuge: Fahrzeuge): boolean {
  return fahrzeuge.length < MAX_FAHRZEUGE;
}

/**
 * The Roster with a new Fahrzeug appended, prefilled with the first names whose Kurzname is
 * free. A full Roster is returned unchanged.
 */
export function addFahrzeug(fahrzeuge: Fahrzeuge): Fahrzeuge {
  if (!canAddFahrzeug(fahrzeuge)) {
    return fahrzeuge;
  }
  const taken = new Set(fahrzeuge.map((fahrzeug) => kurznameKey(fahrzeug)));
  const prefill = PREFILLS.find(
    (candidate) => !taken.has(kurznameKey(candidate)),
  );
  if (prefill === undefined) {
    throw new Error("Every prefill's Kurzname is taken");
  }
  // One above the highest id in use, so a new Fahrzeug never takes a present Fahrzeug's Tallys.
  // ASSUMPTION: a removed Fahrzeug's id may come back; it was not in use, and Einsatzprotokolle
  // keep their own copy of the LCD name, so nothing refers to it any more. Decided while
  // implementing #44.
  const id = String(
    Math.max(0, ...fahrzeuge.map((fahrzeug) => Number(fahrzeug.id))) + 1,
  );
  return [...fahrzeuge, { id, ...prefill }];
}

/** The Roster without the Fahrzeug of this id. */
export function removeFahrzeug(fahrzeuge: Fahrzeuge, id: string): Fahrzeuge {
  return fahrzeuge.filter((fahrzeug) => fahrzeug.id !== id);
}

/** Why a Fahrzeug cannot be removed: it is the last one, or one of its Tallys is in use. */
export type RemovalBlocker = "lastFahrzeug" | "inUse";

/** What keeps the Fahrzeug of this id from being removed, if anything. */
export function removalBlocker(
  state: State,
  fahrzeuge: Fahrzeuge,
  id: string,
): RemovalBlocker | undefined {
  if (fahrzeuge.length <= 1) {
    return "lastFahrzeug";
  }
  // Decided in "Let the Trainee add and remove Fahrzeuge", point 2: a logged-in Trupp or the
  // open Anmeldefenster, not an Einsatzprotokoll.
  const inUse = rosterTallys(fahrzeuge).some(
    (tally) =>
      tally.fahrzeugId === id && truppHint(state, tally).kind !== "notLoggedIn",
  );
  return inUse ? "inUse" : undefined;
}

/**
 * Whether a Fahrzeug's names can be kept: a Funkrufname that is not blank, and a Kurzname of at
 * most {@link KURZNAME_MAX_LENGTH} characters that the LCD can show.
 */
export function isValidFahrzeug(fahrzeug: Omit<Fahrzeug, "id">): boolean {
  // ASSUMPTION: neither name may be blank, so every Tally keeps a readable label; decided while
  // implementing #38.
  return (
    fahrzeug.funkrufname.trim() !== "" &&
    fahrzeug.kurzname.trim() !== "" &&
    fahrzeug.kurzname.length <= KURZNAME_MAX_LENGTH &&
    KURZNAME_PATTERN.test(fahrzeug.kurzname)
  );
}

/** Whether another Fahrzeug of the Roster has this Fahrzeug's Kurzname, trimmed and ignoring case. */
export function hasDuplicateKurzname(
  fahrzeuge: Fahrzeuge,
  fahrzeug: Fahrzeug,
): boolean {
  return fahrzeuge.some(
    (other) =>
      other.id !== fahrzeug.id && kurznameKey(other) === kurznameKey(fahrzeug),
  );
}

/**
 * Whether the Roster can be kept: one to {@link MAX_FAHRZEUGE} valid Fahrzeuge, each with its
 * own identity (a positive whole number) and Kurzname.
 */
export function isValidRoster(fahrzeuge: Fahrzeuge): boolean {
  return (
    fahrzeuge.every((fahrzeug) => /^[1-9][0-9]*$/.test(fahrzeug.id)) &&
    fahrzeuge.length >= 1 &&
    fahrzeuge.length <= MAX_FAHRZEUGE &&
    new Set(fahrzeuge.map((fahrzeug) => fahrzeug.id)).size ===
      fahrzeuge.length &&
    fahrzeuge.every(
      (fahrzeug) =>
        isValidFahrzeug(fahrzeug) && !hasDuplicateKurzname(fahrzeuge, fahrzeug),
    )
  );
}

function kurznameKey(fahrzeug: Pick<Fahrzeug, "kurzname">): string {
  return fahrzeug.kurzname.trim().toLowerCase();
}

/** The read-only hint of which Trupp a Roster Tally belongs to, and how its fob shows it. */
export interface TruppHint {
  readonly kind: "notLoggedIn" | "joining" | "inTrupp";
  readonly text: string;
}

/** The read-only hint of which Trupp a Roster Tally belongs to. */
export function truppHint(state: State, tally: RosterTally): TruppHint {
  const trupp = truppOfTally(state, tally.tallyId);
  if (trupp !== undefined) {
    return {
      kind: "inTrupp",
      text: `Trupp ${formatTruppnummer(trupp.truppnummer)}`,
    };
  }
  const login = state.login;
  if (
    login?.atemschutztraeger.some(
      (candidate) => candidate.tallyId === tally.tallyId,
    )
  ) {
    return {
      kind: "joining",
      text: `Anmeldung Trupp ${formatTruppnummer(login.truppnummer)}`,
    };
  }
  return { kind: "notLoggedIn", text: "nicht angemeldet" };
}

function formatTruppnummer(truppnummer: number): string {
  return String(truppnummer).padStart(2, "0");
}

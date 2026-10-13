import { truppOfTally } from "../core/index";
import type { Event, State } from "../core/index";

/** A Roster Tally's role, as the Roster table names it. */
export type Role =
  | "Angriffstruppführer"
  | "Angriffstruppmann"
  | "Wassertruppführer"
  | "Wassertruppmann";

/** A vehicle's names: its Funkrufname for the world panel and its Kurzname for the LCD. */
export interface Vehicle {
  readonly funkrufname: string;
  readonly kurzname: string;
}

/** The Roster's two vehicles, in Roster order. */
export type Vehicles = readonly [Vehicle, Vehicle];

/** One of the Roster's Tallys: the role it stands for on one of the two vehicles. */
export interface RosterTally {
  readonly tallyId: string;
  readonly vehicleIndex: 0 | 1;
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

/** The vehicles' names until the Trainee changes them. */
export const DEFAULT_VEHICLES: Vehicles = [
  { funkrufname: "HLF", kurzname: "HLF" },
  { funkrufname: "LF", kurzname: "LF" },
];

/**
 * The longest Kurzname, so the longest LCD text (`<Kurzname> AT-F`) fits a line. Decided in
 * "Decide the contents of the fixed Tally roster".
 */
export const KURZNAME_MAX_LENGTH = 10;

// ASSUMPTION: a Kurzname may use only the characters the LCD font draws (printable ASCII plus
// the German umlauts and ß), so no name can break the LCD; decided while implementing #38.
const KURZNAME_PATTERN = /^[\x20-\x7EÄÖÜäöüß]+$/;

/**
 * The eight Roster Tallys in shortcut order `1`–`8`. Decided in "Decide the contents of the
 * fixed Tally roster".
 */
export const ROSTER: readonly RosterTally[] = ([0, 1] as const).flatMap(
  (vehicleIndex) =>
    ROLES.map((role, roleIndex) => ({
      tallyId: String(vehicleIndex * ROLES.length + roleIndex + 1),
      vehicleIndex,
      role,
    })),
);

/** The event of tapping a Roster Tally on Check; the Checkbox reads the LCD text stored on it. */
export function tallyHeld(tally: RosterTally, vehicles: Vehicles): Event {
  return {
    type: "tallyHeld",
    tallyId: tally.tallyId,
    name: `${vehicles[tally.vehicleIndex].kurzname} ${ROLE_CODES[tally.role]}`,
  };
}

/** How the world panel names a Roster Tally, e.g. "HLF · Angriffstruppführer". */
export function rosterLabel(tally: RosterTally, vehicles: Vehicles): string {
  return `${vehicles[tally.vehicleIndex].funkrufname} · ${tally.role}`;
}

/**
 * Whether a vehicle's names can be kept: a Funkrufname that is not blank, and a Kurzname of at
 * most {@link KURZNAME_MAX_LENGTH} characters that the LCD can show.
 */
export function isValidVehicle(vehicle: Vehicle): boolean {
  // ASSUMPTION: neither name may be blank, so every Tally keeps a readable label; decided while
  // implementing #38.
  return (
    vehicle.funkrufname.trim() !== "" &&
    vehicle.kurzname.trim() !== "" &&
    vehicle.kurzname.length <= KURZNAME_MAX_LENGTH &&
    KURZNAME_PATTERN.test(vehicle.kurzname)
  );
}

/** The read-only hint of which Trupp a Roster Tally belongs to. */
export function truppHint(state: State, tally: RosterTally): string {
  const trupp = truppOfTally(state, tally.tallyId);
  if (trupp !== undefined) {
    return `Trupp ${formatTruppnummer(trupp.truppnummer)}`;
  }
  const login = state.login;
  if (
    login?.atemschutztraeger.some(
      (candidate) => candidate.tallyId === tally.tallyId,
    )
  ) {
    return `Anmeldung Trupp ${formatTruppnummer(login.truppnummer)}`;
  }
  return "nicht angemeldet";
}

function formatTruppnummer(truppnummer: number): string {
  return String(truppnummer).padStart(2, "0");
}

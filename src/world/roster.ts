import { truppOfTally } from "../core/index";
import type { Event, State } from "../core/index";

/** A Roster Tally's role, as the Roster table names it. */
export type Role =
  | "Angriffstruppführer"
  | "Angriffstruppmann"
  | "Wassertruppführer"
  | "Wassertruppmann";

/** One of the Roster's Tallys: the role it stands for on one vehicle. */
export interface RosterTally {
  readonly tallyId: string;
  readonly funkrufname: string;
  readonly kurzname: string;
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

const VEHICLES = [
  { funkrufname: "HLF", kurzname: "HLF" },
  { funkrufname: "LF", kurzname: "LF" },
] as const;

/**
 * The eight Roster Tallys in shortcut order `1`–`8`. Decided in "Decide the contents of the
 * fixed Tally roster".
 */
export const ROSTER: readonly RosterTally[] = VEHICLES.flatMap(
  (vehicle, vehicleIndex) =>
    ROLES.map((role, roleIndex) => ({
      tallyId: String(vehicleIndex * ROLES.length + roleIndex + 1),
      ...vehicle,
      role,
    })),
);

/** The event of tapping a Roster Tally on Check; the Checkbox reads the LCD text stored on it. */
export function tallyHeld(tally: RosterTally): Event {
  return {
    type: "tallyHeld",
    tallyId: tally.tallyId,
    name: `${tally.kurzname} ${ROLE_CODES[tally.role]}`,
  };
}

/** How the world panel names a Roster Tally, e.g. "HLF · Angriffstruppführer". */
export function rosterLabel(tally: RosterTally): string {
  return `${tally.funkrufname} · ${tally.role}`;
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

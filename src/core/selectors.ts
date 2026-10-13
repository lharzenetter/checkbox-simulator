import { SICHER_PHASE_MS } from "./parameters";
import type { Einsatzstatus, State, Trupp, TruppMenueAktion } from "./state";

/** The logged-in Trupp whose Atemschutzträger holds the Tally, if any. */
export function truppOfTally(state: State, tallyId: string): Trupp | undefined {
  return state.trupps.find((trupp) =>
    trupp.atemschutztraeger.some(
      (atemschutztraeger) => atemschutztraeger.tallyId === tallyId,
    ),
  );
}

/** The Trupp ABMELDEN is logging off; only valid while ABMELDEN is open. */
export function truppLoggingOff(state: State): Trupp {
  const truppnummer = state.logoff?.truppnummer;
  const trupp = state.trupps.find(
    (candidate) => candidate.truppnummer === truppnummer,
  );
  if (trupp === undefined) {
    throw new Error(`The ${state.screen} screen logs no Trupp off`);
  }
  return trupp;
}

/**
 * Whether the Einsatzliste shows `SICHER` in the Trupp's row now, instead of its Statussymbol.
 * The alternation runs on real time and starts with `SICHER` when the screen is entered.
 */
// manual 5.3.1 step 4; timing-and-alarm-rules §9, 9.1
export function isSicherShown(state: State, trupp: Trupp): boolean {
  const phase = Math.floor(
    (state.realNow - state.screenEnteredRealMs) / SICHER_PHASE_MS,
  );
  return trupp.sicherheitstrupp && phase % 2 === 0;
}

/** The Trupp selected on the Einsatzliste; only valid while one is. */
export function selectedTrupp(state: State): Trupp {
  const trupp = state.trupps.find(
    (candidate) => candidate.truppnummer === state.selectedTruppnummer,
  );
  if (trupp === undefined) {
    throw new Error(`The ${state.screen} screen has no Trupp selected`);
  }
  return trupp;
}

// decided in "Define the key-by-screen navigation model", its Trupp-Menü table
const TRUPP_MENUE_AKTIONEN: Readonly<
  Record<Einsatzstatus, readonly TruppMenueAktion[]>
> = {
  anmarsch: [
    "truppEinsatz",
    "truppBereitschaft",
    "einsatzzielErreicht",
    "rueckzugAntreten",
    "flaschendruckAendern",
    "attributeEintragen",
  ],
  bereitschaft: [
    "truppEinsatz",
    "truppBereitschaft",
    "flaschendruckAendern",
    "attributeEintragen",
  ],
};

/** The Trupp-Menü's items for the selected Trupp, top to bottom. */
export function truppMenueAktionen(state: State): readonly TruppMenueAktion[] {
  return TRUPP_MENUE_AKTIONEN[selectedTrupp(state).einsatzstatus];
}

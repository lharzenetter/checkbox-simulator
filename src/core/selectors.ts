import { SICHER_PHASE_MS } from "./parameters";
import type { State, Trupp } from "./state";

/** The logged-in Trupp whose Atemschutzträger holds the Tally, if any. */
export function truppOfTally(state: State, tallyId: string): Trupp | undefined {
  return state.trupps.find((trupp) =>
    trupp.atemschutztraeger.some(
      (atemschutztraeger) => atemschutztraeger.tallyId === tallyId,
    ),
  );
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

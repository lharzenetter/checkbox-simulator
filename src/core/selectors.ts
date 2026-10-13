import type { State, Trupp } from "./state";

/** The logged-in Trupp whose Atemschutzträger holds the Tally, if any. */
export function truppOfTally(state: State, tallyId: string): Trupp | undefined {
  return state.trupps.find((trupp) =>
    trupp.atemschutztraeger.some(
      (atemschutztraeger) => atemschutztraeger.tallyId === tallyId,
    ),
  );
}

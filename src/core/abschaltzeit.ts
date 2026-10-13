import { ABSCHALTZEIT_MS } from "./parameters";
import type { State } from "./state";

/** Real milliseconds left of the Abschaltzeit, never negative; `null` while none runs. */
export function abschaltzeitRestMs(state: State): number | null {
  if (state.screen !== "startdisplay") {
    return null;
  }
  const elapsedMs = state.realNow - state.screenEnteredRealMs;
  return Math.max(0, ABSCHALTZEIT_MS - elapsedMs);
}

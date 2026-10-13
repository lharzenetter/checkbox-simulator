import { ABSCHALTZEIT_MS } from "./parameters";
import type { State } from "./state";

/** Real milliseconds left of the Abschaltzeit, never negative; `null` while none runs. */
export function abschaltzeitRestMs(state: State): number | null {
  if (!isAbschaltzeitRunning(state)) {
    return null;
  }
  const elapsedMs = state.realNow - state.screenEnteredRealMs;
  return Math.max(0, ABSCHALTZEIT_MS - elapsedMs);
}

// manual p. 34: the empty Einsatzliste switches off like the Startdisplay
function isAbschaltzeitRunning(state: State): boolean {
  return (
    state.screen === "startdisplay" ||
    (state.screen === "einsatzliste" && state.trupps.length === 0)
  );
}

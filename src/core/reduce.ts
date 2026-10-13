import { abschaltzeitRestMs } from "./abschaltzeit";
import { assertNever } from "./assert-never";
import type { Event, Key } from "./event";
import type { Screen, State } from "./state";

/** Applies one event to the device state. Input with no meaning on the current screen is ignored. */
export function reduce(state: State, event: Event): State {
  switch (event.type) {
    case "keyPressed":
      return handleKeyPress(state, event.key);
    case "tick":
      return handleTick({ ...state, now: event.now, realNow: event.realNow });
    default:
      return assertNever(event);
  }
}

function handleKeyPress(state: State, key: Key): State {
  switch (state.screen) {
    case "aus":
      return key === "Check" ? enterScreen(state, "startdisplay") : state;
    case "startdisplay":
      return key === "OK" ? enterScreen(state, "service") : state;
    case "service":
      return key === "X" ? enterScreen(state, "startdisplay") : state;
    default:
      return assertNever(state.screen);
  }
}

function handleTick(state: State): State {
  return abschaltzeitRestMs(state) === 0 ? enterScreen(state, "aus") : state;
}

// ASSUMPTION: entering a screen restarts its display timing, so returning to the Startdisplay
// from SERVICE shows the full Abschaltzeit again; the manual leaves SERVICE's timing open
// (LCD screen catalogue, S02).
function enterScreen(state: State, screen: Screen): State {
  return { ...state, screen, screenEnteredRealMs: state.realNow };
}

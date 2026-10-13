import { useEffect } from "react";
import type { Key } from "../core/index";

// The keyboard letters for the device keys and the number keys for the Roster Tallys, decided
// in "Design how the Trainee handles Tallys and the clock". Every keyboard shortcut goes
// through this one map.
const KEYBOARD_KEYS: Readonly<Partial<Record<string, Key>>> = {
  a: "Up",
  b: "Down",
  c: "OK",
  d: "X",
  e: "Check",
};

const TALLY_KEYS: Readonly<Partial<Record<string, number>>> = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
  "6": 5,
  "7": 6,
  "8": 7,
};

export function useKeyMap({
  onKeyPressed,
  onTallyKeyPressed,
}: {
  onKeyPressed: (key: Key) => void;
  /** Called with the Roster index of the Tally whose number key was pressed. */
  onTallyKeyPressed: (rosterIndex: number) => void;
}): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const key = KEYBOARD_KEYS[event.key.toLowerCase()];
      const rosterIndex = TALLY_KEYS[event.key];
      if (key !== undefined) {
        event.preventDefault();
        onKeyPressed(key);
      } else if (rosterIndex !== undefined) {
        event.preventDefault();
        onTallyKeyPressed(rosterIndex);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onKeyPressed, onTallyKeyPressed]);
}

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
  enabled,
  onKeyPressed,
  onKeyReleased,
  onTallyKeyPressed,
}: {
  /** Off while a dialog is open, so typing a name presses no device key. */
  enabled: boolean;
  onKeyPressed: (key: Key) => void;
  // The Notausschaltung needs X and Check held, so the core hears when a key goes up.
  onKeyReleased: (key: Key) => void;
  /** Called with the Roster index of the Tally whose number key was pressed. */
  onTallyKeyPressed: (rosterIndex: number) => void;
}): void {
  useEffect(() => {
    // A window that loses focus, or a key map switched off, never sees the key-up, so every key
    // counts as released.
    function releaseAll(): void {
      for (const key of Object.values(KEYBOARD_KEYS)) {
        if (key !== undefined) {
          onKeyReleased(key);
        }
      }
    }
    if (!enabled) {
      releaseAll();
      return;
    }
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
    function handleKeyUp(event: KeyboardEvent): void {
      const key = KEYBOARD_KEYS[event.key.toLowerCase()];
      if (key !== undefined) {
        onKeyReleased(key);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", releaseAll);
    };
  }, [enabled, onKeyPressed, onKeyReleased, onTallyKeyPressed]);
}

import { useEffect } from "react";
import type { Key } from "../core/index";

// The keyboard letters for the device keys, decided in "Design how the Trainee handles Tallys
// and the clock". Every keyboard shortcut goes through this one map.
const KEYBOARD_KEYS: Readonly<Partial<Record<string, Key>>> = {
  a: "Up",
  b: "Down",
  c: "OK",
  d: "X",
  e: "Check",
};

export function useKeyMap(onKeyPressed: (key: Key) => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const key = KEYBOARD_KEYS[event.key.toLowerCase()];
      if (key !== undefined) {
        event.preventDefault();
        onKeyPressed(key);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onKeyPressed]);
}

import { useEffect } from "react";
import type { Key } from "../core/index";
import {
  DEVICE_KEY_BINDINGS,
  deviceKeyBindingFor,
  tallyIndexFor,
} from "./keyboard-bindings";

// A control outside the front panel keeps Enter and Space, so the side controls stay
// usable from the keyboard.
function focusedControlKeeps(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.matches("button, input, select, textarea, a[href]") &&
    target.closest("[data-front-panel]") === null
  );
}

export function useKeyMap({
  enabled,
  onKeyPressed,
  onKeyReleased,
  onTallyKeyPressed,
}: {
  // Off while a dialog is open, so typing a name presses no device key.
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
      for (const binding of DEVICE_KEY_BINDINGS) {
        onKeyReleased(binding.key);
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
      const binding = deviceKeyBindingFor(event.key);
      const rosterIndex = tallyIndexFor(event.key);
      if (binding !== undefined) {
        if (
          binding.yieldsToFocusedControl &&
          focusedControlKeeps(event.target)
        ) {
          return;
        }
        event.preventDefault();
        onKeyPressed(binding.key);
      } else if (rosterIndex !== undefined) {
        event.preventDefault();
        onTallyKeyPressed(rosterIndex);
      }
    }
    function handleKeyUp(event: KeyboardEvent): void {
      const binding = deviceKeyBindingFor(event.key);
      if (binding === undefined) {
        return;
      }
      // Space clicks a focused button on key-up; on a front-panel key that would press it twice.
      if (
        !binding.yieldsToFocusedControl ||
        !focusedControlKeeps(event.target)
      ) {
        event.preventDefault();
      }
      onKeyReleased(binding.key);
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

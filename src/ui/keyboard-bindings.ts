import type { Key } from "../core/index";

// The keyboard bindings for the device keys and the Roster Tallys, decided in "Design how the
// Trainee handles Tallys and the clock". The key map, the front panel's aria-keyshortcuts and
// the Tastenkürzel dialog all read from here.

interface KeyboardKey {
  // KeyboardEvent.key, lower-cased.
  readonly eventKey: string;
  // The name aria-keyshortcuts uses.
  readonly ariaName: string;
  readonly label: string;
  // Enter and Space also activate a focused button, so on a control outside the front panel
  // they keep that meaning.
  readonly yieldsToFocusedControl: boolean;
}

interface DeviceKeyBinding {
  readonly key: Key;
  readonly keyboardKeys: readonly KeyboardKey[];
}

function letter(value: string): KeyboardKey {
  return {
    eventKey: value,
    ariaName: value.toUpperCase(),
    label: value.toUpperCase(),
    yieldsToFocusedControl: false,
  };
}

export const DEVICE_KEY_BINDINGS: readonly DeviceKeyBinding[] = [
  {
    key: "Up",
    keyboardKeys: [
      {
        eventKey: "arrowup",
        ariaName: "ArrowUp",
        label: "↑",
        yieldsToFocusedControl: false,
      },
      letter("a"),
    ],
  },
  {
    key: "Down",
    keyboardKeys: [
      {
        eventKey: "arrowdown",
        ariaName: "ArrowDown",
        label: "↓",
        yieldsToFocusedControl: false,
      },
      letter("b"),
    ],
  },
  {
    key: "OK",
    keyboardKeys: [
      {
        eventKey: "enter",
        ariaName: "Enter",
        label: "Enter",
        yieldsToFocusedControl: true,
      },
      letter("c"),
    ],
  },
  {
    key: "X",
    keyboardKeys: [
      {
        eventKey: "escape",
        ariaName: "Escape",
        label: "Esc",
        yieldsToFocusedControl: false,
      },
      letter("d"),
    ],
  },
  {
    key: "Check",
    keyboardKeys: [
      {
        eventKey: " ",
        ariaName: "Space",
        label: "Leertaste",
        yieldsToFocusedControl: true,
      },
      letter("e"),
    ],
  },
];

export const TALLY_KEY_COUNT = 8;

export function deviceKeyBindingFor(
  eventKey: string,
): { key: Key; yieldsToFocusedControl: boolean } | undefined {
  const normalised = eventKey.toLowerCase();
  for (const binding of DEVICE_KEY_BINDINGS) {
    const keyboardKey = binding.keyboardKeys.find(
      (candidate) => candidate.eventKey === normalised,
    );
    if (keyboardKey !== undefined) {
      return {
        key: binding.key,
        yieldsToFocusedControl: keyboardKey.yieldsToFocusedControl,
      };
    }
  }
  return undefined;
}

/** The Roster index of the Tally whose number key this is. */
export function tallyIndexFor(eventKey: string): number | undefined {
  const number = Number(eventKey);
  return /^[1-9]$/.test(eventKey) && number <= TALLY_KEY_COUNT
    ? number - 1
    : undefined;
}

export function keyShortcutsFor(key: Key): string {
  const binding = DEVICE_KEY_BINDINGS.find(
    (candidate) => candidate.key === key,
  );
  return (binding?.keyboardKeys ?? [])
    .map((keyboardKey) => keyboardKey.ariaName)
    .join(" ");
}

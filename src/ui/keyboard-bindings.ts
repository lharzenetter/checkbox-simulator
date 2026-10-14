import type { Key } from "../core/index";

// The keyboard bindings for the device keys, the clock and the Roster Tallys, decided in "Design
// how the Trainee handles Tallys and the clock". The key map, the aria-keyshortcuts and the
// Tastenkürzel dialog all read from here.

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

export type ClockAction = "faster" | "slower" | "togglePause";

interface ClockKeyBinding {
  readonly action: ClockAction;
  readonly label: string;
  readonly keyboardKey: KeyboardKey;
}

export const CLOCK_KEY_BINDINGS: readonly ClockKeyBinding[] = [
  {
    action: "faster",
    label: "Schneller",
    keyboardKey: {
      eventKey: "arrowright",
      ariaName: "ArrowRight",
      label: "→",
      yieldsToFocusedControl: false,
    },
  },
  {
    action: "slower",
    label: "Langsamer",
    keyboardKey: {
      eventKey: "arrowleft",
      ariaName: "ArrowLeft",
      label: "←",
      yieldsToFocusedControl: false,
    },
  },
  {
    action: "togglePause",
    label: "Pause / Weiter",
    keyboardKey: letter("p"),
  },
];

// The number keys per Shift level: two Fahrzeuge of four Tallys each.
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

export function clockActionFor(eventKey: string): ClockAction | undefined {
  const normalised = eventKey.toLowerCase();
  return CLOCK_KEY_BINDINGS.find(
    (binding) => binding.keyboardKey.eventKey === normalised,
  )?.action;
}

/**
 * The Roster index of the Tally whose number key this is. Decided in "Let the Trainee add and
 * remove Fahrzeuge", point 4.
 */
export function tallyIndexFor(event: {
  key: string;
  code: string;
  shiftKey: boolean;
}): number | undefined {
  // Shift changes the character on German layouts, so a shifted digit is read off the
  // physical key.
  const digit = event.shiftKey
    ? /^Digit([1-9])$/.exec(event.code)?.[1]
    : /^[1-9]$/.exec(event.key)?.[0];
  const number = Number(digit);
  if (digit === undefined || number > TALLY_KEY_COUNT) {
    return undefined;
  }
  return (event.shiftKey ? TALLY_KEY_COUNT : 0) + number - 1;
}

/** A Tally's number key, as its fob shows it and as aria-keyshortcuts names it. */
export interface TallyKey {
  readonly label: string;
  readonly ariaName: string;
}

/** The number key that taps the Roster Tally at this index. */
export function tallyKeyFor(rosterIndex: number): TallyKey {
  const digit = String((rosterIndex % TALLY_KEY_COUNT) + 1);
  return rosterIndex < TALLY_KEY_COUNT
    ? { label: digit, ariaName: digit }
    : { label: `⇧${digit}`, ariaName: `Shift+${digit}` };
}

export function clockKeyShortcutFor(action: ClockAction): string {
  return (
    CLOCK_KEY_BINDINGS.find((binding) => binding.action === action)?.keyboardKey
      .ariaName ?? ""
  );
}

export function keyShortcutsFor(key: Key): string {
  const binding = DEVICE_KEY_BINDINGS.find(
    (candidate) => candidate.key === key,
  );
  return (binding?.keyboardKeys ?? [])
    .map((keyboardKey) => keyboardKey.ariaName)
    .join(" ");
}

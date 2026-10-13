export type Key = "Up" | "Down" | "OK" | "X" | "Check";

/** The events the device core reacts to, named for what happened. */
export type Event =
  /** A key went down; it counts as held until its `keyReleased`. */
  | { readonly type: "keyPressed"; readonly key: Key }
  | { readonly type: "keyReleased"; readonly key: Key }
  /** A Tally tapped on Check; the Checkbox reads its id and the name stored on it. */
  | {
      readonly type: "tallyHeld";
      readonly tallyId: string;
      readonly name: string;
    }
  | { readonly type: "tick"; readonly now: number; readonly realNow: number };

export type Key = "Up" | "Down" | "OK" | "X" | "Check";

/** The events the device core reacts to, named for what happened. */
export type Event =
  | { readonly type: "keyPressed"; readonly key: Key }
  /** A Tally tapped on Check; the Checkbox reads its id and the name stored on it. */
  | {
      readonly type: "tallyHeld";
      readonly tallyId: string;
      readonly name: string;
    }
  | { readonly type: "tick"; readonly now: number; readonly realNow: number };

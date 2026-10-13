export type Key = "Up" | "Down" | "OK" | "X" | "Check";

/** The events the device core reacts to, named for what happened. */
export type Event =
  | { readonly type: "keyPressed"; readonly key: Key }
  | { readonly type: "tick"; readonly now: number; readonly realNow: number };

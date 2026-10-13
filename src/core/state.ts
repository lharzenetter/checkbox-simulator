/** The LCD screen the Checkbox is showing; ids S00–S02 from the LCD screen catalogue. */
export type Screen = "aus" | "startdisplay" | "service";

/** The whole device state: plain immutable data that serialises to storage as-is. */
export interface State {
  readonly screen: Screen;
  /** Simulated time of the last `tick`, see {@link Clocks}. */
  readonly now: number;
  /** Real time of the last `tick`, see {@link Clocks}. */
  readonly realNow: number;
  /** Real time at which the current screen was entered; drives the display timings. */
  readonly screenEnteredRealMs: number;
}

/**
 * The two clocks every `tick` carries, in integer milliseconds.
 *
 * `now` is simulated time, scaled by the speed control, and is the device's Uhrzeit: wall-clock
 * milliseconds since 1970-01-01 00:00 **local** time, so it can be shown without time zones.
 * `realNow` is real time from any monotonic origin and drives only the display timings.
 */
export interface Clocks {
  readonly now: number;
  readonly realNow: number;
}

/** The Checkbox as it is when a new session begins: switched off. */
export function createInitialState({ now, realNow }: Clocks): State {
  return { screen: "aus", now, realNow, screenEnteredRealMs: realNow };
}

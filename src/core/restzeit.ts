import {
  P76_DRUCK_SPRUNGGROESSE_BAR,
  P81_FLASCHENTYP_2_BAR,
} from "./parameters";
import type { Trupp } from "./state";

/** The Restzeit a Flaschendruck gives: `T × P / P_N`, timing-and-alarm-rules §1.3, 1.4. */
export function computeRestzeitMs(
  einsatzzeitMs: number,
  flaschendruckBar: number,
): number {
  return Math.round((einsatzzeitMs * flaschendruckBar) / P81_FLASCHENTYP_2_BAR);
}

/**
 * The Aktueller Flaschendruck the Trupp-Ansicht shows: `P = R × P_N / T` in whole bar, rounded
 * down and never below 0, timing-and-alarm-rules §1.7.
 */
export function estimateFlaschendruckBar(trupp: Trupp): number {
  return Math.max(
    0,
    Math.floor(
      (trupp.restzeitMs * P81_FLASCHENTYP_2_BAR) / trupp.einsatzzeitMs,
    ),
  );
}

// timing-and-alarm-rules §1.7: Druck ändern opens at the estimate, snapped down to the [76] grid
export function snapToFlaschendruckGrid(flaschendruckBar: number): number {
  return (
    Math.floor(flaschendruckBar / P76_DRUCK_SPRUNGGROESSE_BAR) *
    P76_DRUCK_SPRUNGGROESSE_BAR
  );
}

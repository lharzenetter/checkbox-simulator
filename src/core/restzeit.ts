import { P81_FLASCHENTYP_2_BAR } from "./parameters";

/** The Restzeit a Flaschendruck gives: `T × P / P_N`, timing-and-alarm-rules §1.3, 1.4. */
export function computeRestzeitMs(
  einsatzzeitMs: number,
  flaschendruckBar: number,
): number {
  return Math.round((einsatzzeitMs * flaschendruckBar) / P81_FLASCHENTYP_2_BAR);
}

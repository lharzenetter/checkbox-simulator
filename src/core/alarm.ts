import {
  P01_EINSATZZEIT_1_MS,
  P03_ALARMGRENZE_1_EINSATZZEIT_1_PROZENT,
  P04_ALARMGRENZE_2_EINSATZZEIT_1_PROZENT,
  P10_EINSATZZEIT_3_MS,
  P61_ALARMGRENZE_1_EINSATZZEIT_3_PROZENT,
  P62_ALARMGRENZE_2_EINSATZZEIT_3_PROZENT,
} from "./parameters";
import type { Trupp } from "./state";

/** Whether the Trupp, running down from `before` to `after`, reached a point that fires an Alarm. */
export function hasAlarmFired(before: Trupp, after: Trupp): boolean {
  return (
    hasReachedAlarmgrenze(before, after) || hasReachedEinsatzzeit(before, after)
  );
}

// timing-and-alarm-rules §2.2, 2.3, 2.4, 2.6: on the running time, literally, once per Einsatz,
// in every Einsatzstatus; the running time never goes back, so each is reached only once
function hasReachedAlarmgrenze(before: Trupp, after: Trupp): boolean {
  return alarmgrenzenProzent(before.einsatzzeitMs).some((prozent) => {
    const alarmgrenzeMs = (before.einsatzzeitMs * prozent) / 100;
    return (
      before.runningTimeMs < alarmgrenzeMs &&
      after.runningTimeMs >= alarmgrenzeMs
    );
  });
}

// timing-and-alarm-rules §3.1, 3.5
function hasReachedEinsatzzeit(before: Trupp, after: Trupp): boolean {
  return before.restzeitMs > 0 && after.restzeitMs <= 0;
}

function alarmgrenzenProzent(einsatzzeitMs: number): readonly number[] {
  switch (einsatzzeitMs) {
    case P01_EINSATZZEIT_1_MS:
      return [
        P03_ALARMGRENZE_1_EINSATZZEIT_1_PROZENT,
        P04_ALARMGRENZE_2_EINSATZZEIT_1_PROZENT,
      ];
    case P10_EINSATZZEIT_3_MS:
      return [
        P61_ALARMGRENZE_1_EINSATZZEIT_3_PROZENT,
        P62_ALARMGRENZE_2_EINSATZZEIT_3_PROZENT,
      ];
    default:
      throw new Error(`No Einsatzzeit lasts ${String(einsatzzeitMs)} ms`);
  }
}

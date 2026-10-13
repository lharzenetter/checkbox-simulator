import {
  P01_EINSATZZEIT_1_MS,
  P03_ALARMGRENZE_1_EINSATZZEIT_1_PROZENT,
  P04_ALARMGRENZE_2_EINSATZZEIT_1_PROZENT,
  P05_ALARMINTERVALL_BEREITSCHAFT_MS,
  P06_ALARMINTERVALL_EINSATZZEIT_MS,
  P10_EINSATZZEIT_3_MS,
  P61_ALARMGRENZE_1_EINSATZZEIT_3_PROZENT,
  P62_ALARMGRENZE_2_EINSATZZEIT_3_PROZENT,
} from "./parameters";
import type { Trupp } from "./state";

// Whether the Trupp, running down from `before` to `after`, reached a point that fires an Alarm.
// timing-and-alarm-rules §4.7: in Bereitschaft only the Bereitschaft Alarm sounds.
// ASSUMPTION: an Alarm point a pressure entry passes in Bereitschaft is dropped, not held until
// `Trupp -> Einsatz`; §4.7 pauses the other Alarms but does not say what happens to one passed
// while paused.
export function hasAlarmFired(before: Trupp, after: Trupp): boolean {
  if (after.einsatzstatus === "bereitschaft") {
    return hasReachedBereitschaftInterval(before, after);
  }
  return (
    hasReachedAlarmgrenze(before, after) || hasReachedEinsatzzeit(before, after)
  );
}

// timing-and-alarm-rules §4.3, 4.4: every [05] of simulated time since entering Bereitschaft
function hasReachedBereitschaftInterval(before: Trupp, after: Trupp): boolean {
  return (
    Math.floor(
      after.timeInBereitschaftMs / P05_ALARMINTERVALL_BEREITSCHAFT_MS,
    ) >
    Math.floor(before.timeInBereitschaftMs / P05_ALARMINTERVALL_BEREITSCHAFT_MS)
  );
}

// timing-and-alarm-rules §2.2, 2.3, 2.4, 2.6: on the running time, literally, once per Einsatz,
// in every Einsatzstatus; the running time never goes back, so each is reached only once
function hasReachedAlarmgrenze(before: Trupp, after: Trupp): boolean {
  return alarmgrenzenPercent(before.einsatzzeitMs).some((percent) => {
    const alarmgrenzeMs = (before.einsatzzeitMs * percent) / 100;
    return (
      before.runningTimeMs < alarmgrenzeMs &&
      after.runningTimeMs >= alarmgrenzeMs
    );
  });
}

// timing-and-alarm-rules §3.1, 3.2, 3.3, 3.5: at 00:00:00 and each multiple of −[06], anchored to
// the Restzeit; passing several at once fires one Alarm
function hasReachedEinsatzzeit(before: Trupp, after: Trupp): boolean {
  return overdueStep(after.restzeitMs) > overdueStep(before.restzeitMs);
}

// How many of 00:00:00, −[06], −2·[06], … the Restzeit has reached, less one.
function overdueStep(restzeitMs: number): number {
  return restzeitMs > 0
    ? -1
    : Math.floor(-restzeitMs / P06_ALARMINTERVALL_EINSATZZEIT_MS);
}

function alarmgrenzenPercent(einsatzzeitMs: number): readonly number[] {
  switch (einsatzzeitMs) {
    case P01_EINSATZZEIT_1_MS:
      return [
        P03_ALARMGRENZE_1_EINSATZZEIT_1_PROZENT,
        P04_ALARMGRENZE_2_EINSATZZEIT_1_PROZENT,
        P05_ALARMINTERVALL_BEREITSCHAFT_MS,
        P06_ALARMINTERVALL_EINSATZZEIT_MS,
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

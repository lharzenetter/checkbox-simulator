import {
  P01_EINSATZZEIT_1_MS,
  P03_ALARMGRENZE_1_EINSATZZEIT_1_PROZENT,
  P04_ALARMGRENZE_2_EINSATZZEIT_1_PROZENT,
  P05_ALARMINTERVALL_BEREITSCHAFT_MS,
  P06_ALARMINTERVALL_EINSATZZEIT_MS,
  P10_EINSATZZEIT_3_MS,
  P42_RESERVEDRUCK_BAR,
  P61_ALARMGRENZE_1_EINSATZZEIT_3_PROZENT,
  P62_ALARMGRENZE_2_EINSATZZEIT_3_PROZENT,
  P81_FLASCHENTYP_2_BAR,
} from "./parameters";
import type { Trupp } from "./state";

export interface AlarmCheck {
  /** `after`, with its Rückzugsalarm disarmed once that has fired. */
  readonly trupp: Trupp;
  readonly hasFired: boolean;
}

// Whether the Trupp, running down from `before` to `after`, reached a point that fires an Alarm.
// timing-and-alarm-rules §4.7: in Bereitschaft only the Bereitschaft Alarm sounds.
// ASSUMPTION: an Alarm point a pressure entry passes in Bereitschaft is dropped, not held until
// `Trupp -> Einsatz`; §4.7 pauses the other Alarms but does not say what happens to one passed
// while paused (taken in "Repeat overdue and Bereitschaft Alarms", issue #33).
export function fireAlarms(before: Trupp, after: Trupp): AlarmCheck {
  if (after.einsatzstatus === "bereitschaft") {
    return {
      trupp: after,
      hasFired: hasReachedBereitschaftInterval(before, after),
    };
  }
  if (hasReachedRueckzugspunkt(after)) {
    return { trupp: { ...after, rueckzugsalarmArmed: false }, hasFired: true };
  }
  return {
    trupp: after,
    hasFired:
      hasReachedAlarmgrenze(before, after) ||
      hasReachedEinsatzzeit(before, after),
  };
}

// timing-and-alarm-rules §5.5, 5.6, 5.9, 5.13, 5.14: checked against the current Restzeit, so a
// Restzeit already at or below the threshold fires at once; disarming it on firing keeps a raise
// from re-arming it, and only Einsatzziel erreicht arms it, so Rückmarsch never fires it
function hasReachedRueckzugspunkt(trupp: Trupp): boolean {
  if (
    !trupp.rueckzugsalarmArmed ||
    trupp.einsatzstatus !== "einsatzzielErreicht" ||
    trupp.anmarschzeitMs === null
  ) {
    return false;
  }
  const reserveMs =
    (P42_RESERVEDRUCK_BAR * trupp.einsatzzeitMs) / P81_FLASCHENTYP_2_BAR;
  return trupp.restzeitMs <= 2 * trupp.anmarschzeitMs + reserveMs;
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

// timing-and-alarm-rules §3.1, 3.2, 3.3, 3.5, 3.6: at 00:00:00 and each multiple of −[06], anchored
// to the Restzeit, so an OK never shifts them and an entry that raises the Restzeit re-arms them;
// passing several at once fires one Alarm.
// ASSUMPTION: an entry that raises an overdue Restzeit to exactly 00:00:00 has reached that point
// already, so it fires nothing and the next Alarm comes at −[06]; §3.6 says only "when it next
// reaches 00:00:00" (taken in "Repeat overdue and Bereitschaft Alarms", issue #33).
function hasReachedEinsatzzeit(before: Trupp, after: Trupp): boolean {
  return overdueStep(after.restzeitMs) > overdueStep(before.restzeitMs);
}

// Comparing step numbers rather than thresholds makes a multi-step jump count once (§3.3).
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

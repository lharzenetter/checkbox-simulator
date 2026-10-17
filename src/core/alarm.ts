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
import { rueckmarschzeitMs } from "./restzeit";
import type { AlarmCause, Trupp } from "./state";

/** An Alarm that fired, and how far into the run-down from `before` to `after` it was reached. */
export interface FiredAlarm {
  readonly cause: AlarmCause;
  readonly reachedAfterMs: number;
}

// `trupp` is `after`, with its Rückzugsalarm disarmed once that has fired.
export interface AlarmCheck {
  readonly trupp: Trupp;
  /** In the order they were reached, ties in {@link CAUSE_ORDER}. */
  readonly fired: readonly FiredAlarm[];
}

// timing-and-alarm-rules §8.2: ties in the order Alarmgrenze, Rückzugsalarm, Einsatzzeit erreicht
const CAUSE_ORDER: readonly AlarmCause[] = [
  "alarmgrenze1",
  "alarmgrenze2",
  "rueckzugsalarm",
  "einsatzzeit",
  "bereitschaft",
];

/** Orders Alarms reached in one step for the queue: timing-and-alarm-rules §8.2. */
export function compareFiredAlarms(a: FiredAlarm, b: FiredAlarm): number {
  return (
    a.reachedAfterMs - b.reachedAfterMs ||
    CAUSE_ORDER.indexOf(a.cause) - CAUSE_ORDER.indexOf(b.cause)
  );
}

// Whether the Trupp, running down from `before` to `after`, reached points that fire Alarms,
// and the Trupp as it stands once those Alarms have fired.
// timing-and-alarm-rules §4.7: in Bereitschaft only the Bereitschaft Alarm sounds.
// ASSUMPTION: an Alarm point a pressure entry passes in Bereitschaft is dropped, not held until
// `Trupp -> Einsatz`; §4.7 pauses the other Alarms but does not say what happens to one passed
// while paused (taken in "Repeat overdue and Bereitschaft Alarms", issue #33).
export function checkAlarms(before: Trupp, after: Trupp): AlarmCheck {
  if (after.einsatzstatus === "bereitschaft") {
    return {
      trupp: after,
      fired: optional(bereitschaftAlarm(before, after)),
    };
  }
  const rueckzugsalarm = rueckzugsalarmOf(before, after);
  return {
    trupp:
      rueckzugsalarm === null
        ? after
        : { ...after, rueckzugsalarmArmed: false },
    fired: [
      ...alarmgrenzenAlarms(before, after),
      ...optional(rueckzugsalarm),
      ...optional(einsatzzeitAlarm(before, after)),
    ].sort(compareFiredAlarms),
  };
}

function optional(alarm: FiredAlarm | null): readonly FiredAlarm[] {
  return alarm === null ? [] : [alarm];
}

function rueckzugsalarmOf(before: Trupp, after: Trupp): FiredAlarm | null {
  if (!isRueckzugsalarmDue(after)) {
    return null;
  }
  const thresholdMs = rueckmarschzeitMs(after) ?? 0;
  return {
    cause: "rueckzugsalarm",
    reachedAfterMs: Math.max(0, before.restzeitMs - thresholdMs),
  };
}

// timing-and-alarm-rules §5.5, 5.6, 5.9, 5.13, 5.14: checked against the current Restzeit, so a
// Restzeit already at or below the threshold fires at once; disarming it on firing keeps a raise
// from re-arming it, and only Einsatzziel erreicht arms it, so Rückmarsch never fires it
function isRueckzugsalarmDue(trupp: Trupp): boolean {
  const thresholdMs = rueckmarschzeitMs(trupp);
  return (
    trupp.rueckzugsalarmArmed &&
    trupp.einsatzstatus === "einsatzzielErreicht" &&
    thresholdMs !== null &&
    trupp.restzeitMs <= thresholdMs
  );
}

// timing-and-alarm-rules §4.3, 4.4: every [05] of simulated time since entering Bereitschaft
function bereitschaftAlarm(before: Trupp, after: Trupp): FiredAlarm | null {
  const nextMs =
    (Math.floor(
      before.timeInBereitschaftMs / P05_ALARMINTERVALL_BEREITSCHAFT_MS,
    ) +
      1) *
    P05_ALARMINTERVALL_BEREITSCHAFT_MS;
  return after.timeInBereitschaftMs >= nextMs
    ? {
        cause: "bereitschaft",
        reachedAfterMs: nextMs - before.timeInBereitschaftMs,
      }
    : null;
}

// timing-and-alarm-rules §2.2, 2.3, 2.4, 2.6: on the running time, literally, once per Einsatz,
// in every Einsatzstatus; the running time never goes back, so each is reached only once
function alarmgrenzenAlarms(
  before: Trupp,
  after: Trupp,
): readonly FiredAlarm[] {
  const [first, second] = alarmgrenzenPercent(before.einsatzzeitMs);
  return [
    alarmgrenzeAlarm(before, after, first, "alarmgrenze1"),
    alarmgrenzeAlarm(before, after, second, "alarmgrenze2"),
  ].flatMap(optional);
}

function alarmgrenzeAlarm(
  before: Trupp,
  after: Trupp,
  percent: number,
  cause: AlarmCause,
): FiredAlarm | null {
  const alarmgrenzeMs = (before.einsatzzeitMs * percent) / 100;
  return before.runningTimeMs < alarmgrenzeMs &&
    after.runningTimeMs >= alarmgrenzeMs
    ? { cause, reachedAfterMs: alarmgrenzeMs - before.runningTimeMs }
    : null;
}

// timing-and-alarm-rules §3.1, 3.2, 3.3, 3.5, 3.6: at 00:00:00 and each multiple of −[06], anchored
// to the Restzeit, so an OK never shifts them and an entry that raises the Restzeit re-arms them;
// passing several at once fires one Alarm.
// ASSUMPTION: an entry that raises an overdue Restzeit to exactly 00:00:00 has reached that point
// already, so it fires nothing and the next Alarm comes at −[06]; §3.6 says only "when it next
// reaches 00:00:00" (taken in "Repeat overdue and Bereitschaft Alarms", issue #33).
function einsatzzeitAlarm(before: Trupp, after: Trupp): FiredAlarm | null {
  const firstStep = overdueStep(before.restzeitMs) + 1;
  return overdueStep(after.restzeitMs) >= firstStep
    ? {
        cause: "einsatzzeit",
        reachedAfterMs:
          before.restzeitMs + firstStep * P06_ALARMINTERVALL_EINSATZZEIT_MS,
      }
    : null;
}

// Comparing step numbers rather than thresholds makes a multi-step jump count once (§3.3).
function overdueStep(restzeitMs: number): number {
  return restzeitMs > 0
    ? -1
    : Math.floor(-restzeitMs / P06_ALARMINTERVALL_EINSATZZEIT_MS);
}

function alarmgrenzenPercent(einsatzzeitMs: number): readonly [number, number] {
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

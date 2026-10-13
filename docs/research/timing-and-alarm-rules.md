# Checkbox timing and alarm rules

Research for the wayfinder ticket *Pin down the Checkbox timing and alarm rules*.
Source: the manual in the repo root (`30784_BA_Checkbox-5u1_…pdf`); page numbers are the printed page numbers.
A web search turned up no other public Pölz documentation for the device, so every gap below is a real gap.

Every rule is tagged:

- **[Manual]** — stated in the manual text.
- **[Figure]** — read off an LCD figure in the manual; the figures are illustrative and not always mutually consistent.
- **[Assumption]** — the manual is silent or contradicts itself; needs a decision (see [Open decisions](#open-decisions)).

## Notation

| Symbol | Meaning |
| --- | --- |
| `T` | The Trupp's Einsatzzeit in minutes (Einsatzzeit #1–#4: [01], [02], [10], [17]). |
| `P_N` | Nenndruck of the chosen Atemschutzflasche type (200 or 300 bar). |
| `P_0` | Anfangsdruck entered at login. |
| `P` | Latest Flaschendruck entered for the Trupp. |
| `t_run` | Elapsed **running** time of the Einsatz — wall-clock time minus time spent in Bereitschaft. |
| `t_A` | Anmarschzeit — `t_run` at the moment the Trupp was set to Einsatzziel erreicht. |
| `R` | Restzeit as shown on the Einsatzliste. |
| `[nn]` | Parameter number from manual 9.1. |

"Regelzeit" in the manual (5.5.4, [06]) means the same as Einsatzzeit; the glossary lists it as an alias to avoid.

## 1. Restzeit

| # | Rule | Source |
| --- | --- | --- |
| 1.1 | Restzeit counts down one second per second while the Trupp is not in Bereitschaft. | [Manual] p. 14, 26 |
| 1.2 | At 00:00:00 it keeps counting as a negative time, so the overdue time is visible at a glance. | [Manual] p. 24 |
| 1.3 | Initial Restzeit is scaled by the Anfangsdruck: `R = T × P_0 / P_N`. Example in the figure: 30 min, 300 bar bottle, 250 bar → 00:25:00. | [Figure] p. 20, 28 |
| 1.4 | When a new Flaschendruck `P` is entered (Druck ändern, or at Einsatzziel erreicht / Rückzug antreten), Restzeit is recomputed: `R = T × P / P_N`. The manual says only "Die neuen Druck- und Zeitinformationen werden berechnet". The p. 22 figure (295 bar → 00:28:00, not 00:29:30) does not fit this formula exactly. | **Decided** (A1) |
| 1.7 | The detail screen's Aktueller Flaschendruck is a live estimate `P = R × P_N / T`, shown in whole bar rounded down and clamped at 0 (an empty cylinder does not occur in practice). Druck ändern opens the editor at that estimate, snapped down to the [76] grid. | **Decided** (device behaviour) |
| 1.5 | Pressure may only be raised during an Einsatz if [73] Druck vergrößerbar > 0, in steps of [73]; otherwise only lowered. | [Manual] p. 72 |
| 1.6 | Anfangsdruck entry is bounded by [77]/[78]: at most +10 % / −10 % of `P_N` by default. Steps are [76] Druck-Sprunggröße. | [Manual] p. 72–73 |

## 2. Alarmgrenzen #1–#4

| # | Rule | Source |
| --- | --- | --- |
| 2.1 | Each Einsatzzeit has up to four Alarmgrenzen as a percentage of `T`; 0 = off. Defaults: #1 = 33 %, #2 = 66 %, #3 = #4 = 0. | [Manual] p. 23, 70 |
| 2.2 | Alarmgrenze `g` fires when `g %` of the Einsatzzeit has elapsed (`t_run ≥ g × T`). Example: 30 min → alarms at 10 min (Restzeit 20 min) and 20 min (Restzeit 10 min). | [Manual] p. 23–24 |
| 2.3 | Each Alarmgrenze fires once per Einsatz, in every Einsatzstatus (Anmarsch, Einsatzziel erreicht, Rückzug). | **Decided** (A2) |
| 2.4 | ~~After a pressure change (1.4), the Alarmgrenze is measured against Restzeit.~~ Rejected: Alarmgrenzen stay on elapsed running time (2.2) regardless of pressure entries, matching FwDV 7's "Uhrzeit bei 1/3 und 2/3" (see [FwDV 7 cross-check](#11-fwdv-7-cross-check)). | **Decided** (A1) |
| 2.5 | Configured order: 1/3 and 2/3 limits follow FwDV 7. | [Manual] p. 23 |

## 3. Einsatzzeit reached and overdue

| # | Rule | Source |
| --- | --- | --- |
| 3.1 | When Restzeit reaches 00:00:00 an Alarm fires ("Alarm bei Erreichen der gesamten Einsatzzeit"). | [Manual] p. 24 |
| 3.2 | After that, an Alarm repeats every [06] Alarmintervall Regelzeit minutes (manual text: "alle 5 Minuten"; range 0–60, 0 = off). | [Manual] p. 25, 69 |
| 3.3 | The repeat alarms are anchored to Restzeit values: one fires each time Restzeit crosses a multiple of −[06] (−05:00, −10:00, …). Acknowledging never shifts them. A pressure entry that jumps Restzeit across several steps fires one alarm on confirmation; missed steps are not replayed, and the next one comes at the next multiple. | **Decided** (A3) |
| 3.4 | A pressure entry that drops Restzeit to 00:00:00 or below fires the Einsatzzeit-erreicht alarm as soon as OK confirms the entry. | **Decided** (A2) |
| 3.5 | The 00:00:00 alarm and the repeats fire in every Einsatzstatus, Rückzug included. | **Decided** (A2) |

## 4. Bereitschaft

| # | Rule | Source |
| --- | --- | --- |
| 4.1 | In Bereitschaft the running Einsatzzeit stops; the display shows the last value. Monitoring resumes when the Trupp is set back to EINSATZ ("Trupp -> Einsatz"). | [Manual] p. 27 |
| 4.2 | A Trupp can enter Bereitschaft at login (members log on while en route) or from a running Einsatz via the Trupp detail menu. | [Manual] p. 18–19, 27 |
| 4.3 | While in Bereitschaft an Alarm sounds every [05] Alarmintervall Bereitschaft minutes (text: "alle fünf Minuten"; range 0–60, 0 = off). | [Manual] p. 28, 69 |
| 4.4 | The Bereitschaft interval is anchored to simulated time since the Trupp entered Bereitschaft (+5, +10, … min) and restarts on each entry. Acknowledging never shifts it. | **Decided** (A3) |
| 4.7 | While a Trupp is in Bereitschaft only the Bereitschaft alarm sounds. Alarmgrenzen, the Rückzugsalarm and the overdue repeats pause with `t_run` and Restzeit, even for a Trupp that was already overdue. | **Decided** (A3) |
| 4.5 | Because Alarmgrenzen and Anmarschzeit are measured in `t_run` (or Restzeit), Bereitschaft shifts all pending alarm points by its duration. | Follows from 4.1 |
| 4.6 | "Trupp -> Einsatz" returns the Trupp to the Einsatzstatus it had before Bereitschaft, or to Anmarsch when it came straight from login (Einsatzziel erreicht when the Rückzugsalarmmodus is off). | [Assumption] A4 |

## 5. Rückzugsalarm

| # | Rule | Source |
| --- | --- | --- |
| 5.1 | The Rückzugsalarmmodus is set per Einsatzzeit: [41], [69], [70], [71]. | [Manual] p. 70–71, 88–89 |
| 5.2 | **Mode off:** the Trupp gets Einsatzziel erreicht at login. Only that status is available. No Anmarsch or Rückzug times are computed and no Rückzugsalarm fires. | [Manual] p. 11, 20, 22, 25 |
| 5.3 | **Mode on:** the Trupp starts in Anmarsch. The operator sets Einsatzziel erreicht, then Rückzug, on radio reports. Each change asks for the current Flaschendruck. | [Manual] p. 20, 22–23, 29–30 |
| 5.4 | The Anmarschzeit `t_A` is the running time from start to Einsatzziel erreicht; the alarm is computed at that transition ("Die neuen Druck- und Zeitinformationen werden berechnet"). | [Manual] p. 22 |
| 5.5 | The Rückzugsalarm fires once Restzeit falls to "die doppelte Anmarschzeit zuzüglich des eingestellten Reservedruckes": `R ≤ 2·t_A + t_res`. | [Manual] p. 25, 70–71 |
| 5.6 | The Reservedruck is converted to time with the same linear model as 1.3: `t_res = [42] × T / P_N`. Example: 30 min, 300 bar, 50 bar reserve → 5 min. | **Decided** (A5) |
| 5.7 | The detail screen shows a Rückzugsdruck, the "Flaschendruck bei dem der Rückzugsalarm ausgelöst wird". It is the pressure equivalent of the time threshold in 5.5: `[42] + 2·t_A × P_N / T`, so the estimate in 1.7 reaches it exactly when the alarm fires. The figure-fitted `[42] + 2 × (P_0 − P_Ziel)` was rejected: it disagrees with the time-based alarm. | **Decided** (A5) |
| 5.11 | The Rückzugsalarm stays **time-based** (5.5), as on the device, even though FwDV 7 sizes the Rückweg in Atemluftmenge (see [FwDV 7 cross-check](#11-fwdv-7-cross-check)). Deliberate: the simulator replicates the device, not the regulation. | **Decided** (A5) |
| 5.12 | [82] Reservedruck ohne Rückzugsalarm is stored but has no effect: with the mode off no Rückzugsalarm fires and Restzeit stays `T × P / P_N`. | **Decided** (A5) |
| 5.8 | The detail screen's bar splits the Einsatzzeit into Anmarsch, Einsatzziel erreicht and Rückmarsch (2 × Anmarsch + reserve). | [Manual] p. 11 |
| 5.9 | The Rückzugsalarm fires at most once per Einsatz, and not at all if the Trupp is already in Rückzug when the point is reached. A pressure raise via [73] that lifts Restzeit back above the threshold does not re-arm it. Rückzug is the only Einsatzstatus that suppresses an alarm. | **Decided** (A2) |
| 5.13 | The Rückzugsalarm is armed only from Einsatzziel erreicht onwards (`t_A` has no value before). In Anmarsch, the first Alarmgrenze is the cue to order a retreat (p. 23). | **Decided** (A2) |
| 5.14 | The threshold is checked against the current Restzeit ("als Restzeit unterschritten", p. 70–71). When a pressure entry or the switch to Einsatzziel erreicht leaves Restzeit already at or below `2·t_A + t_res`, the alarm fires as soon as OK confirms it. | **Decided** (A2) |
| 5.10 | Anmarsch → Rückzug directly (skipping Einsatzziel erreicht) is allowed. The manual tells the operator to order a Trupp still in Anmarsch to retreat at the first Alarmgrenze (p. 23), but only shows the menu path from Einsatzziel erreicht. | [Assumption] A6 |

## 6. Prozentmodus (Einsatzzeit #4)

What the manual says, in full:

- [45] Prozent Modus EZ#4: for long Einsätze the "Prozentmodus für die Alarmgrenzen" makes more sense than the 1/3 – 2/3 limits; 0 = off, 1 = on. [Manual] p. 25, 71
- [46] Reserve % EZ#4: "Flaschendruckreserve", only used when the Prozentmodus is on; 0–99 %. [Manual] p. 71
- [47] Erweiterte Alarmgrenze EZ#4: "Nach der eingestellten Zeit ertönt der erste Alarm"; 0 = off, max 240 min. [Manual] p. 71
- [48] Erweiterter Alarm Folgealarm EZ#4: time for all follow-up alarms after the first; 0 = off, max 240 min. [Manual] p. 71. The table in 9.1 numbers it **[49]**, not [48].

The manual does not say how these combine. One reading:

| # | Rule | Source |
| --- | --- | --- |
| 6.1 | With [45] on, Einsatzzeit #4 ignores Alarmgrenzen #1–#4 ([65]–[68]). Instead an Alarm fires at `t_run = [47]`, then every [48] minutes. | [Assumption] A7 |
| 6.2 | [46] replaces the bar-based Reservedruck for EZ#4 in the Rückzugsalarm: `t_res = [46] % × T`. | [Assumption] A7 |

## 7. Daueralarm

A Daueralarm cannot be silenced by OK; it stops only when its cause is removed (glossary).

| # | Trigger | Ends when | Source |
| --- | --- | --- | --- |
| 7.1 | A Trupp member does not log off at Einsatz beenden. | The missing member logs off with their Transponder, or a Notausschaltung (D + E ~4 s) ends the Trupp or all Trupps. | [Manual] p. 15, 30–31 |
| 7.2 | Fewer than [07] Minimale Anzahl der Truppmitglieder (≥ 2) have logged on for a Trupp. | Enough members have logged on. | [Manual] p. 71–72 |

The manual does not say **when** either one starts:

- 7.1: on pressing OK on the Abmelden screen while members are still unmarked? After a timeout ([12])? Or as soon as the first member logs off? [Assumption] A8
- 7.2: on trying to confirm the Trupp with too few members? After the [12] auto-login delay? [Assumption] A8
- Can D (nicht abmelden) on the Abmelden screen cancel a 7.1 Daueralarm and resume the Einsatz? [Assumption] A8

## 8. Acknowledging and concurrency

| # | Rule | Source |
| --- | --- | --- |
| 8.1 | Every non-Daueralarm is acknowledged with OK (C). | [Manual] p. 14, 23–28 |
| 8.2 | How simultaneous Alarms from several Trupps are queued, and which screen shows them, is not described. | [Assumption], for the ticket *Decide how alarms are presented* |
| 8.3 | Starting a Langzeiteinsatz (any Einsatzzeit except 30 min) needs an extra OK confirmation. | [Manual] p. 18 |

## 9. Factory defaults

Section 9.1 of the manual lists numbers and units only, **no defaults**. Defaults below come from text elsewhere or are assumptions.

| Param | Meaning | Default | Source |
| --- | --- | --- | --- |
| [01] / [02] / [10] / [17] | Einsatzzeit #1 / #2 / #3 / #4 | 30 / 60 / 20 / 240 min | [Manual] p. 70 |
| [03] [57] [61] [65] | Alarmgrenze #1 per EZ | 33 % | [Manual] p. 70 |
| [04] [58] [62] [66] | Alarmgrenze #2 per EZ | 66 % | [Manual] p. 70 |
| [15] [16] [59] [60] [63] [64] [67] [68] | Alarmgrenze #3/#4 per EZ | 0 (off) | [Manual] p. 70 |
| [05] | Alarmintervall Bereitschaft | 5 min | [Manual] p. 28 |
| [06] | Alarmintervall Regelzeit | 5 min | [Manual] p. 25 |
| [07] | Minimale Anzahl der Truppmitglieder | 2 | [Manual] p. 18, 72 |
| [08] | Maximale Anzahl der Truppmitglieder | 6 (V04) | [Manual] p. 18 ("max. drei oder sechs (V04)") |
| [72] | Anzahl der maximalen Trupps | 6 | [Manual] p. 21 |
| [77] / [78] | Max. über / min. unter Soll | 10 % / 10 % | [Manual] p. 72–73 |
| [79] | Druckanzeige Einheit | 0 = Bar | [Manual] p. 11, 73 |
| [41] [69] [70] [71] | Rückzugsalarmmodus per EZ | **unknown** — figures show a 30-min Trupp in ANMARSCH, so [41] = on in the figures' setup | [Assumption] A9 |
| [42] | Reservedruck (mode on) | **unknown** — 50 bar proposed | [Assumption] A9 |
| [82] | Reservedruck (mode off) | 50 bar ("50 bar Standard") | [Manual] p. 73 — but see conflicts |
| [14] [53] [54] (+ EZ#2) | Atemschutzflaschentyp per EZ | **unknown** — figures show a 300 bar selection | [Assumption] A9 |
| [80] / [81] | Flaschentyp 1 / 2 | **unknown** — 200 / 300 bar proposed | [Assumption] A9 |
| [74] / [75] | Anfangs- / Enddruckerfassung | **unknown** — figures show Anfangsdruck entry, so ≥ 1 | [Assumption] A9 |
| [76] | Druck-Sprunggröße | **unknown** — figures (250, 295) suggest 5 bar | [Assumption] A9 |
| [73] | Druck vergrößerbar | **unknown** | [Assumption] A9 |
| [11] | Einsatzzeit ändern | **unknown** | [Assumption] A9 |
| [45] / [46] / [47] / [48] | Prozentmodus EZ#4 | **unknown** | [Assumption] A7, A9 |
| [12] / [13] | Automatisches Anmelden / Trupp Detailansicht | **unknown** (seconds) | [Assumption] A9 |
| [37] | Cursorposition Trupp erstellen | **unknown** | [Assumption] A9 |

## 10. Manual conflicts

- **[48] vs [49]:** 6.12.1 calls the EZ#4 follow-up alarm [48]; 9.1 calls it [49]. 6.12.1 also lists [49] as the Atemschutzflaschentyp for one Einsatzzeit ([14, 49, 53, 54]), and 9.1 has no Flaschentyp entry for Einsatzzeit #2.
- **[82] has two meanings:** in Register DRUCK it is the "Standard-Reservedruck … ohne Rückzugsalarm" (10–9999); further down the same page it is the "Flaschendruck bei Rückzugalarm (50 bar Standard)", which is [42]'s job.
- **[42] range** is "zwischen 0 und 2500 bar", implausible for 200/300 bar bottles.
- **Figures disagree with each other:** p. 22 shows 295 bar → 00:28:00; p. 29 shows 40 bar, 00:02:00 and a 120 bar Rückzugsdruck. Treat figure numbers as layout references, not test vectors.

## 11. FwDV 7 cross-check

Checked against FwDV 7 (Ausgabe 2002 mit Änderungen 2005), page numbers as printed.

| FwDV 7 | Where | Bearing on the simulator |
| --- | --- | --- |
| "Für den Rückweg ist in der Regel die doppelte **Atemluftmenge** wie für den Hinweg einzuplanen"; the Atemluftmenge is "der begrenzende Faktor". | 7.3 p. 11; "Hin- und Rückweg" p. 16 | The regulation measures the Rückweg in air. The device approximates it in time (`2·t_A`); the simulator follows the device (5.11). |
| "Nach einem und nach zwei Drittel der zu erwartenden Einsatzzeit ist … der Atemschutztrupp auf die Beachtung der Behälterdrücke hinzuweisen"; registration of the "Uhrzeit bei 1/3 und 2/3". | 7.4 p. 13 | The Alarmgrenzen are clock-time reminders to check pressure, so they run on elapsed time (2.2, 2.4). |
| Cylinders below 90 % of the Nenn-Fülldruck at Einsatzbeginn are not einsatzbereit. | 7.3 p. 11 | Matches the −10 % Anfangsdruck bound [78] (1.6). |
| Radio reports at connecting, Einsatzziel erreicht and Antritt des Rückweges. | 7.3 p. 11 | Matches the Einsatzstatus flow (5.3). |
| No numeric Reservedruck. | — | [42] is a device parameter only. |

## Open decisions

A1 and A5 are decided in *Decide how Flaschendruck drives Restzeit and the Rückzugsalarm*; A2 and A3 in *Decide when one-shot and repeating alarms fire* (rows marked **Decided** above).

These feed the follow-up grilling ticket.

- **A1 — Pressure and Restzeit.** Does a Flaschendruck entry recompute Restzeit as `T × P / P_N` (1.4)? If so, are Alarmgrenzen then measured against Restzeit (2.4) or elapsed time?
- **A2 — Once-only alarms.** Each Alarmgrenze and the Rückzugsalarm fire once. Is the Rückzugsalarm suppressed once the Trupp is in Rückzug? What happens when a pressure change moves an already-passed point forward again?
- **A3 — Interval anchoring.** Are the Regelzeit and Bereitschaft repeat alarms anchored at the triggering event or at each acknowledgement?
- **A4 — Leaving Bereitschaft.** Which Einsatzstatus does "Trupp -> Einsatz" restore?
- **A5 — Reserve conversion.** Is the Reservedruck converted to time linearly (`[42] × T / P_N`)? Should the Rückzugsdruck be shown as `[42] + 2 × (P_0 − P_Ziel)`? And which one triggers the alarm: the time comparison or the pressure comparison?
- **A6 — Anmarsch → Rückzug.** Is this transition allowed without passing Einsatzziel erreicht?
- **A7 — Prozentmodus semantics.** Adopt reading 6.1/6.2, or leave Prozentmodus off (it only affects the 240-min Einsatzzeit #4)?
- **A8 — Daueralarm start and cancel.** When does each Daueralarm start, and can D cancel the logoff Daueralarm?
- **A9 — Unknown defaults.** Fix values for every **unknown** row in section 9, including whether the Rückzugsalarmmodus is on for each Einsatzzeit.

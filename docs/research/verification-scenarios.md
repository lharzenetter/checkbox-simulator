# Timing and alarm verification scenarios

Research for the wayfinder ticket _Choose the timing and alarm scenarios for the verification suite_.
These are the scenarios the reducer-core suite drives through `reduce` with `tick` events. They are derived from the [timing and alarm rules](timing-and-alarm-rules.md) (§ numbers below), sections 1–9 and 12.
Every **Decided** rule there is covered at least once (see the [coverage matrix](#coverage-matrix)). Rules that the fixed defaults make unreachable are listed under [Not implemented](#not-implemented). The edge cases the scenarios exposed were settled in _Settle the edge cases the verification scenarios exposed_ (§1.8, 2.6, 3.6, 5.7, 9.2, 9.3). The vectors were recomputed for _Correct the simulator against the real Checkbox_ (pressure-based Rückzugsalarm, two OKs per Alarm, Bereitschaft restoring the Einsatzstatus, the 300 bar ceiling and the `Zu wenig Einsatzkräfte!` box).

## Conventions

- **Defaults** are section 9 throughout: `P_N` = 300 bar, Rückzugsalarmmodus on, [42] = 50 bar, [76] = [73] = 5 bar, [05] = [06] = 5 min, [07] = 2, [13] = 15 s, Alarmgrenzen 33 % / 66 %.
- **`t`** is simulated time since the scenario starts, in `m:ss`. The suite uses integer milliseconds. Speed is 1× unless the scenario says otherwise, so real time equals `t`.
- **Derived constants.** With `P_N` = 300, one bar is worth `T / 300` of Restzeit, so the Rückzugsalarm fires at `R` = `P_R × T / 300` (§5.5):

  | Einsatzzeit  | 1 bar = | `R` at the 50 bar floor | Alarmgrenze #1 (`G1`) | Alarmgrenze #2 (`G2`) |
  | ------------ | ------- | ----------------------- | --------------------- | --------------------- |
  | 30 min (#1)  | 6 s     | 5:00                    | 9:54                  | 19:48                 |
  | 20 min (#3)  | 4 s     | 3:20                    | 6:36                  | 13:12                 |
  | 180 min (#4) | 36 s    | 30:00                   | 59:24                 | 118:48                |

  `G1`/`G2` take 33 % and 66 % literally (`t_run ≥ g × T`, §2.2, 2.6), not as thirds; the device rounds the same way.

- **Rückzugsdruck.** `P_R = max(2 × (P_0 − P_Ziel), 50)` (§5.7), 50 bar before Einsatzziel erreicht.
- **Trupps.** Trupp 01 is made of Tallys A1 + A2 and Trupp 02 of Tallys B1 + B2 (any two roster Tallys). A login is the Einsatzzeit choice, the Anmeldefenster with both Tallys, the `Trupp OK …` item and the Anfangsdruck. Unless stated it is 30 min, `Trupp OK Einsatz`, Anfangsdruck 300 bar.
- **Inputs** are written as Trupp-Menü actions ("Einsatzziel erreicht, enter 250"). A test helper expands them into key events. "enter P" means the pressure editor is set to P and confirmed with OK; "accept" means OK on the value the editor opened with.
- **Expected** lists the Einsatzstatus, Restzeit `R`, the pressure estimate (§1.7) where it matters, and which Alarm becomes pending, by its header (`ALARM 1`, `ALARM 2`, `RÜCKZUG`, `ALARM`, `BEREITSCHAFT`, §8.5). An Alarm is acknowledged at once with its two OKs (§8.4) unless the scenario says otherwise. "no Alarm" checks the tick just past a point where a wrong implementation would fire.
- **Layer.** Every scenario is a `core/` test unless marked `world/` (it needs the speed control or pause).

## A. Restzeit and pressure

### V1 — Untouched Trupp runs out and goes overdue

§1.1, 1.2, 1.3, 1.7 (clamp), 2.1, 2.2, 3.1, 3.2, 3.3 (anchoring), 5.5, 5.13, 8.1, 12.1

Login at `t` = 0:00. The Trupp is never touched until 0:00:00.

| `t`   | Input                      | Expected                                                         |
| ----- | -------------------------- | ---------------------------------------------------------------- |
| 0:00  | login                      | Anmarsch, `R` = 30:00, estimate 300 bar, Rückzugsdruck 50 bar    |
| 9:53  | —                          | `R` = 20:07, no Alarm                                            |
| 9:54  | —                          | `ALARM 1`, `R` = 20:06                                           |
| 15:00 | —                          | `R` = 15:00, estimate 150 bar                                    |
| 19:48 | —                          | `ALARM 2`                                                        |
| 24:59 | —                          | `R` = 5:01, no Alarm                                             |
| 25:00 | —                          | `RÜCKZUG`, `R` = 5:00, estimate 50 bar (armed from login, §5.13) |
| 29:59 | —                          | `R` = 0:00:01, no Alarm                                          |
| 30:00 | —                          | `ALARM` (Einsatzzeit erreicht), `R` = 0:00:00                    |
| 31:00 | —                          | `R` = −0:01:00, estimate 0 bar (clamped)                         |
| 33:00 | OK, OK (acknowledged late) | —                                                                |
| 35:00 | —                          | `ALARM`, `R` = −0:05:00 (anchored to `R`, not to the late OK)    |
| 40:00 | —                          | `ALARM`, `R` = −0:10:00                                          |

### V2 — Anfangsdruck scales Restzeit, not the Alarmgrenzen

§1.3, 1.6, 2.2, 5.13

| `t`   | Input                                      | Expected                                                                        |
| ----- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| 0:00  | login; in the Anfangsdruck editor press Up | the editor opens at 300 bar and stays there (ceiling `P_N`)                     |
| 0:00  | press Down until it stops                  | the editor stops at 0 bar, in 5-bar steps (no lower bound, an assumption, §1.6) |
| 0:00  | enter 270                                  | Anmarsch, `R` = 27:00                                                           |
| 9:54  | —                                          | `ALARM 1` (on elapsed time), `R` = 17:06                                        |
| 19:48 | —                                          | `ALARM 2`, `R` = 7:12                                                           |
| 22:00 | —                                          | `RÜCKZUG`, `R` = 5:00                                                           |
| 27:00 | —                                          | `ALARM` (Einsatzzeit erreicht)                                                  |
| 32:00 | —                                          | `ALARM`, `R` = −0:05:00                                                         |

### V3 — A pressure entry resets Restzeit; the editor opens at the snapped estimate

§1.4, 1.7, 2.4

| `t`   | Input        | Expected                                                                           |
| ----- | ------------ | ---------------------------------------------------------------------------------- |
| 6:03  | Druck ändern | `R` = 23:57 → estimate 239 bar; the editor opens at 235 bar (snapped down to [76]) |
| 6:03  | enter 210    | `R` = 21:00, no Alarm                                                              |
| 9:54  | —            | `ALARM 1` (elapsed time, unmoved by the entry), `R` = 17:09                        |
| 19:48 | —            | `ALARM 2`                                                                          |
| 22:03 | —            | `RÜCKZUG`, `R` = 5:00                                                              |
| 27:03 | —            | `ALARM` (Einsatzzeit erreicht)                                                     |
| 32:03 | —            | `ALARM`, `R` = −0:05:00                                                            |

### V4 — Druck ändern may raise the pressure, up to 300 bar

§1.5, 1.4, 1.8

| `t`   | Input                               | Expected                                         |
| ----- | ----------------------------------- | ------------------------------------------------ |
| 10:00 | Druck ändern                        | editor opens at 200 bar                          |
| 10:00 | Up once, OK                         | `R` = 20:30 (205 bar)                            |
| 11:00 | Druck ändern, X                     | `R` unchanged (19:30), back on the Trupp-Menü    |
| 12:00 | Druck ändern, Up until it stops, OK | the editor stops at 300 bar (`P_N`), `R` = 30:00 |

### V5 — A pressure entry of 0 bar reaches Einsatzzeit erreicht at once

§3.4, 3.3, 5.14, 8.2 (coincident order)

| `t`   | Input                 | Expected                                                                                               |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| 8:00  | Druck ändern, enter 0 | on OK, `R` = 0:00:00 and two Alarms queue: `RÜCKZUG` first, then `ALARM` (Einsatzzeit erreicht) (§8.2) |
| 8:00  | OK, OK, OK, OK        | both acknowledged                                                                                      |
| 9:54  | —                     | `ALARM 1`                                                                                              |
| 13:00 | —                     | `ALARM`, `R` = −0:05:00                                                                                |

### V24 — A pressure entry on an overdue Trupp re-arms Einsatzzeit erreicht

§3.6, 1.7 (clamp), 5.9 (no re-arm below `P_R`)

| `t`   | Input        | Expected                                                                                       |
| ----- | ------------ | ---------------------------------------------------------------------------------------------- |
| 25:00 | —            | `RÜCKZUG`, `R` = 5:00                                                                          |
| 30:00 | —            | `ALARM` (Einsatzzeit erreicht)                                                                 |
| 35:00 | —            | `ALARM`, `R` = −0:05:00                                                                        |
| 37:00 | Druck ändern | editor opens at 0 bar (estimate clamped)                                                       |
| 37:00 | Up to 30, OK | `R` = 3:00, no Alarm: 30 bar does not lift the estimate above 50, so `RÜCKZUG` is not re-armed |
| 40:00 | —            | `ALARM` (Einsatzzeit erreicht, again)                                                          |
| 45:00 | —            | `ALARM`, `R` = −0:05:00 (again)                                                                |

## B. Alarmgrenzen, Rückmarsch and every-status alarms

### V6 — Alarms in every Einsatzstatus; Rückmarsch suppresses only the Rückzugsalarm

§2.3, 3.5, 5.9 (Rückmarsch), 12.2

| `t`   | Input                              | Expected                                                             |
| ----- | ---------------------------------- | -------------------------------------------------------------------- |
| 3:00  | Einsatzziel erreicht, accept (270) | Einsatzziel erreicht, `R` = 27:00, Rückzugsdruck 60 bar (`R` ≤ 6:00) |
| 9:54  | —                                  | `ALARM 1` in Einsatzziel erreicht                                    |
| 12:00 | Rückzug antreten, accept (180)     | Rückmarsch, `R` = 18:00                                              |
| 19:48 | —                                  | `ALARM 2` in Rückmarsch                                              |
| 24:00 | —                                  | `R` = 6:00, estimate 60 bar = Rückzugsdruck: **no** `RÜCKZUG`        |
| 30:00 | —                                  | `ALARM` (Einsatzzeit erreicht) in Rückmarsch                         |
| 35:00 | —                                  | `ALARM`, `R` = −0:05:00                                              |

## C. Rückzugsalarm

### V7 — Rückzugsalarm on the normal path; 300 → 240 gives 120 bar

§5.3, 5.5, 5.7, 5.11

| `t`   | Input                              | Expected                                                                    |
| ----- | ---------------------------------- | --------------------------------------------------------------------------- |
| 6:00  | Einsatzziel erreicht, accept (240) | `R` = 24:00, Anmarschdruck 60, Rückzugsdruck 120 bar, threshold `R` ≤ 12:00 |
| 9:54  | —                                  | `ALARM 1`                                                                   |
| 17:59 | —                                  | no Alarm, `R` = 12:01 (estimate 120.17, shown as 120 bar)                   |
| 18:00 | —                                  | `RÜCKZUG`, `R` = 12:00, estimate 120 bar = Rückzugsdruck                    |
| 18:01 | —                                  | no further `RÜCKZUG`                                                        |
| 19:48 | —                                  | `ALARM 2`                                                                   |
| 30:00 | —                                  | `ALARM` (Einsatzzeit erreicht)                                              |

### V25 — The Rückzugsdruck never falls below 50 bar

§5.7 (floor)

| `t`   | Input                              | Expected                                                                               |
| ----- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| 0:00  | login                              | Rückzugsdruck 50 bar on the Trupp-Ansicht after the login entry                        |
| 2:00  | Einsatzziel erreicht, accept (280) | `R` = 28:00, Anmarschdruck 20, 2 × 20 = 40 < 50 → Rückzugsdruck **50 bar**, `R` ≤ 5:00 |
| 9:54  | —                                  | `ALARM 1`                                                                              |
| 19:48 | —                                  | `ALARM 2`                                                                              |
| 25:00 | —                                  | `RÜCKZUG`, `R` = 5:00, estimate 50 bar                                                 |
| 30:00 | —                                  | `ALARM` (Einsatzzeit erreicht)                                                         |

Boundary: Einsatzziel erreicht with 275 instead gives Anmarschdruck 25, exactly 50 bar either way.

### V8 — Rückzugsalarm with the 20-min Einsatzzeit (Langzeiteinsatz)

§5.5 (threshold scales with `T`), 5.7, 8.3

| `t`   | Input                                   | Expected                                                                             |
| ----- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| 0:00  | choose 20 min, OK                       | the bottom line reads `Langzeiteinsatz? OK`; the Anmeldefenster is **not** shown yet |
| 0:00  | X                                       | back to the Einsatzzeit choice                                                       |
| 0:00  | choose 20 min, OK, OK; finish the login | Anmarsch, `R` = 20:00                                                                |
| 2:00  | Einsatzziel erreicht, accept (270)      | `R` = 18:00, Rückzugsdruck 60 bar, threshold `R` ≤ 4:00                              |
| 6:36  | —                                       | `ALARM 1`                                                                            |
| 13:12 | —                                       | `ALARM 2`                                                                            |
| 16:00 | —                                       | `RÜCKZUG`, `R` = 4:00, estimate 60 bar                                               |

### V28 — The 180-min Einsatzzeit

§8.3, 9 ([17] = 180), 2.2, 5.13

| `t`    | Input                | Expected                                                        |
| ------ | -------------------- | --------------------------------------------------------------- |
| 0:00   | Tally A1 at Check    | Einsatzzeit wählen lists `30`, `20` and `180 min`, cursor on 30 |
| 0:00   | choose 180 min, OK   | the bottom line reads `Langzeiteinsatz? OK`                     |
| 0:00   | OK; finish the login | Anmarsch, `R` = 3:00:00                                         |
| 59:24  | —                    | `ALARM 1`                                                       |
| 118:48 | —                    | `ALARM 2`                                                       |
| 150:00 | —                    | `RÜCKZUG`, `R` = 30:00, estimate 50 bar                         |
| 180:00 | —                    | `ALARM` (Einsatzzeit erreicht)                                  |
| 185:00 | —                    | `ALARM`, `R` = −0:05:00                                         |

### V9 — Threshold already passed at Einsatzziel erreicht

§5.14

| `t`  | Input                                 | Expected                                                                                                  |
| ---- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 8:00 | Einsatzziel erreicht, X in the editor | still Anmarsch, no Alarm                                                                                  |
| 8:00 | Einsatzziel erreicht, enter 200       | Einsatzziel erreicht, `R` = 20:00; Anmarschdruck 100 → Rückzugsdruck 200 bar = estimate → `RÜCKZUG` on OK |
| 9:54 | —                                     | `ALARM 1`; no second `RÜCKZUG` at any later `t`                                                           |

### V10 — Pressure entry crosses the threshold; only a raise above it re-arms

§5.14, 5.9 (re-arm), 1.5

| `t`  | Input                                    | Expected                                                             |
| ---- | ---------------------------------------- | -------------------------------------------------------------------- |
| 5:00 | Einsatzziel erreicht, accept (250)       | Rückzugsdruck 100 bar, threshold `R` ≤ 10:00                         |
| 7:00 | Druck ändern, enter 95                   | `R` = 9:30 → `RÜCKZUG` on OK                                         |
| 7:30 | Druck ändern, enter 105 (raise, 3 steps) | `R` = 10:30, estimate above 100 again: re-armed                      |
| 8:00 | —                                        | `RÜCKZUG` again, `R` = 10:00                                         |
| 8:30 | Druck ändern, enter 90                   | `R` = 9:00, **no** `RÜCKZUG` (fired, and not lifted above 100 since) |

### V11 — Einsatzziel erreicht and Rückzug antreten are each offered once; Rückmarsch is final

§5.10, 12.2, 12.5, 12.6

| `t`   | Input                              | Expected                                                                                                      |
| ----- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 6:00  | OK on the Einsatzliste             | Trupp-Menü (no Trupp-Ansicht), header `ANMARSCH`, lists `Einsatzziel erreicht` but **not** `Rückzug antreten` |
| 6:00  | Einsatzziel erreicht, accept (240) | Einsatzziel erreicht, Rückzugsdruck 120 bar; Trupp-Ansicht for 5 s, then the Einsatzliste                     |
| 6:30  | Trupp-Menü                         | header `EINSATZ`, lists `Rückzug antreten` but **not** `Einsatzziel erreicht`                                 |
| 7:00  | Rückzug antreten, accept (230)     | Rückmarsch, `R` = 23:00                                                                                       |
| 7:30  | Trupp-Menü                         | header `RÜCKMARSCH`, neither `Einsatzziel erreicht` nor `Rückzug antreten` listed                             |
| 7:30  | Trupp -> Einsatz                   | nothing changes (already a running status), back to the Einsatzliste                                          |
| 9:54  | —                                  | `ALARM 1`                                                                                                     |
| 18:00 | —                                  | `R` = 12:00: no `RÜCKZUG` (Rückmarsch)                                                                        |
| 19:48 | —                                  | `ALARM 2`                                                                                                     |
| 30:00 | —                                  | `ALARM` (Einsatzzeit erreicht)                                                                                |

## D. Bereitschaft

### V12 — Login in Bereitschaft

§4.1, 4.2, 4.3, 4.4, 4.6, 12.1, 12.4

| `t`   | Input                              | Expected                                              |
| ----- | ---------------------------------- | ----------------------------------------------------- |
| 0:00  | login with `Trupp OK Bereitschaft` | Bereitschaft, `R` = 30:00 frozen                      |
| 5:00  | —                                  | `BEREITSCHAFT`, `R` = 30:00                           |
| 7:00  | OK, OK (late)                      | —                                                     |
| 9:54  | —                                  | no Alarm (`t_run` = 0)                                |
| 10:00 | —                                  | `BEREITSCHAFT` (+10 since entry, not +5 since the OK) |
| 12:00 | Trupp -> Einsatz                   | Anmarsch (nothing to restore), `R` = 30:00 running    |
| 15:00 | —                                  | no `BEREITSCHAFT`                                     |
| 21:54 | —                                  | `ALARM 1` (`t_run` = 9:54), `R` = 20:06               |

### V13 — Bereitschaft mid-Einsatz pauses all alarms and restores Einsatzziel erreicht

§4.1, 4.4, 4.5, 4.6, 5.9, 12.3, 12.4

| `t`   | `t_run` | Input                              | Expected                                                                     |
| ----- | ------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| 4:00  | 4:00    | Einsatzziel erreicht, accept (260) | `R` = 26:00, Rückzugsdruck 80 bar, threshold `R` ≤ 8:00                      |
| 8:00  | 8:00    | Trupp -> Bereitschaft              | Bereitschaft, `R` = 22:00 frozen                                             |
| 13:00 | 8:00    | —                                  | `BEREITSCHAFT`                                                               |
| 14:00 | 8:00    | Trupp -> Einsatz                   | **Einsatzziel erreicht** (restored), Rückzugsdruck still 80 bar, `R` = 22:00 |
| 15:54 | 9:54    | —                                  | `ALARM 1` (shifted by the 6 min in Bereitschaft)                             |
| 25:48 | 19:48   | —                                  | `ALARM 2`                                                                    |
| 28:00 | 22:00   | —                                  | `RÜCKZUG`, `R` = 8:00, estimate 80 bar                                       |
| 36:00 | 30:00   | —                                  | `ALARM` (Einsatzzeit erreicht)                                               |
| 41:00 | 35:00   | —                                  | `ALARM`, `R` = −0:05:00                                                      |

### V26 — Bereitschaft restores Rückmarsch

§4.6, 12.4, 12.6, 5.9 (Rückmarsch)

| `t`   | `t_run` | Input                              | Expected                                                                   |
| ----- | ------- | ---------------------------------- | -------------------------------------------------------------------------- |
| 3:00  | 3:00    | Einsatzziel erreicht, accept (270) | `R` = 27:00, Rückzugsdruck 60 bar, threshold `R` ≤ 6:00                    |
| 5:00  | 5:00    | Rückzug antreten, accept (250)     | Rückmarsch, `R` = 25:00                                                    |
| 6:00  | 6:00    | Trupp -> Bereitschaft              | Bereitschaft, `R` = 24:00 frozen                                           |
| 9:00  | 6:00    | Trupp -> Einsatz                   | **Rückmarsch** (restored), `R` = 24:00 running                             |
| 9:30  | 6:30    | Trupp-Menü                         | header `RÜCKMARSCH`, neither `Einsatzziel erreicht` nor `Rückzug antreten` |
| 12:54 | 9:54    | —                                  | `ALARM 1`                                                                  |
| 22:48 | 19:48   | —                                  | `ALARM 2`                                                                  |
| 27:00 | 24:00   | —                                  | `R` = 6:00, **no** `RÜCKZUG` (still Rückmarsch)                            |
| 33:00 | 30:00   | —                                  | `ALARM` (Einsatzzeit erreicht)                                             |

### V14 — Overdue Trupp in Bereitschaft; the interval restarts on each entry

§4.4, 4.7, 3.3, 3.5

20-min Einsatzzeit (Langzeiteinsatz confirmed as in V8), Anfangsdruck 300.

| `t`          | Input                 | Expected                                       |
| ------------ | --------------------- | ---------------------------------------------- |
| 6:36 / 13:12 | —                     | `ALARM 1`, `ALARM 2`                           |
| 16:40        | —                     | `RÜCKZUG`, `R` = 3:20                          |
| 20:00        | —                     | `ALARM` (Einsatzzeit erreicht)                 |
| 22:00        | Trupp -> Bereitschaft | `R` = −0:02:00 frozen                          |
| 25:00        | —                     | no Alarm (overdue repeats paused)              |
| 27:00        | —                     | `BEREITSCHAFT` (+5)                            |
| 28:00        | Trupp -> Einsatz      | Anmarsch (restored), `R` running from −0:02:00 |
| 31:00        | —                     | `ALARM`, `R` = −0:05:00                        |
| 32:00        | Trupp -> Bereitschaft | `R` = −0:06:00 frozen                          |
| 37:00        | —                     | `BEREITSCHAFT` (+5 since **this** entry)       |
| 38:00        | Trupp -> Einsatz      | Anmarsch                                       |
| 42:00        | —                     | `ALARM`, `R` = −0:10:00                        |

## E. Einsatzstatus transitions

### V15 — Choosing the current status does nothing

§12.5, 5.7

| `t`   | Input                        | Expected                                                                 |
| ----- | ---------------------------- | ------------------------------------------------------------------------ |
| 3:00  | (Anmarsch) Trupp -> Einsatz  | Einsatzliste; still Anmarsch                                             |
| 5:00  | Einsatzziel erreicht, accept | `R` = 25:00, Rückzugsdruck 100 bar (Anmarschdruck from the Anfangsdruck) |
| 6:00  | Trupp -> Bereitschaft        | Bereitschaft                                                             |
| 9:00  | Trupp -> Bereitschaft        | Einsatzliste; the interval is not restarted                              |
| 11:00 | —                            | `BEREITSCHAFT` (+5 since 6:00)                                           |

### V16 — Sicherheitstrupp: no Bereitschaft Alarm, deaktivieren on the way in

§12.8, 4.3

| `t`   | Input                            | Expected                                                         |
| ----- | -------------------------------- | ---------------------------------------------------------------- |
| 0:00  | login with `Sicherheitstrupp OK` | Bereitschaft, Sicherheitstrupp flag set                          |
| 5:00  | —                                | **no** Alarm                                                     |
| 10:00 | —                                | **no** Alarm                                                     |
| 11:00 | Trupp -> Einsatz                 | box `Sicherheitstrupp deaktivieren?` over the Trupp-Menü         |
| 11:00 | X                                | Anmarsch, flag still set; the Trupp-Menü shows a static `SICHER` |
| 13:00 | Trupp -> Bereitschaft            | Bereitschaft, flag still set                                     |
| 18:00 | —                                | **no** Alarm                                                     |
| 19:00 | Trupp -> Einsatz                 | the box again                                                    |
| 19:00 | OK                               | Anmarsch (restored), flag cleared for good                       |
| 20:00 | Trupp -> Bereitschaft            | Bereitschaft, no box on the way out                              |
| 25:00 | —                                | `BEREITSCHAFT` (now an ordinary Trupp)                           |
| 26:00 | Trupp -> Einsatz                 | Anmarsch at once, no box                                         |

### V17 — Logoff from every Einsatzstatus

§12.7. Parametrised over Anmarsch, Einsatzziel erreicht, Rückmarsch and Bereitschaft.

| Input                                                  | Expected                                                                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| bring Trupp 01 into the status; Tally A1, Tally A2, OK | the Trupp is gone from the Einsatzliste; its Einsatzprotokoll records the status at logoff; none of its pending points fires afterwards |

## F. Daueralarm and the login check

### V18 — Logoff Daueralarm

§7.1, 7.3, 7.4, 12.7

| Step | Input    | Expected                                          |
| ---- | -------- | ------------------------------------------------- |
| 1    | Tally A1 | ABMELDEN, A1 marked, no Daueralarm                |
| 2    | OK       | Daueralarm starts; ABMELDEN stays                 |
| 3    | OK       | still Daueralarm (OK does not acknowledge it)     |
| 4    | Tally A2 | Daueralarm stops; ABMELDEN waits (no auto-logoff) |
| 5    | OK       | Trupp 01 logged off                               |

Variants, each from step 2:

- **X**: Daueralarm stops, marks cleared, Trupp 01 back on the Einsatzliste in its earlier Einsatzstatus with Restzeit still running.
- **OK again after X**: Tally A1, OK → Daueralarm restarts.
- **Notausschaltung** of Trupp 01 (X + Check held 4 s real time, then OK): Daueralarm stops, Trupp 01 is ended.
- **Time keeps running**: Restzeit and Trupp 01's alarm points keep advancing while the Daueralarm sounds.

### V19 — Too few Atemschutzträger at login

§7.2, 7.5, 7.6

| Step | Input                           | Expected                                                       |
| ---- | ------------------------------- | -------------------------------------------------------------- |
| 1    | Tally A1 at Check, OK on 30 min | Anmeldefenster with only A1 joined                             |
| 2    | `Trupp OK Einsatz`, OK          | box `Zu wenig Einsatzkräfte!`; no siren, no LED, no Daueralarm |
| 3    | Tally A2                        | A2 joins and the box closes; the Anmeldefenster waits for OK   |
| 4    | OK, accept the Anfangsdruck     | Trupp 01 in Anmarsch                                           |

Variants from step 2:

- **OK**: the box closes, A1 still joined, the Anmeldefenster stays (assumption, §7.6).
- **X**: the box closes, A1 still joined (assumption, §7.6). A second X throws the whole login away and the Truppnummer is free again (the next login gets 01).

## G. Several Alarms at once

### V20 — Later Alarms of one Trupp queue behind its pending Alarm

§8.2, 8.5

| `t`   | Input  | Expected                                                    |
| ----- | ------ | ----------------------------------------------------------- |
| 9:54  | —      | `Trupp 01 ALARM 1` pending; not acknowledged                |
| 19:48 | —      | `ALARM 2` queued behind it: two pending Alarms for Trupp 01 |
| 19:49 | OK, OK | `Trupp 01 ALARM 2` shown, sounding                          |
| 19:50 | OK, OK | nothing pending; the ALARM screen is gone                   |

Variant: one test tick from 9:00 to 20:00 (as a slow device or a long frame might give). Two pending Alarms result, `ALARM 1` before `ALARM 2`.

### V27 — Two OKs: silence, then end

§8.4, 8.1

| `t`   | Input                 | Expected                                                                                     |
| ----- | --------------------- | -------------------------------------------------------------------------------------------- |
| 9:54  | —                     | `Trupp 01 ALARM 1` interrupts the Einsatzliste; signal on (siren and LED)                    |
| 10:00 | OK                    | signal off; the ALARM screen stays with `Alarmende mit OK`, `R` still updating (`R` = 20:00) |
| 10:05 | Up, Down, X, Tally B1 | ignored                                                                                      |
| 10:10 | OK                    | the Alarm ends; back on the Einsatzliste with Trupp 01 selected                              |

### V21 — FIFO across Trupps, interruption and return

§8.1, 8.2, 8.4

Trupp 01 logs in at 0:00, Trupp 02 at 0:30.

| `t`   | Input                                                      | Expected                                           |
| ----- | ---------------------------------------------------------- | -------------------------------------------------- |
| 9:50  | Trupp 01 → Druck ändern (opens at 200), Down to 180, no OK | pressure editor shows 180                          |
| 9:54  | —                                                          | `Trupp 01 ALARM 1` interrupts                      |
| 10:00 | Up, Down, X, Tally B1                                      | ignored (only OK works)                            |
| 10:24 | —                                                          | Trupp 02's `ALARM 1` queues behind Trupp 01        |
| 10:30 | OK, OK                                                     | `Trupp 02 ALARM 1`                                 |
| 10:31 | OK, OK                                                     | back in the pressure editor with 180 still entered |

### V22 — Alarm during a Daueralarm

§8.2 (a Daueralarm is never queued), 8.4. Trupps as in V21; Trupp 01's `ALARM 1` already acknowledged.

| `t`   | Input                  | Expected                                                             |
| ----- | ---------------------- | -------------------------------------------------------------------- |
| 10:00 | Trupp 01: Tally A1, OK | logoff Daueralarm                                                    |
| 10:24 | —                      | `Trupp 02 ALARM 1` interrupts ABMELDEN                               |
| 10:25 | OK                     | still on the ALARM screen; the signal keeps running (the Daueralarm) |
| 10:26 | OK                     | back on ABMELDEN; the Daueralarm is still active                     |

## H. Real time vs simulated time

### V23 — Display timings ignore the speed control; pause freezes both (`world/`)

§9.1, 9.2, 8.2, 8.4. Each `tick` carries `now` (simulated) and `realNow` (real).

| Setup                                     | Input                                    | Expected                                                     |
| ----------------------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| 10×, Trupp 01 running, Trupp-Menü open    | 15 s real                                | back on the Einsatzliste ([13]); `R` has dropped by 2:30     |
| 10×, Trupp-Ansicht after Druck ändern     | 5 s real                                 | back on the Einsatzliste; `R` has dropped by 0:50            |
| 10×, Startdisplay                         | 25 s real                                | Aus (Abschaltzeit)                                           |
| 10×, Sicherheitstrupp on the Einsatzliste | 2 s real                                 | `SICHER` and the status glyph alternate once per real second |
| 10×, Einsatzliste                         | X + Check held 4 s real (40 s simulated) | Notausschaltung opens after 4 s real, not after 0.4 s real   |
| pause on the Trupp-Menü                   | 60 s real                                | still on the Trupp-Menü; `R` unchanged; no Alarm fires       |
| 1×, pending Alarm, pause                  | —                                        | siren silent, LED held; on play both resume                  |
| 10×, Alarm fires                          | OK                                       | signal off, speed still locked at 1×                         |
| same                                      | OK                                       | Alarm ended; the speed presets work again (still at 1×)      |

## Coverage matrix

| Rule              | Scenarios                                                     |
| ----------------- | ------------------------------------------------------------- |
| 1.1, 1.2          | V1                                                            |
| 1.3               | V1, V2                                                        |
| 1.4 (D)           | V3, V4                                                        |
| 1.5               | V4, V10                                                       |
| 1.6 (D)           | V2                                                            |
| 1.7 (D)           | V1, V3, V7                                                    |
| 1.8 (D)           | V4                                                            |
| 2.1, 2.2          | V1, V2, V28                                                   |
| 2.3 (D)           | V6                                                            |
| 2.4 (D)           | V2, V3                                                        |
| 2.5               | defaults in every scenario                                    |
| 3.1, 3.2          | V1                                                            |
| 3.3 (D)           | V1, V5, V14 (the multi-step clause is unreachable, see below) |
| 3.4 (D)           | V5                                                            |
| 3.5 (D)           | V6, V14                                                       |
| 3.6 (D)           | V24                                                           |
| 4.1, 4.2, 4.3     | V12, V13, V16                                                 |
| 4.4 (D)           | V12, V14, V15                                                 |
| 4.5               | V13                                                           |
| 4.6 (D)           | V12, V13, V14, V26 (mode on only)                             |
| 4.7 (D)           | V14                                                           |
| 5.3               | V7                                                            |
| 5.5 (D)           | V1, V7, V8, V25                                               |
| 5.7 (D)           | V7, V8, V13, V15, V25                                         |
| 5.9 (D)           | V6, V10, V24, V26                                             |
| 5.10 (D)          | V11                                                           |
| 5.11 (D)          | V7                                                            |
| 5.13 (D)          | V1, V2, V28                                                   |
| 5.14 (D)          | V5, V9, V10                                                   |
| 7.1, 7.3, 7.4 (D) | V18                                                           |
| 7.5, 7.6 (D)      | V19                                                           |
| 8.1               | V1, V21, V27                                                  |
| 8.2 (D)           | V5, V20, V21, V22                                             |
| 8.3               | V8, V28                                                       |
| 8.4 (D)           | V20, V21, V22, V23, V27                                       |
| 8.5 (D)           | every scenario                                                |
| 9 defaults (D)    | every scenario; [17] = 180 in V28                             |
| 9.1 (D)           | V23                                                           |
| 12.1              | V1, V12, V16                                                  |
| 12.2 (D)          | V6, V11                                                       |
| 12.3 (D)          | V13, V26                                                      |
| 12.4 (D)          | V12, V13, V26                                                 |
| 12.5 (D)          | V11, V15                                                      |
| 12.6 (D)          | V11, V26                                                      |
| 12.7 (D)          | V17, V18                                                      |
| 12.8 (D)          | V16                                                           |

(D) marks a **Decided** rule. 5.6 and 5.15 are withdrawn and 7.2 no longer describes a Daueralarm, so they have no scenario.

## Not implemented

With the fixed defaults (§9) and no Workbench, the Trainee can never reach these, so they are not implemented (§9.3) and have no scenarios:

- **Rückzugsalarmmodus off**: 5.2, 5.12, the mode-off halves of 4.6, 12.1 and 12.4. [41]/[70]/[71] are on for every simulated Einsatzzeit. 5.1 (per-Einsatzzeit switch) is unobservable for the same reason.
- **[73] = 0** (pressure may only be lowered, 1.5): [73] is fixed at 5 bar.

Also without a scenario:

- **3.3, multi-step clause**: a pressure entry sets `R = T × P / P_N ≥ 0`, so it can never jump Restzeit down across several overdue steps. Only 0:00:00 can be reached by an entry (3.4, V5); an overdue Trupp's entry re-arms instead (3.6, V24).
- **Section 6** (Prozentmodus) and Einsatzzeit #2: out of scope.
- **5.4 and 5.8** (the Anmarschzeit and the bar split on the Trupp-Ansicht) are screen-model assertions for `lcd/`, not reducer rules.

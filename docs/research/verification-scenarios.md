# Timing and alarm verification scenarios

Research for the wayfinder ticket _Choose the timing and alarm scenarios for the verification suite_.
These are the scenarios the reducer-core suite drives through `reduce` with `tick` events. They are derived from the [timing and alarm rules](timing-and-alarm-rules.md) (§ numbers below), sections 1–9 and 12.
Every **Decided** rule there is covered at least once (see the [coverage matrix](#coverage-matrix)). Rules that the fixed defaults make unreachable are listed under [Not implemented](#not-implemented). The edge cases the scenarios exposed were settled in _Settle the edge cases the verification scenarios exposed_ (§1.8, 2.6, 3.6, 5.7, 9.2, 9.3).

## Conventions

- **Defaults** are section 9 throughout: `P_N` = 300 bar, Rückzugsalarmmodus on, [42] = 50 bar, [76] = [73] = 5 bar, [05] = [06] = 5 min, [07] = 2, [13] = 15 s, Alarmgrenzen 33 % / 66 %.
- **`t`** is simulated time since the scenario starts, in `m:ss`. The suite uses integer milliseconds. Speed is 1× unless the scenario says otherwise, so real time equals `t`.
- **Derived constants.** With `P_N` = 300, one bar is worth `T / 300` of Restzeit:

  | Einsatzzeit | 1 bar = | `t_res` (50 bar) | Alarmgrenze #1 (`G1`) | Alarmgrenze #2 (`G2`) |
  | ----------- | ------- | ---------------- | --------------------- | --------------------- |
  | 30 min (#1) | 6 s     | 5:00             | 9:54                  | 19:48                 |
  | 20 min (#3) | 4 s     | 3:20             | 6:36                  | 13:12                 |

  `G1`/`G2` take 33 % and 66 % literally (`t_run ≥ g × T`, §2.2, 2.6), not as thirds.

- **Trupps.** Trupp 01 is made of Tallys A1 + A2 and Trupp 02 of Tallys B1 + B2 (any two roster Tallys). A login is the Einsatzzeit choice, the Anmeldefenster with both Tallys, the `Trupp OK …` item and the Anfangsdruck. Unless stated it is 30 min, `Trupp OK Einsatz`, Anfangsdruck 300 bar.
- **Inputs** are written as Trupp-Menü actions ("Einsatzziel erreicht, enter 250"). A test helper expands them into key events. "enter P" means the pressure editor is set to P and confirmed with OK; "accept" means OK on the value the editor opened with.
- **Expected** lists the Einsatzstatus, Restzeit `R`, the pressure estimate (§1.7) where it matters, and which Alarm becomes pending. An Alarm is acknowledged with OK at once unless the scenario says otherwise. "no Alarm" checks the tick just past a point where a wrong implementation would fire.
- **Layer.** Every scenario is a `core/` test unless marked `world/` (it needs the speed control or pause).

## A. Restzeit and pressure

### V1 — Untouched Trupp runs out and goes overdue

§1.1, 1.2, 1.3, 1.7 (clamp), 2.1, 2.2, 3.1, 3.2, 3.3 (anchoring), 5.13, 8.1, 12.1

Login at `t` = 0:00. The Trupp is never touched until 0:00:00.

| `t`   | Input                  | Expected                                                                           |
| ----- | ---------------------- | ---------------------------------------------------------------------------------- |
| 0:00  | login                  | Anmarsch, `R` = 30:00, estimate 300 bar                                            |
| 9:53  | —                      | `R` = 20:07, no Alarm                                                              |
| 9:54  | —                      | Alarm (`G1`), `R` = 20:06                                                          |
| 15:00 | —                      | `R` = 15:00, estimate 150 bar                                                      |
| 19:48 | —                      | Alarm (`G2`)                                                                       |
| 29:59 | —                      | `R` = 0:00:01, no Alarm, and no Rückzugsalarm at any point (Anmarsch has no `t_A`) |
| 30:00 | —                      | Alarm (Einsatzzeit erreicht), `R` = 0:00:00                                        |
| 31:00 | —                      | `R` = −0:01:00, estimate 0 bar (clamped)                                           |
| 33:00 | OK (acknowledged late) | —                                                                                  |
| 35:00 | —                      | Alarm, `R` = −0:05:00 (anchored to `R`, not to the late OK)                        |
| 40:00 | —                      | Alarm, `R` = −0:10:00                                                              |

### V2 — Anfangsdruck scales Restzeit, not the Alarmgrenzen

§1.3, 1.6, 2.2

| `t`   | Input                                                       | Expected                                                     |
| ----- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| 0:00  | login; in the Anfangsdruck editor press Down until it stops | the editor stops at 270 bar (−10 % of `P_N`), in 5-bar steps |
| 0:00  | press Up until it stops                                     | the editor stops at 330 bar (+10 %)                          |
| 0:00  | enter 270                                                   | Anmarsch, `R` = 27:00                                        |
| 9:54  | —                                                           | Alarm (`G1`, on elapsed time), `R` = 17:06                   |
| 19:48 | —                                                           | Alarm (`G2`), `R` = 7:12                                     |
| 27:00 | —                                                           | Alarm (Einsatzzeit erreicht)                                 |
| 32:00 | —                                                           | Alarm, `R` = −0:05:00                                        |

A second login with 330 bar gives `R` = 33:00. Restzeit may exceed the Einsatzzeit.

### V3 — A pressure entry resets Restzeit; the editor opens at the snapped estimate

§1.4, 1.7, 2.4

| `t`   | Input        | Expected                                                                           |
| ----- | ------------ | ---------------------------------------------------------------------------------- |
| 6:03  | Druck ändern | `R` = 23:57 → estimate 239 bar; the editor opens at 235 bar (snapped down to [76]) |
| 6:03  | enter 210    | `R` = 21:00, no Alarm                                                              |
| 9:54  | —            | Alarm (`G1`: elapsed time, unmoved by the entry), `R` = 17:09                      |
| 19:48 | —            | Alarm (`G2`)                                                                       |
| 27:03 | —            | Alarm (Einsatzzeit erreicht)                                                       |
| 32:03 | —            | Alarm, `R` = −0:05:00                                                              |

### V4 — Druck ändern may raise the pressure

§1.5, 1.4, 1.8

| `t`   | Input                               | Expected                                                |
| ----- | ----------------------------------- | ------------------------------------------------------- |
| 10:00 | Druck ändern                        | editor opens at 200 bar                                 |
| 10:00 | Up once, OK                         | `R` = 20:30 (205 bar)                                   |
| 11:00 | Druck ändern, X                     | `R` unchanged (19:30), back on the Trupp-Menü           |
| 12:00 | Druck ändern, Up until it stops, OK | the editor stops at 330 bar (`P_N` + 10 %), `R` = 33:00 |

### V5 — A pressure entry of 0 bar reaches Einsatzzeit erreicht at once

§3.4, 3.3

| `t`   | Input                 | Expected                                          |
| ----- | --------------------- | ------------------------------------------------- |
| 8:00  | Druck ändern, enter 0 | Alarm (Einsatzzeit erreicht) on OK, `R` = 0:00:00 |
| 9:54  | —                     | Alarm (`G1`)                                      |
| 13:00 | —                     | Alarm, `R` = −0:05:00                             |

### V24 — A pressure entry on an overdue Trupp re-arms Einsatzzeit erreicht

§3.6, 1.7 (clamp)

| `t`   | Input        | Expected                                 |
| ----- | ------------ | ---------------------------------------- |
| 30:00 | —            | Alarm (Einsatzzeit erreicht)             |
| 35:00 | —            | Alarm, `R` = −0:05:00                    |
| 37:00 | Druck ändern | editor opens at 0 bar (estimate clamped) |
| 37:00 | Up to 30, OK | `R` = 3:00, no Alarm                     |
| 40:00 | —            | Alarm (Einsatzzeit erreicht, again)      |
| 45:00 | —            | Alarm, `R` = −0:05:00 (again)            |

## B. Alarmgrenzen, Rückmarsch and every-status alarms

### V6 — Alarms in every Einsatzstatus; Rückmarsch suppresses only the Rückzugsalarm

§2.3, 3.5, 5.9 (Rückmarsch), 12.2

| `t`   | Input                              | Expected                                                               |
| ----- | ---------------------------------- | ---------------------------------------------------------------------- |
| 3:00  | Einsatzziel erreicht, accept (270) | Einsatzziel erreicht, `R` = 27:00, `t_A` = 3:00, Rückzugsdruck 110 bar |
| 9:54  | —                                  | Alarm (`G1`) in Einsatzziel erreicht                                   |
| 12:00 | Rückzug antreten, accept (180)     | Rückmarsch, `R` = 18:00                                                |
| 19:00 | —                                  | `R` = 11:00 = `2·t_A + t_res`: **no** Rückzugsalarm                    |
| 19:48 | —                                  | Alarm (`G2`) in Rückmarsch                                             |
| 30:00 | —                                  | Alarm (Einsatzzeit erreicht) in Rückmarsch                             |
| 35:00 | —                                  | Alarm, `R` = −0:05:00                                                  |

## C. Rückzugsalarm

### V7 — Rückzugsalarm on the normal path; the estimate meets the Rückzugsdruck

§5.3, 5.4, 5.5, 5.6, 5.7, 5.11, 5.13

| `t`   | Input                              | Expected                                                                |
| ----- | ---------------------------------- | ----------------------------------------------------------------------- |
| 5:00  | Einsatzziel erreicht, accept (250) | `R` = 25:00, `t_A` = 5:00, threshold `R` ≤ 15:00, Rückzugsdruck 150 bar |
| 9:54  | —                                  | Alarm (`G1`)                                                            |
| 14:59 | —                                  | no Alarm, estimate 150 bar (`R` = 15:01)                                |
| 15:00 | —                                  | Rückzugsalarm, `R` = 15:00, estimate 150 bar = Rückzugsdruck            |
| 15:01 | —                                  | no further Rückzugsalarm                                                |
| 19:48 | —                                  | Alarm (`G2`)                                                            |
| 30:00 | —                                  | Alarm (Einsatzzeit erreicht)                                            |

Variant, rounding (§5.7): Einsatzziel erreicht at 5:04 instead. `R` = 24:56, so the editor opens at 245 bar (estimate 249, snapped down); accept → `R` = 24:30. `t_A` = 5:04, threshold 15:08, Rückzugsdruck 151 bar (151.33 rounded down). Rückzugsalarm at 14:26, estimate 151 bar.

### V8 — Rückzugsalarm with the 20-min Einsatzzeit (Langzeiteinsatz)

§5.6 (`t_res` scales with `T`), 5.7, 8.3

| `t`   | Input                                   | Expected                                                                             |
| ----- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| 0:00  | choose 20 min, OK                       | the bottom line reads `Langzeiteinsatz? OK`; the Anmeldefenster is **not** shown yet |
| 0:00  | X                                       | back to the Einsatzzeit choice                                                       |
| 0:00  | choose 20 min, OK, OK; finish the login | Anmarsch, `R` = 20:00                                                                |
| 2:00  | Einsatzziel erreicht, accept (270)      | `R` = 18:00, `t_A` = 2:00, threshold 7:20, Rückzugsdruck 110 bar                     |
| 6:36  | —                                       | Alarm (`G1`)                                                                         |
| 12:40 | —                                       | Rückzugsalarm, `R` = 7:20, estimate 110 bar                                          |
| 13:12 | —                                       | Alarm (`G2`)                                                                         |

### V9 — Threshold already passed at Einsatzziel erreicht

§5.14

| `t`  | Input                                 | Expected                                                                               |
| ---- | ------------------------------------- | -------------------------------------------------------------------------------------- |
| 8:00 | Einsatzziel erreicht, X in the editor | still Anmarsch, no Alarm                                                               |
| 8:00 | Einsatzziel erreicht, enter 100       | Einsatzziel erreicht, `R` = 10:00 ≤ 21:00 → Rückzugsalarm on OK; Rückzugsdruck 210 bar |
| 9:54 | —                                     | Alarm (`G1`); no second Rückzugsalarm at any later `t`                                 |

### V10 — Pressure entry crosses the threshold; a raise does not re-arm

§5.14, 5.9 (no re-arm), 1.8

| `t`  | Input                                    | Expected                                       |
| ---- | ---------------------------------------- | ---------------------------------------------- |
| 5:00 | Einsatzziel erreicht, accept (250)       | threshold 15:00                                |
| 7:00 | Druck ändern, enter 145                  | `R` = 14:30 → Rückzugsalarm on OK              |
| 7:30 | Druck ändern, enter 155 (raise, 3 steps) | `R` = 15:30, above the threshold again         |
| 8:31 | —                                        | `R` = 14:59, below again: **no** Rückzugsalarm |

### V11 — Anmarsch → Rückmarsch skips the Rückzugsalarm; Rückmarsch is final

§5.10, 12.2, 12.5, 12.6

| `t`   | Input                          | Expected                                                                          |
| ----- | ------------------------------ | --------------------------------------------------------------------------------- |
| 6:00  | Trupp-Menü                     | header `ANMARSCH`, lists `Einsatzziel erreicht` and `Rückzug antreten`            |
| 6:00  | Rückzug antreten, accept (240) | Rückmarsch, `R` = 24:00, no `t_A`                                                 |
| 6:30  | Trupp-Menü                     | header `RÜCKMARSCH`, neither `Einsatzziel erreicht` nor `Rückzug antreten` listed |
| 6:30  | Trupp -> Einsatz               | nothing changes (already a running status), back to the Einsatzliste              |
| 9:54  | —                              | Alarm (`G1`); no Rückzugsalarm ever                                               |
| 30:00 | —                              | Alarm (Einsatzzeit erreicht)                                                      |

## D. Bereitschaft

### V12 — Login in Bereitschaft

§4.1, 4.2, 4.3, 4.4, 4.6, 12.1, 12.4

| `t`   | Input                              | Expected                                                   |
| ----- | ---------------------------------- | ---------------------------------------------------------- |
| 0:00  | login with `Trupp OK Bereitschaft` | Bereitschaft, `R` = 30:00 frozen                           |
| 5:00  | —                                  | Alarm (Bereitschaft), `R` = 30:00                          |
| 7:00  | OK (late)                          | —                                                          |
| 9:54  | —                                  | no Alarm (`t_run` = 0)                                     |
| 10:00 | —                                  | Alarm (Bereitschaft, +10 since entry, not +5 since the OK) |
| 12:00 | Trupp -> Einsatz                   | Anmarsch (mode on), `R` = 30:00 running                    |
| 15:00 | —                                  | no Bereitschaft Alarm                                      |
| 21:54 | —                                  | Alarm (`G1` at `t_run` = 9:54), `R` = 20:06                |

### V13 — Bereitschaft mid-Einsatz pauses all alarms and starts a new Anmarsch leg

§4.1, 4.4, 4.5, 4.6, 5.9 (once per leg), 5.15, 12.3, 12.4

| `t`   | `t_run` | Input                              | Expected                                                                       |
| ----- | ------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| 4:00  | 4:00    | Einsatzziel erreicht, enter 160    | `R` = 16:00, `t_A` = 4:00, threshold 13:00, Rückzugsdruck 130 bar              |
| 7:00  | 7:00    | —                                  | Rückzugsalarm (`R` = 13:00)                                                    |
| 8:00  | 8:00    | Trupp -> Bereitschaft              | Bereitschaft, `R` = 12:00 frozen                                               |
| 13:00 | 8:00    | —                                  | Alarm (Bereitschaft)                                                           |
| 14:00 | 8:00    | Trupp -> Einsatz                   | **Anmarsch** (not Einsatzziel erreicht), `t_A` cleared, Rückzugsalarm disarmed |
| 15:54 | 9:54    | —                                  | Alarm (`G1`, shifted by the 6 min in Bereitschaft)                             |
| 16:00 | 10:00   | Einsatzziel erreicht, accept (100) | `R` = 10:00, `t_A` = 2:00 (this leg), threshold 9:00, Rückzugsdruck 90 bar     |
| 17:00 | 11:00   | —                                  | Rückzugsalarm again (new leg)                                                  |
| 25:48 | 19:48   | —                                  | Alarm (`G2`)                                                                   |
| 26:00 | 20:00   | —                                  | Alarm (Einsatzzeit erreicht)                                                   |
| 31:00 | 25:00   | —                                  | Alarm, `R` = −0:05:00                                                          |

### V14 — Overdue Trupp in Bereitschaft; the interval restarts on each entry

§4.4, 4.7, 3.3, 3.5

20-min Einsatzzeit (Langzeiteinsatz confirmed as in V8), Anfangsdruck 300.

| `t`          | Input                 | Expected                                      |
| ------------ | --------------------- | --------------------------------------------- |
| 6:36 / 13:12 | —                     | Alarms (`G1`, `G2`)                           |
| 20:00        | —                     | Alarm (Einsatzzeit erreicht)                  |
| 22:00        | Trupp -> Bereitschaft | `R` = −0:02:00 frozen                         |
| 25:00        | —                     | no Alarm (overdue repeats paused)             |
| 27:00        | —                     | Alarm (Bereitschaft, +5)                      |
| 28:00        | Trupp -> Einsatz      | Anmarsch, `R` running from −0:02:00           |
| 31:00        | —                     | Alarm, `R` = −0:05:00                         |
| 32:00        | Trupp -> Bereitschaft | `R` = −0:06:00 frozen                         |
| 37:00        | —                     | Alarm (Bereitschaft, +5 since **this** entry) |
| 38:00        | Trupp -> Einsatz      | Anmarsch                                      |
| 42:00        | —                     | Alarm, `R` = −0:10:00                         |

## E. Einsatzstatus transitions

### V15 — Choosing the current status does nothing

§12.5

| `t`   | Input                        | Expected                                                              |
| ----- | ---------------------------- | --------------------------------------------------------------------- |
| 3:00  | (Anmarsch) Trupp -> Einsatz  | Einsatzliste; still Anmarsch, the leg is **not** restarted            |
| 5:00  | Einsatzziel erreicht, accept | `t_A` = 5:00 (measured from login, proving the leg was not restarted) |
| 6:00  | Trupp -> Bereitschaft        | Bereitschaft                                                          |
| 9:00  | Trupp -> Bereitschaft        | Einsatzliste; the interval is not restarted                           |
| 11:00 | —                            | Alarm (Bereitschaft, +5 since 6:00)                                   |

### V16 — Sicherheitstrupp keeps its flag

§12.8, 4.3

| `t`  | Input                            | Expected                                |
| ---- | -------------------------------- | --------------------------------------- |
| 0:00 | login with `Sicherheitstrupp OK` | Bereitschaft, Sicherheitstrupp flag set |
| 5:00 | —                                | Alarm (Bereitschaft)                    |
| 6:00 | Trupp -> Einsatz                 | Anmarsch, flag still set                |
| 8:00 | Trupp -> Bereitschaft            | Bereitschaft, flag still set            |

### V17 — Logoff from every Einsatzstatus

§12.7. Parametrised over Anmarsch, Einsatzziel erreicht, Rückmarsch and Bereitschaft.

| Input                                                  | Expected                                                                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| bring Trupp 01 into the status; Tally A1, Tally A2, OK | the Trupp is gone from the Einsatzliste; its Einsatzprotokoll records the status at logoff; none of its pending points fires afterwards |

## F. Daueralarm

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

### V19 — Login Daueralarm

§7.2, 7.5, 7.6

| Step | Input                           | Expected                                          |
| ---- | ------------------------------- | ------------------------------------------------- |
| 1    | Tally A1 at Check, OK on 30 min | Anmeldefenster with only A1 joined                |
| 2    | `Trupp OK Einsatz`, OK          | Daueralarm starts; the Anmeldefenster stays       |
| 3    | Tally A2                        | Daueralarm stops; the Anmeldefenster waits for OK |
| 4    | OK, accept the Anfangsdruck     | Trupp 01 in Anmarsch                              |

Variant from step 2: **X**. The Daueralarm stops, the whole login is thrown away and the Truppnummer is free again (the next login gets 01).

## G. Several Alarms at once

### V20 — Later Alarms of one Trupp merge into its pending Alarm

§8.2

| `t`   | Input | Expected                                     |
| ----- | ----- | -------------------------------------------- |
| 9:54  | —     | Alarm (`G1`) pending; not acknowledged       |
| 19:48 | —     | still exactly one pending Alarm for Trupp 01 |
| 19:49 | OK    | nothing pending; the S12 screen is gone      |

Variant: one test tick from 9:00 to 20:00 (as a slow device or a long frame might give). Exactly one pending Alarm results, not two.

### V21 — FIFO across Trupps, interruption and return

§8.1, 8.2

Trupp 01 logs in at 0:00, Trupp 02 at 0:30.

| `t`   | Input                                                      | Expected                                           |
| ----- | ---------------------------------------------------------- | -------------------------------------------------- |
| 9:50  | Trupp 01 → Druck ändern (opens at 200), Down to 180, no OK | pressure editor shows 180                          |
| 9:54  | —                                                          | S12 for Trupp 01 interrupts                        |
| 10:00 | Up, Down, X, Tally B1                                      | ignored (only OK works)                            |
| 10:24 | —                                                          | Trupp 02's `G1` queues behind Trupp 01             |
| 10:30 | OK                                                         | S12 for Trupp 02                                   |
| 10:31 | OK                                                         | back in the pressure editor with 180 still entered |

### V22 — Alarm during a Daueralarm

§8.2 (a Daueralarm is never queued). Trupps as in V21; Trupp 01's `G1` already acknowledged.

| `t`   | Input                  | Expected                                         |
| ----- | ---------------------- | ------------------------------------------------ |
| 10:00 | Trupp 01: Tally A1, OK | logoff Daueralarm                                |
| 10:24 | —                      | S12 for Trupp 02 interrupts ABMELDEN             |
| 10:25 | OK                     | back on ABMELDEN; the Daueralarm is still active |

## H. Real time vs simulated time

### V23 — Display timings ignore the speed control; pause freezes both (`world/`)

§9.1, 9.2, 8.2. Each `tick` carries `now` (simulated) and `realNow` (real).

| Setup                                     | Input                                    | Expected                                                     |
| ----------------------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| 10×, Trupp 01 running, Trupp-Ansicht open | 15 s real                                | back on the Einsatzliste ([13]); `R` has dropped by 2:30     |
| 10×, Startdisplay                         | 25 s real                                | Aus (Abschaltzeit)                                           |
| 10×, Sicherheitstrupp on the Einsatzliste | 2 s real                                 | `SICHER` and the status glyph alternate once per real second |
| 10×, Einsatzliste                         | X + Check held 4 s real (40 s simulated) | Notausschaltung opens after 4 s real, not after 0.4 s real   |
| pause on the Trupp-Ansicht                | 60 s real                                | still on the Trupp-Ansicht; `R` unchanged; no Alarm fires    |
| 1×, pending Alarm, pause                  | —                                        | siren silent, LED held; on play both resume                  |

## Coverage matrix

| Rule              | Scenarios                                                     |
| ----------------- | ------------------------------------------------------------- |
| 1.1, 1.2          | V1                                                            |
| 1.3               | V1, V2                                                        |
| 1.4 (D)           | V3, V4                                                        |
| 1.5               | V4, V10                                                       |
| 1.6               | V2                                                            |
| 1.7 (D)           | V1, V3, V7                                                    |
| 2.1, 2.2          | V1, V2                                                        |
| 2.3 (D)           | V6                                                            |
| 2.4 (D)           | V2, V3                                                        |
| 2.5               | defaults in every scenario                                    |
| 3.1, 3.2          | V1                                                            |
| 3.3 (D)           | V1, V5, V14 (the multi-step clause is unreachable, see below) |
| 3.4 (D)           | V5                                                            |
| 3.5 (D)           | V6, V14                                                       |
| 4.1, 4.2, 4.3     | V12, V13                                                      |
| 4.4 (D)           | V12, V14, V15                                                 |
| 4.5               | V13                                                           |
| 4.6 (D)           | V12, V13 (mode on only)                                       |
| 4.7 (D)           | V14                                                           |
| 5.3, 5.4, 5.5     | V7                                                            |
| 5.6 (D)           | V7, V8                                                        |
| 5.7 (D)           | V7, V8, V13                                                   |
| 5.9 (D)           | V6, V10, V13                                                  |
| 5.10 (D)          | V11                                                           |
| 5.11 (D)          | V7                                                            |
| 5.13 (D)          | V1, V7                                                        |
| 5.14 (D)          | V9, V10                                                       |
| 5.15 (D)          | V13, V15                                                      |
| 7.1, 7.3, 7.4 (D) | V18                                                           |
| 7.2, 7.5, 7.6 (D) | V19                                                           |
| 8.1               | V1, V21                                                       |
| 8.2 (D)           | V20, V21, V22                                                 |
| 8.3               | V8                                                            |
| 9 defaults (D)    | every scenario                                                |
| 9.1 (D)           | V23                                                           |
| 12.1              | V1, V12, V16                                                  |
| 12.2 (D)          | V6, V11                                                       |
| 12.3 (D)          | V13                                                           |
| 12.4 (D)          | V12, V13                                                      |
| 12.5 (D)          | V11, V15                                                      |
| 12.6 (D)          | V11                                                           |
| 12.7 (D)          | V17, V18                                                      |
| 12.8 (D)          | V16                                                           |

(D) marks a **Decided** rule.

## Not implemented

With the fixed defaults (§9) and no Workbench, the Trainee can never reach these, so they are not implemented (§9.3) and have no scenarios:

- **Rückzugsalarmmodus off**: 5.2, 5.12, the mode-off halves of 4.6, 12.1 and 12.4, and `Rückzug antreten (mode on only)`. [41]/[70] are on for both simulated Einsatzzeiten. 5.1 (per-Einsatzzeit switch) is unobservable for the same reason.
- **[73] = 0** (pressure may only be lowered, 1.5): [73] is fixed at 5 bar.

Also without a scenario:

- **3.3, multi-step clause**: a pressure entry sets `R = T × P / P_N ≥ 0`, so it can never jump Restzeit down across several overdue steps. Only 0:00:00 can be reached by an entry (3.4, V5); an overdue Trupp's entry re-arms instead (3.6, V24).
- **Section 6** (Prozentmodus) and Einsatzzeit #2/#4: out of scope.
- **5.8** (the bar split on the Trupp-Ansicht) is a screen-model assertion for `lcd/`, not a reducer rule.

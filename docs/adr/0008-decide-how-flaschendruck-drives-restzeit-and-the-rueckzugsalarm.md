# Decide how Flaschendruck drives Restzeit and the Rückzugsalarm

Every Flaschendruck entry (login, Druck ändern, Einsatzziel erreicht, Rückzug antreten) resets the Restzeit to `T × P / P_N`. The Alarmgrenzen, however, run on elapsed running time and never move with pressure, which matches FwDV 7's clock-time reminders at 1/3 and 2/3. The Reservedruck converts to time linearly (`t_res = [42] × T / P_N`), and the Rückzugsalarm fires at `R ≤ 2·t_A + t_res`. The Rückzugsdruck shown is that threshold's pressure equivalent, and the Aktueller Flaschendruck is a live estimate from the Restzeit. [82] is inert.

The guiding principle is to **replicate the device, not the regulation**. The Rückzugsalarm is deliberately time-based, as on the device, and does not follow FwDV 7's rule of twice the Atemluftmenge. Don't "fix" it. The figure-fitted Rückzugsdruck `[42] + 2 × (P_0 − P_Ziel)` was rejected because it disagrees with the time-based alarm.

The normative rules are 1.4, 1.7, 2.2, 2.4, 5.6, 5.7, 5.11 and 5.12 in the [timing and alarm rules](../research/timing-and-alarm-rules.md), with the FwDV 7 comparison in its section 11.

Decided in [Decide how Flaschendruck drives Restzeit and the Rückzugsalarm](https://github.com/lharzenetter/checkbox-simulator/issues/11).

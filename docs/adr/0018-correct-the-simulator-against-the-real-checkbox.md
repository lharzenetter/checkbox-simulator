# Correct the simulator against the real Checkbox

The user checked the simulator's assumptions on a real Checkbox 5+1 (photos in [Check the simulator's assumptions against the real Checkbox](https://github.com/lharzenetter/checkbox-simulator/issues/48)). Where the device disagreed, the device wins, even where it reverses an earlier decision. Points the user inferred rather than saw are marked as assumptions.

## Rückzug

- The **Rückzugsdruck** is `max(2 × Anmarschdruck, [42])`, where the Anmarschdruck is the Anfangsdruck minus the Flaschendruck entered at Einsatzziel erreicht. Before Einsatzziel erreicht it is the floor, 50 bar. The [42] Reservedruck is a floor, no longer an allowance added on top.
- The **Rückzugsalarm is pressure-based**: it fires when the live estimate `R × P_N / T` falls to the Rückzugsdruck. The estimate stays as it is (rule 1.7).
- It is armed from login in every Einsatzstatus except Bereitschaft and Rückmarsch (Rückmarsch: assumption). It fires once, and re-arms only when a pressure entry lifts the estimate back above the Rückzugsdruck. A pressure entry at or below it fires it on OK.

This reverses the time-based alarm of [Decide how Flaschendruck drives Restzeit and the Rückzugsalarm](0008-decide-how-flaschendruck-drives-restzeit-and-the-rueckzugsalarm.md) and the once-per-Anmarsch-leg arming of [Decide when one-shot and repeating alarms fire](0009-decide-when-one-shot-and-repeating-alarms-fire.md).

## Alarms

- The ALARM screen names the cause in its header: `Trupp NN ALARM 1` / `ALARM 2` (Alarmgrenzen), `RÜCKZUG`, `ALARM` (00:00:00 and the overdue repeats), `BEREITSCHAFT`.
- **No merging.** Every Alarm is its own entry in the FIFO queue, even several of one Trupp.
- **Two OKs.** The first silences the siren and darkens the LED; the screen stays, live, and every other key is still ignored. The second ends the Alarm and shows the next one or the interrupted screen. The speed stays locked at 1× until the second OK.
- The screen shows `Personen-Anzahl: N` instead of the names, beside the cylinder graphic, the boxed Flaschendruck, Restzeit and Rückzugsdruck, and `Alarmende mit OK` (unchanged after the first OK).
- The Bereitschaft Alarm never sounds for a Sicherheitstrupp.
- The Alarmgrenzen at 9:54 / 19:48 (30 min) are confirmed.

This amends [Decide how alarms are presented](0013-decide-how-alarms-are-presented.md) (points 1, 3, 4) and [Drop the simulation to real time while an Alarm sounds](0017-drop-the-simulation-to-real-time-while-an-alarm-sounds.md) (point 2).

## Navigation and Einsatzstatus

- OK on the Einsatzliste opens the **Trupp-Menü** directly; X there → Einsatzliste. The menu shows a clock line with the Restzeit and, for a Sicherheitstrupp, a static `SICHER`.
- The **Trupp-Ansicht** (layout as the ALARM screen, labelled `Ansicht`) appears only after OK confirms a pressure entry, for 5 s of real time; any key closes it early → Einsatzliste. After the login entry too (assumption).
- `Einsatzziel erreicht` is offered only in Anmarsch, and `Rückzug antreten` only in Einsatzziel erreicht. Anmarsch → Rückmarsch directly is gone.
- `Trupp -> Einsatz` from Bereitschaft **restores the previous Einsatzstatus**, or Anmarsch if the Trupp started in Bereitschaft. Nothing resets: the Anmarschzeit resumes, and there are no more Anmarsch legs.
- A Sicherheitstrupp leaving Bereitschaft is asked `Sicherheitstrupp deaktivieren?` each time (assumption): X sends it in as a Sicherheitstrupp, OK sends it in as an ordinary Trupp, for good.

This amends [Define the key-by-screen navigation model](0004-define-the-key-by-screen-navigation-model.md) and reverses [Decide the Einsatzstatus transitions](0010-decide-the-einsatzstatus-transitions.md) on Bereitschaft, Anmarsch legs and Anmarsch → Rückmarsch.

## Login

- Einsatzzeit wählen offers `30`, `20` and `180 min`; 180 is Einsatzzeit #4 with [17] = 180, needs the `Langzeiteinsatz? OK` confirmation like 20, and follows the same rules (Rückzugsalarmmodus on, 33 % / 66 %, no Prozentmodus).
- Every pressure editor stops at **300 bar** ([77] = 0 %). The Anfangsdruck has no lower bound but 0 (assumption).
- With fewer than [07] Atemschutzträger, OK on `Trupp OK …` shows the box `Zu wenig Einsatzkräfte!` instead of a Daueralarm. No siren, no LED. It stays until a Tally joins (closing it) or OK or X (closing only the box; members kept). The logoff Daueralarm is unchanged.

This amends [Define the key-by-screen navigation model](0004-define-the-key-by-screen-navigation-model.md), [Decide when a Daueralarm starts and ends](0011-decide-when-a-daueralarm-starts-and-ends.md), [Fix the factory defaults the manual leaves open](0012-fix-the-factory-defaults-the-manual-leaves-open.md) and [Settle the edge cases the verification scenarios exposed](0014-settle-the-edge-cases-the-verification-scenarios-exposed.md) (point 3).

## Truppzuordnung

The paper has three columns, `Nr.`, `Ort` and `Auftrag`. Entries saved in the old one-field shape are wiped, not migrated ([Decide what survives a page reload](0007-decide-what-survives-a-page-reload.md)).

The normative rules are updated in the [timing and alarm rules](../research/timing-and-alarm-rules.md) and the [verification scenarios](../research/verification-scenarios.md).

Decided in [Check the simulator's assumptions against the real Checkbox](https://github.com/lharzenetter/checkbox-simulator/issues/48).

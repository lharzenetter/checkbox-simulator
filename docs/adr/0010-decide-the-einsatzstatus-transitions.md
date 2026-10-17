# Decide the Einsatzstatus transitions

Amended by [Correct the simulator against the real Checkbox](0018-correct-the-simulator-against-the-real-checkbox.md): `Trupp -> Einsatz` restores the earlier Einsatzstatus, there are no Anmarsch legs, Anmarsch → Rückmarsch is gone, and a Sicherheitstrupp may be deactivated when sent in.

These follow the real device's behaviour:

- **Bereitschaft is a safe area.** `Trupp -> Einsatz` never restores the earlier status: it leads to Anmarsch (Rückzugsalarmmodus on), or to Einsatzziel erreicht (mode off, not implemented).
- **Every entry into Anmarsch is a new Anmarsch leg.** `t_A` is measured again and the Rückzugsalarm is re-armed. This amends [Decide when one-shot and repeating alarms fire](0009-decide-when-one-shot-and-repeating-alarms-fire.md), which said once per Einsatz.
- Anmarsch → Rückmarsch (`Rückzug antreten`) is allowed. That leg has no `t_A`, so no Rückzugsalarm fires.
- `Trupp -> Bereitschaft` works from every running status. The Trupp-Menü always lists both `Trupp -> …` items, and choosing the current status does nothing.
- **Rückmarsch is final**: it is left only via Bereitschaft or logoff.
- **Logoff** works from every Einsatzstatus, but only once every Atemschutzträger's Tally has been held to Check. The Einsatzstatus at logoff is recorded in the Einsatzprotokoll.
- **Sicherheitstrupp** is a flag, not a status. A Sicherheitstrupp starts in Bereitschaft and keeps SICHER for the whole Einsatz.

The diagram and the normative rules 12.1–12.8, 4.6 and 5.15 are in [section 12 of the timing and alarm rules](../research/timing-and-alarm-rules.md#12-einsatzstatus-transitions).

Decided in [Decide the Einsatzstatus transitions](https://github.com/lharzenetter/checkbox-simulator/issues/13).

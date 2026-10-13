# Decide when one-shot and repeating alarms fire

The manual doesn't say how often each Alarm fires or what anchors its repeats, so this was decided:

- Each Alarmgrenze fires once per Einsatz, in every Einsatzstatus.
- The Rückzugsalarm is armed only from Einsatzziel erreicht, when `t_A` gets a value. It fires at most once per Anmarsch leg (as amended by [Decide the Einsatzstatus transitions](0010-decide-the-einsatzstatus-transitions.md)) and never in Rückmarsch. A raise via [73] does not re-arm it. Rückmarsch is the only Einsatzstatus that suppresses an Alarm.
- A pressure entry that takes Restzeit past a threshold (Rückzugsalarm or 00:00:00) fires that Alarm as soon as OK confirms the entry.
- The overdue repeats ([06]) are anchored to the Restzeit (−5:00, −10:00, …) and the Bereitschaft repeats ([05]) to the simulated time since entering Bereitschaft, restarting on each entry. Acknowledging never shifts either.
- In Bereitschaft only the Bereitschaft Alarm sounds. Every other Alarm pauses with `t_run` and the Restzeit.

The normative rules are 2.3, 3.3–3.5, 4.4, 4.7, 5.9, 5.13 and 5.14 in the [timing and alarm rules](../research/timing-and-alarm-rules.md).

Decided in [Decide when one-shot and repeating alarms fire](https://github.com/lharzenetter/checkbox-simulator/issues/12).

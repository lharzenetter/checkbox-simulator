# Decide how alarms are presented

The manual shows only the overrun ALARM screen (catalogue gap G5). The rest follows the real device where the user knows it.

1. **One screen.** Every Alarm except a Daueralarm (Alarmgrenzen, 00:00:00, overdue repeats, Rückzugsalarm, Bereitschaft) uses S12, `Trupp NN ALARM` / `Alarmende mit OK`, with **no cause text**. S12 is live: Restzeit, cylinder and pressure estimate keep updating. There is no SICHER alternation on S12.
2. **One signal.** A fast-wailing siren, synthesised with Web Audio for now and to be swapped for a recording of the real device later. The red LED blinks in step with it. An Alarm and a Daueralarm sound and look the same; only the screen in front differs.
3. **Duration.** An Alarm sounds until OK. A Daueralarm sounds until its cause is fixed or X is pressed ([Decide when a Daueralarm starts and ends](0011-decide-when-a-daueralarm-starts-and-ends.md)).
4. **Several Alarms.** Each Trupp has at most one pending Alarm: coincident Alarms, and later ones while it is still pending, merge into it. Across Trupps the pending Alarms form a FIFO queue in firing order, and each OK acknowledges one Trupp and shows the next. The signal runs while anything is pending or a Daueralarm is active. There is no queue indicator.
5. **Interruption.** S12 takes over from any screen. After the last OK, the interrupted screen comes back exactly as it was (a half-entered pressure, logoff marks), and a Daueralarm there keeps sounding. If nothing was interrupted, OK goes to the Einsatzliste with the Trupp selected.
6. **Keys on S12.** Only OK works. Up, Down, X and Tallys are ignored and not buffered, so a Notausschaltung (X + Check) needs the Alarm acknowledged first.
7. **Audio unlock and mute.** Audio unlocks on the first gesture (the first-launch dialog or "fortsetzen"), which always comes before any Alarm. A mute toggle in the simulator chrome (outside the device replica, next to the clock controls) is persisted with the device memory. While muted, a "Ton aus" indicator stays visible: the mute button's crossed-out speaker, highlighted amber. The LED and S12 work regardless.
8. **Clock.** Pause freezes everything: the siren goes silent, the LED holds and keys do nothing, and all of it resumes on play. The speed presets don't change the wail or blink rate.
9. **Reload.** The pending queue is part of the running session. "fortsetzen" restores S12 (and the screen it interrupted) paused, and the siren restarts on play. "verwerfen" drops the queue along with the Trupps.

Rule 8.2 of the [timing and alarm rules](../research/timing-and-alarm-rules.md#8-acknowledging-and-concurrency) and S12 in the [LCD screen catalogue](../research/lcd-screen-catalogue.md#s12-trupp-alarm) carry the same rules.

Decided in [Decide how alarms are presented](https://github.com/lharzenetter/checkbox-simulator/issues/8).

# Drop the simulation to real time while an Alarm sounds

Amended by [Correct the simulator against the real Checkbox](0018-correct-the-simulator-against-the-real-checkbox.md): point 2: the speed stays locked until the second OK.

At 5× or 10× the Restzeit races on while the Trainee reacts to an Alarm, which is nothing like the real device. So the speed drops to 1× when the signal starts. This changes the clock in [Design how the Trainee handles Tallys and the clock](0005-design-how-the-trainee-handles-tallys-and-the-clock.md).

1. **Any signal triggers it:** every Alarm and every Daueralarm, muted or not, from the moment the siren and LED would start ([Decide how alarms are presented](0013-decide-how-alarms-are-presented.md)). Including the Daueralarme costs nothing, and making the speed depend on the mute toggle would be odd.
2. **The speed is locked at 1× while the signal runs.** The speed presets and `→`/`←` do nothing; pause still works, and play resumes at 1×. We rejected dropping once and letting the Trainee speed up again at once, because the drop would then be only a suggestion.
3. **The speed stays at 1× afterwards.** Once the signal stops, the Trainee picks a speed again. We rejected restoring the speed from before the Alarm: time jumping back to 10× right after the last OK would surprise the Trainee, and a remembered speed is ambiguous when a Daueralarm follows an Alarm and is lost on a reload anyway.
4. **The clock controls say why.** The speed buttons are disabled with 1× pressed, and the status line "Echtzeit während Alarm" shows where "Simulation pausiert" would. This gives nothing away: the siren, LED and LCD already signal.
5. **The drop takes effect a frame or two late.** The clock learns of the signal only from the device state the firing tick produced, so it runs past the threshold by up to two frames at the old speed (≈330 ms simulated at 10×). This is accepted rather than rewinding the clock, which would need the world to know the device core's thresholds. The jump after a hidden browser tab is a separate matter.
6. **The device core knows nothing of it.** The world's clock applies the rule from whether the signal runs, so after a reload during an Alarm the session resumes paused at 1× and the lock applies again.

Decided in [Slow down Simulation whenever an Alarm sounds](https://github.com/lharzenetter/checkbox-simulator/issues/46).

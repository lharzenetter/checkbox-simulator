# Drop the simulation to real time while an Alarm sounds

Amended by [Correct the simulator against the real Checkbox](0018-correct-the-simulator-against-the-real-checkbox.md): point 2: the speed stays locked until the second OK.

Amended when the UI and the acceptance drivers came to share one simulator reducer: point 5: the drop now takes effect on the firing tick.

At 5× or 10× the Restzeit races on while the Trainee reacts to an Alarm, which is nothing like the real device. So the speed drops to 1× when the signal starts. This changes the clock in [Design how the Trainee handles Tallys and the clock](0005-design-how-the-trainee-handles-tallys-and-the-clock.md).

1. **Any signal triggers it:** every Alarm and every Daueralarm, muted or not, from the moment the siren and LED would start ([Decide how alarms are presented](0013-decide-how-alarms-are-presented.md)). Including the Daueralarme costs nothing, and making the speed depend on the mute toggle would be odd.
2. **The speed is locked at 1× while the signal runs.** The speed presets and `→`/`←` do nothing; pause still works, and play resumes at 1×. We rejected dropping once and letting the Trainee speed up again at once, because the drop would then be only a suggestion.
3. **The speed stays at 1× afterwards.** Once the signal stops, the Trainee picks a speed again. We rejected restoring the speed from before the Alarm: time jumping back to 10× right after the last OK would surprise the Trainee, and a remembered speed is ambiguous when a Daueralarm follows an Alarm and is lost on a reload anyway.
4. **The clock controls say why.** The speed buttons are disabled with 1× pressed, and the status line "Echtzeit während Alarm" shows where "Simulation pausiert" would. This gives nothing away: the siren, LED and LCD already signal.
5. **The drop takes effect on the firing tick.** The world's simulator reducer (`reduceSimulator`) reduces each device event and then lets the clock follow the signal from the state that event produced, so the clock is at 1× from the tick the signal starts. The world still needs no knowledge of the device core's thresholds. The tick that fires runs at the old speed, so the threshold may be passed by up to one tick. The jump after a hidden browser tab is a separate matter. This replaces the earlier acceptance of a drop a frame or two late (≈330 ms simulated at 10×), which came from the UI hook learning of the signal one render after the firing tick.
6. **The device core knows nothing of it.** The world's clock applies the rule from whether the signal runs, so after a reload during an Alarm the session resumes paused at 1× and the lock applies again.

Decided in [Slow down Simulation whenever an Alarm sounds](https://github.com/lharzenetter/checkbox-simulator/issues/46).

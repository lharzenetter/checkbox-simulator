# Decide what survives a page reload

The simulator keeps two stores in browser storage.

- **Device memory** mirrors the Checkbox's non-volatile memory and is kept until a factory reset. It holds the Funkrufnamen and Kurznamen, the first-launch-done flag, the persisted mute setting ([Decide how alarms are presented](0013-decide-how-alarms-are-presented.md)) and an **Einsatzprotokoll ring buffer of 100**, where the oldest is overwritten (manual p. 15, p. 32). An Einsatzprotokoll is written at every logoff and Notausschaltung (p. 31), even though no screen shows them yet.
- **The running session** is the device core's state (Trupps, Restzeiten, pending Alarms, current screen), saved continuously.

**On load with a saved session**, the Trainee is asked "fortsetzen / verwerfen?":

- **fortsetzen** restores the session **paused**. Time while the page was closed is **frozen**, never caught up or replayed, so the device's Uhrzeit falls behind the real clock after a resume.
- **verwerfen** drops the running Trupps silently. No Einsatzprotokoll is written for them, and device memory is kept.

**The device's Uhrzeit** is simulated time. It starts at the real time of day whenever a new session begins (first launch, "verwerfen", factory reset) and from then on runs on simulated time, so it runs faster at 2×–10× and stops while paused. Settled in the spec's read-through.

**Factory reset:** Einstellungen offers "Auf Werkszustand zurücksetzen" with a confirmation. It clears both stores, so the first-launch dialog comes back.

**Incompatible stored data** after an update is discarded in full (device memory and session) and never migrated. How incompatibility is detected, and whether the Trainee is told, is left to the implementation.

Decided in [Decide what survives a page reload](https://github.com/lharzenetter/checkbox-simulator/issues/9).

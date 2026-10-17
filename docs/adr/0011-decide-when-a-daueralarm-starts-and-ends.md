# Decide when a Daueralarm starts and ends

Amended by [Correct the simulator against the real Checkbox](0018-correct-the-simulator-against-the-real-checkbox.md): the login Daueralarm is replaced by the `Zu wenig Einsatzkräfte!` box.

Both Daueralarme start only when the operator tries to confirm, never on a timer.

- **Logoff Daueralarm:** starts on OK on ABMELDEN while any Atemschutzträger is unmarked. It ends as soon as everyone is marked (ABMELDEN then waits for OK), on X (marks cleared, the Trupp keeps running in its previous Einsatzstatus) or on a Notausschaltung. OK again with Atemschutzträger still missing restarts it.
- **Login Daueralarm:** starts on OK on `Trupp OK …` with fewer than [07] Atemschutzträger joined. It ends as soon as [07] have joined (the Anmeldefenster then waits for OK), or on X, which throws the whole login away. [12] plays no part.

OK never silences a Daueralarm. This replaces "OK does nothing" on those two screens in [Define the key-by-screen navigation model](0004-define-the-key-by-screen-navigation-model.md).

The normative rules are 7.3–7.6 in [section 7 of the timing and alarm rules](../research/timing-and-alarm-rules.md#7-daueralarm).

Decided in [Decide when a Daueralarm starts and ends](https://github.com/lharzenetter/checkbox-simulator/issues/14).

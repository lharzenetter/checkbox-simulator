# Decide the contents of the fixed Tally roster

The Roster holds **8 Tallys**: 2 vehicles × (Angriffstrupp + Wassertrupp) × (Truppführer + Truppmann). This matches the real setup of two Atemschutzträger per Trupp and two Trupps per vehicle. The row order is also the `1`–`8` shortcut order.

| #   | Vehicle   | Role                | LCD text (default) |
| --- | --------- | ------------------- | ------------------ |
| 1   | Vehicle 1 | Angriffstruppführer | `HLF AT-F`         |
| 2   | Vehicle 1 | Angriffstruppmann   | `HLF AT-M`         |
| 3   | Vehicle 1 | Wassertruppführer   | `HLF WT-F`         |
| 4   | Vehicle 1 | Wassertruppmann     | `HLF WT-M`         |
| 5   | Vehicle 2 | Angriffstruppführer | `LF AT-F`          |
| 6   | Vehicle 2 | Angriffstruppmann   | `LF AT-M`          |
| 7   | Vehicle 2 | Wassertruppführer   | `LF WT-F`          |
| 8   | Vehicle 2 | Wassertruppmann     | `LF WT-M`          |

- **No personal names.** A Tally identifies a role, not a person. The LCD shows `<Kurzname> <role code>`, with the role codes fixed as `AT-F`, `AT-M`, `WT-F` and `WT-M`. The world panel shows only the role code on each fob, under a vehicle header of the Kurzname with the Funkrufname beside it (left out when the two are equal). The role's full name, such as "Angriffstruppführer", is not shown.
- **Only the Funkrufnamen can be edited.** Each vehicle has a Funkrufname (free text, default `1/43` / `1/45`) and a Kurzname for the LCD (at most 10 characters, default `HLF` / `LF`). The longest LCD text is therefore 15 characters, which fits the ~21-column line. A one-click dialog prefilled with the defaults asks for them at first launch and is never shown again once confirmed. After that they can be changed in **Einstellungen**. They persist with the device memory ([Decide what survives a page reload](0007-decide-what-survives-a-page-reload.md)).
- **No refused-login edge cases.** Every Tally belongs to a valid Atemschutzträger ([Draw the simulator's scope](0002-draw-the-simulators-scope.md)).

Decided in [Decide the contents of the fixed Transponder roster](https://github.com/lharzenetter/checkbox-simulator/issues/7) (renamed here to the device's wording).

The Roster size and the Tally shortcuts were later changed by [Let the Trainee add and remove Fahrzeuge](0015-let-the-trainee-add-and-remove-fahrzeuge.md).

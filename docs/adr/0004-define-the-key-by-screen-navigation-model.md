# Define the key-by-screen navigation model

The manual shows most screens but only some of the key presses (catalogue gaps G1, G2, G4, G6, G7, G9–G11, G13). This ADR fixes what every key does on every screen of the Einsatz flow. It was decided with the user, who knows the real device, and walked through in a clickable throwaway prototype. Screen ids (S00–S15) refer to the [LCD screen catalogue](../research/lcd-screen-catalogue.md). Where this ADR differs from the catalogue's transition table, which records the manual's view, this ADR wins.

Amended since: by [Decide when a Daueralarm starts and ends](0011-decide-when-a-daueralarm-starts-and-ends.md) (OK on ABMELDEN and on the Anmeldefenster) and by [Decide how alarms are presented](0013-decide-how-alarms-are-presented.md) (the ALARM screen). The amendments are applied below.

## Flow

- **Aus (S00):** Check → Startdisplay. A Tally on Check starts a login directly.
- **Startdisplay (S01):** OK → SERVICE (S02), drawn as in the figure with every item inert; X there → S01. Up, Down and X do nothing. When the Abschaltzeit runs out → Aus.
- **Einsatzzeit wählen (S03):** reached by a Tally on Check. It lists only `Einsatzzeit  30 min?` and `Einsatzzeit  20 min?`, cursor on 30 (#2 and #4 are not shown).
  - OK on 30 → Anmeldefenster.
  - OK on 20 → the bottom line becomes `Langzeiteinsatz? OK`. A second OK → Anmeldefenster; X → back to the choice.
  - X on the choice → the login is discarded, back to the Startdisplay or the Einsatzliste.
  - Tallys on Check are **ignored** here: members join only once the Einsatzzeit is set.
- **Anmeldefenster (S04):** Tallys on Check add members (up to 6; anyone already in a Trupp is ignored).
  - `Trupp OK Einsatz`, `Trupp OK Bereitschaft` or `Sicherheitstrupp OK` + OK → **Anfangsdruckerfassung (S06)**, headed `Trupp Nr.: NN`. OK → Einsatzliste with the new Trupp selected; X → back to the Anmeldefenster, members kept (corrected by the user from the real device). With fewer than [07] members, OK starts the login Daueralarm instead.
  - **DRUCK-AUSWAHL (S05) is skipped**, because the cylinder type is fixed at 300 bar. There is no Attribute step.
  - `Druck ändern` → the pressure editor titled `Esz-Zeit ändern`; OK or X → back to S04.
  - X → the whole login is thrown away without asking (members discarded, Truppnummer freed).
- **Einsatzliste (S07):**
  - The right column is the **Restzeit**. A negative one is shown as `-0:00:10` (8 characters, hour digit dropped). The `B1 {BAT} {UHR} 10:03:00` line is the battery compartment in use, its level, the clock icon and the current Uhrzeit.
  - Up and Down move through occupied rows only, wrapping. OK → **Trupp-Ansicht**. X alone does nothing.
  - X + Check held ~4 s → Notausschaltung.
  - Once the last Trupp has logged off (or been ended), the empty Einsatzliste switches to Aus when the Abschaltzeit runs out (manual p. 34), on real time like every display timing. Settled in the spec's read-through.
- **Trupp-Ansicht (S11):** the graphic, read-only view; the `Ansicht` label marks it as such. OK → Trupp-Menü, X → Einsatzliste, Up and Down do nothing. The [13] timeout → Einsatzliste.
- **Trupp-Menü (S09):** X → Trupp-Ansicht; the [13] timeout → Einsatzliste. The header word and the items depend on the Einsatzstatus, and the list scrolls past 4 lines:

  | Einsatzstatus        | Header         | Items                                                                                                                   |
  | -------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
  | Anmarsch             | `ANMARSCH`     | Trupp -> Einsatz · Trupp -> Bereitschaft · Einsatzziel erreicht · Rückzug antreten · Druck ändern · Attribute eintragen |
  | Einsatzziel erreicht | `EINSATZ`      | Trupp -> Einsatz · Trupp -> Bereitschaft · Rückzug antreten · Druck ändern · Attribute eintragen                        |
  | Rückmarsch           | `RÜCKMARSCH`   | Trupp -> Einsatz · Trupp -> Bereitschaft · Druck ändern · Attribute eintragen                                           |
  | Bereitschaft         | `BEREITSCHAFT` | Trupp -> Einsatz · Trupp -> Bereitschaft · Druck ändern · Attribute eintragen                                           |

  `Attribute eintragen` is shown but does nothing, as on the real device. A Sicherheitstrupp's header follows its Einsatzstatus. `ALARM` and `ABMELDEN` are the headers of their own screens.

- **Pressure editor (S06/S08/S10):** Up and Down change the Flaschendruck in [76] steps.

  | Opened by                     | Title                        | OK →                          | X →                                |
  | ----------------------------- | ---------------------------- | ----------------------------- | ---------------------------------- |
  | Druck ändern (Anmeldefenster) | `Esz-Zeit ändern`            | Anmeldefenster                | Anmeldefenster, unchanged          |
  | Druck ändern (Trupp-Menü)     | `Esz-Zeit ändern` (verbatim) | Einsatzliste                  | Trupp-Menü, unchanged              |
  | Einsatzziel erreicht          | `Esz-Ziel erreicht`          | Einsatzliste, status changed  | Trupp-Menü, status **not** changed |
  | Rückzug antreten              | `Rückzug antreten`           | Trupp-Ansicht in `RÜCKMARSCH` | Trupp-Menü, status **not** changed |
  | Login                         | `Trupp Nr.: NN`              | Einsatzliste, Trupp created   | Anmeldefenster, members kept       |

- **ABMELDEN (S13):** opened by a member's Tally on Check. Further members of that Trupp mark themselves; anyone else is ignored. OK while any member is unmarked starts the logoff Daueralarm. Once all are marked it waits for OK (no auto-logoff) → Einsatzliste. X at any time → Einsatzliste, marks cleared, Trupp unchanged.
- **Notausschaltung (S14/S15):** inverse bar, cursor on `-> markierten Trupp NN`. `-> zurueck` → Einsatzliste. On the confirmation OK deletes, and any other key cancels → Einsatzliste.
- **Trupp ALARM (S12)** takes over from any screen; only OK works there ([Decide how alarms are presented](0013-decide-how-alarms-are-presented.md)).
- **Selection:** every screen with a choice has the inverse bar, with the cursor starting on the first item.

## Tally on Check

| Where                                                      | Whose                                   | Effect                                 |
| ---------------------------------------------------------- | --------------------------------------- | -------------------------------------- |
| Aus, Startdisplay, Einsatzliste, Trupp-Ansicht, Trupp-Menü | not in a Trupp                          | starts a login (next free Truppnummer) |
| same                                                       | member of a running Trupp               | ABMELDEN for that Trupp, member marked |
| anywhere                                                   | new Atemschutzträger while 6 Trupps run | ignored; logoffs still work            |
| Einsatzzeit wählen                                         | anyone                                  | ignored                                |
| Anmeldefenster                                             | already in this or another Trupp        | ignored                                |
| pressure editors, Notausschaltung, SERVICE, Trupp ALARM    | anyone                                  | ignored                                |

Decided in [Define the key-by-screen navigation model](https://github.com/lharzenetter/checkbox-simulator/issues/5).

# Reconcile the glossary with the LCD's on-screen wording

Where the LCD (or a parameter name) and the manual's prose use different words, the **device's wording is canonical**. That holds in the spec, the docs, code identifiers and the Trainee UI. So the tag is a **Tally** (LCD `TALLY`), not a Transponder. It is **Sicherheitstrupp**, not Sicherungstrupp, and the status is **Rückmarsch** (LCD `RÜCKMARSCH`), not Rückzug. The keys are **Up, Down, OK, X, Check**, not the manual's figure letters A–E. LCD text is quoted verbatim; parameter names and manual quotes are never reworded.

The reason is that the Trainee learns to read the device, so the words on the device have to be the words in the simulator. [`GLOSSARY.md`](../../GLOSSARY.md) holds the resulting terms and the _Avoid_ lists.

Closed tickets written before this decision keep the old words as history. Two ADR titles here are renamed to match: *Design how the Trainee handles Tallys and the clock* and *Decide the contents of the fixed Tally roster*. Their tickets still say "Transponder".

Decided in [Reconcile the glossary with the LCD's on-screen wording](https://github.com/lharzenetter/checkbox-simulator/issues/17).

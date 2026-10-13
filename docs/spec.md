# Checkbox 5+1 training simulator — spec

The hand-off spec for a web-based training simulator of the Checkbox 5+1 USB V04 (30936). It is the entry point for cutting implementation tickets.

This page links the parts together and does not restate them. Decisions live in [`docs/adr/`](adr/), research and exact rules in [`docs/research/`](research/), and terms in [`GLOSSARY.md`](../GLOSSARY.md). Where a research doc and an ADR disagree, the ADR wins. The source of truth for device behaviour is the manual, `30784_BA_Checkbox-5u1_30158_30160_30936_de_2017_04_21.pdf`, and the guiding principle is to **replicate the device, not the regulation** (FwDV 7).

Every part of this spec was settled on the wayfinding map [Checkbox 5+1 training simulator spec](https://github.com/lharzenetter/checkbox-simulator/issues/1).

## 1. Purpose and scope

An operator training tool. A single **Trainee** operates the Checkbox and also plays every Atemschutzträger. The front panel and LCD are a close replica of the manual's figures, and the UI is German only. The scope is core operation and every Alarm. There is no Workbench, and every parameter stays at its factory default.

- What is in and what is deliberately out (Workbench, Attribute, refused logins, Einsatzzeit #2/#4 and the Prozentmodus, the SERVICE menu, batteries, trainer modes): [Draw the simulator's scope](adr/0002-draw-the-simulators-scope.md)
- Wording rule (device wording is canonical: Tally, Sicherheitstrupp, Rückmarsch, keys Up/Down/OK/X/Check): [Reconcile the glossary with the LCD's on-screen wording](adr/0003-reconcile-the-glossary-with-the-lcds-on-screen-wording.md), terms in [`GLOSSARY.md`](../GLOSSARY.md)

## 2. Screens and key navigation

- **What each screen looks like:** [LCD screen catalogue](research/lcd-screen-catalogue.md). It covers the display (~128 × 128 px graphic LCD, ~21 columns), the Statussymbole F–M, SICHER, the Restzeit formats, and transcriptions plus cropped figures of S00–S15. S16–S22 are out of scope, and X1–X9 are described but not shown.
- **What every key does on every screen:** [Define the key-by-screen navigation model](adr/0004-define-the-key-by-screen-navigation-model.md). This covers the login chain, the Einsatzliste, Trupp-Ansicht and Trupp-Menü per Einsatzstatus, the pressure editors, ABMELDEN, the Notausschaltung, and where a Tally on Check is routed. The catalogue's transition table records the manual's view; the ADR overrides it.

## 3. Timing and alarm rules

- **The normative rules**, numbered and each tagged Manual / Figure / Decided: [timing and alarm rules](research/timing-and-alarm-rules.md). They cover Restzeit and pressure (§1), Alarmgrenzen (§2), overdue repeats (§3), Bereitschaft (§4), Rückzugsalarm (§5), Daueralarm (§7), concurrency (§8), defaults and clocks (§9) and Einsatzstatus transitions (§12).
- **The decisions behind the Decided rows:**
  - [Decide how Flaschendruck drives Restzeit and the Rückzugsalarm](adr/0008-decide-how-flaschendruck-drives-restzeit-and-the-rueckzugsalarm.md)
  - [Decide when one-shot and repeating alarms fire](adr/0009-decide-when-one-shot-and-repeating-alarms-fire.md)
  - [Decide the Einsatzstatus transitions](adr/0010-decide-the-einsatzstatus-transitions.md)
  - [Decide when a Daueralarm starts and ends](adr/0011-decide-when-a-daueralarm-starts-and-ends.md)
  - [Settle the edge cases the verification scenarios exposed](adr/0014-settle-the-edge-cases-the-verification-scenarios-exposed.md)

## 4. Alarm presentation

[Decide how alarms are presented](adr/0013-decide-how-alarms-are-presented.md): one live S12 screen for every Alarm except a Daueralarm, a siren with a blinking LED, one pending Alarm per Trupp with FIFO across Trupps, interruption and return, only OK on S12, audio unlock, mute, and behaviour under pause and reload.

## 5. Trainee interaction

- **Tallys, device keys and the clock** (tap a Tally by drag or click, keys `1`–`8`, physical keys only, X + Check really held, pause plus 1×/2×/5×/10×): [Design how the Trainee handles Tallys and the clock](adr/0005-design-how-the-trainee-handles-tallys-and-the-clock.md)
- **The Roster** (8 role Tallys, Funkrufname and Kurzname per vehicle, first-launch dialog, Einstellungen): [Decide the contents of the fixed Tally roster](adr/0006-decide-the-contents-of-the-fixed-tally-roster.md)

## 6. Persistence

[Decide what survives a page reload](adr/0007-decide-what-survives-a-page-reload.md): device memory (Funkrufnamen, mute, 100 Einsatzprotokolle) and the running session, "fortsetzen / verwerfen?", time frozen while closed, factory reset, and incompatible data wiped.

## 7. Factory defaults

[Fix the factory defaults the manual leaves open](adr/0012-fix-the-factory-defaults-the-manual-leaves-open.md). The full parameter table, including the display timings and which clock each one runs on, is [§9 of the timing and alarm rules](research/timing-and-alarm-rules.md#9-factory-defaults).

## 8. Tech stack and code

- **Stack and hosting** (static client-side app, run locally; TypeScript + Vite, a framework-free reducer core, React, a canvas 1-bit LCD; Vitest, Playwright): [Choose the simulator's tech stack and hosting](adr/0001-choose-the-simulators-tech-stack-and-hosting.md)
- **How code is written** (layers `core / world / lcd / audio / storage / ui`, the pure reducer with `tick { now, realNow }`, effects derived from state, test-first, lint rules): [`CODING_STANDARDS.md`](../CODING_STANDARDS.md). Code comments cite decisions by their ADR title, e.g. `// decided in "Decide when one-shot and repeating alarms fire"`.

## 9. Verification

[Verification scenarios](research/verification-scenarios.md): V1–V24 with exact vectors (1 bar = 6 s at 30 min) and a coverage matrix over every Decided rule. All run in `core/` except V23 (real vs simulated time), which runs in `world/`. Playwright adds a few smoke flows: power on, log in a Trupp, an Alarm, log off.

## 10. Consistency pass

Contradictions found while consolidating, and how each was handled:

- **Catalogue transition table vs the navigation model:** the table recorded the manual's inferred keys (OK on S07 → S09, X on S09 → S07, S11 editable, a Tally on S03 adds a member). It now carries a note pointing to the ADR and listing the differences. S11's keys are marked as decided.
- **Catalogue S12 triggers** listed the Daueralarm and the EZ#4 Prozentmodus. Now marked: a Daueralarm doesn't use S12, and EZ#4 is out of scope.
- **Timing rule 2.2** gave the manual's rounded 10 / 20 min as the simulator's example, which contradicts 2.6 (9:54 / 19:48). Reworded.
- **Timing notation `t_run`** said "wall-clock time". It is simulated time (§9.1). Fixed.
- **Timing §6 and A7** still read as an open assumption. Now marked out of scope.
- **The map's gist of the navigation decision** read "Anfangsdruck (300 bar fixed …)". It is the *cylinder type* (`P_N`) that is fixed; the Anfangsdruck is entered from 270 to 330 bar (§1.6). Fixed on the map.
- **Old wording in closed tickets** ("Transponder", keys A–E, "Rückzug" as a status, "Sicherungstrupp") is left as history. The ADRs use the device wording, so two ADR titles differ from their ticket titles (see [ADR 0003](adr/0003-reconcile-the-glossary-with-the-lcds-on-screen-wording.md)).
- **Superseded parts of the navigation decision** (OK doing nothing on ABMELDEN and the Anmeldefenster; the provisional Tally-on-ALARM row) are applied in the navigation ADR.

## 11. Settled in the read-through

Three small points no ticket had decided were settled with the user when this spec was read through:

1. **Empty Einsatzliste:** after the last logoff it switches to Aus once the Abschaltzeit runs out (manual p. 34). Recorded in [Define the key-by-screen navigation model](adr/0004-define-the-key-by-screen-navigation-model.md).
2. **LCD details the manual never draws** (G3, G15, G16, G17) are invented in the LCD work as `// ASSUMPTION:`. Recorded in the [catalogue's gaps](research/lcd-screen-catalogue.md#gaps-and-ambiguities).
3. **The device's Uhrzeit** starts at the real time of day when a new session begins and then runs on simulated time. Recorded in [Decide what survives a page reload](adr/0007-decide-what-survives-a-page-reload.md).

Nothing is left to decide before implementation tickets are cut.

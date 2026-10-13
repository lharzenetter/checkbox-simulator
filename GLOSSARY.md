# Glossary

Glossary of the ubiquitous language for this repository.
Terms here are canonical — use them exactly in code, charts, and docs.

Domain terms are German, as on the device and in its manual
(`30784_BA_Checkbox-5u1_…pdf`); the simulator's UI is German too.

## Device

**Checkbox**:
The simulated breathing-apparatus monitoring device, Checkbox 5+1 USB V04 (30936).
_Avoid_: box, Atemschutzüberwachung (when meaning the device), Masterbox

**Transponder**:
A passive tag carrying one Atemschutzträger's name; held to the E key to log on or off.
_Avoid_: Tally, tag, chip

**Transponder-/Check-Taste (E)**:
The key that powers the Checkbox on and on which Transponders are held. The other keys are A (up), B (down), C (OK) and D (Abbruch).
_Avoid_: check button, reader

## Monitoring

**Atemschutzträger**:
A person wearing breathing apparatus, identified by their Transponder.
_Avoid_: user, wearer, Person

**Trupp**:
A group of 2–6 Atemschutzträger monitored together as one entry in the Einsatzliste.
_Avoid_: team, squad, Einsatztrupp

**Sicherungstrupp**:
A Trupp registered as standby rescue team; it is shown alternating with the text SICHER.
_Avoid_: Sicherheitstrupp, rescue team

**Einsatzliste**:
The Checkbox's main display listing every logged-in Trupp with its Einsatzstatus and Restzeit.
_Avoid_: Liste der Einsätze, overview, dashboard

**Einsatzstatus**:
A Trupp's current phase: Bereitschaft, Anmarsch, Einsatzziel erreicht, or Rückzug.
_Avoid_: state, Status

**Bereitschaft**:
The Einsatzstatus in which a Trupp's Einsatzzeit is paused.
_Avoid_: standby, pause

**Einsatzzeit**:
The total time budget a Trupp is given at login, chosen from Einsatzzeit #1–#4 (defaults 30, 60, 20, 240 min).
_Avoid_: duration, timer, Regelzeit

**Restzeit**:
The Einsatzzeit a Trupp has left; shown counting negative once exceeded.
_Avoid_: remaining time, countdown

**Anmarschzeit**:
The running time from a Trupp's start until it reports Einsatzziel erreicht; doubled, it sizes the Rückzugsalarm.
_Avoid_: approach time, Hinweg

**Flaschendruck**:
The pressure of a Trupp's breathing-air cylinders, in bar.
_Avoid_: pressure, Druck

**Reservedruck**:
The Flaschendruck that must remain for a safe return; it feeds the Rückzugsalarm.
_Avoid_: reserve

**Rückzugsdruck**:
The Flaschendruck at which the Rückzugsalarm fires, shown on a Trupp's detail screen.
_Avoid_: retreat pressure, Umkehrdruck

## Alarms

**Alarm**:
An acoustic and LED signal from the Checkbox that the operator acknowledges with OK (C).
_Avoid_: alert, warning

**Alarmgrenze**:
A percentage of the Einsatzzeit at which an Alarm fires (defaults 33 % and 66 %, up to four).
_Avoid_: threshold, alarm level

**Rückzugsalarm**:
An Alarm fired when the Restzeit drops to twice the Anmarsch time plus the Reservedruck allowance.
_Avoid_: retreat alarm

**Daueralarm**:
A continuous Alarm that does not stop until its cause is fixed, e.g. a Trupp member missing at logoff.
_Avoid_: permanent alarm

**Notausschaltung**:
Forcibly ending monitoring of one or all Trupps (D + E held ~4 s) when a Transponder is lost or broken.
_Avoid_: emergency stop, Not-Aus

**Einsatzprotokoll**:
The stored record of one Trupp's monitored Einsatz, kept on the Checkbox after logoff.
_Avoid_: log, protocol, report

## Simulation

**Trainee**:
The single person using the simulator, who both operates the Checkbox and plays every Atemschutzträger.
_Avoid_: user, operator, player

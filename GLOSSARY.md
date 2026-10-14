# Glossary

Glossary of the ubiquitous language for this repository.
Terms here are canonical — use them exactly in code, charts, and docs.

Domain terms are German, as on the device and in its manual
(`30784_BA_Checkbox-5u1_…pdf`); the simulator's UI is German too.
Where the device's own wording differs from the manual's prose, the device's wording wins.
Text the LCD shows is quoted verbatim in backticks; parameter names and manual quotes are never reworded.

## Device

**Checkbox**:
The simulated breathing-apparatus monitoring device, Checkbox 5+1 USB V04 (30936).
_Avoid_: box, Atemschutzüberwachung (when meaning the device), Masterbox

**Tally**:
A passive tag carrying one Atemschutzträger's name; held to the Check key to log on or off. The LCD shows `TALLY`.
_Avoid_: Transponder, tag, chip

**Keys** (Up, Down, OK, X, Check):
The five keys of the Checkbox. Up and Down move the selection, OK confirms, X cancels or steps back, and Check powers the Checkbox on and is where Tallys are held.
_Avoid_: A, B, C, D, E (the manual's figure letters), Abbruchtaste, Transponder-Taste, reader

**Abschaltzeit**:
The idle time after which the Checkbox switches itself off.
_Avoid_: auto-off, timeout

**Feuerwehrname**:
The fire brigade's name the Checkbox shows atop the Startdisplay and the Einsatzliste, `FF-Musterstadt` from the factory; the Trainee sets it in the simulator.
_Avoid_: Wehrname, brigade name, Organisationsname

## Screens

**Startdisplay**:
The screen shown after power-on, before any Trupp is logged in.
_Avoid_: start screen, home

**Anmeldefenster**:
The screen on which a new Trupp's Atemschutzträger hold their Tallys to join it before it is confirmed.
_Avoid_: Anmeldedisplay, login screen

**Einsatzliste**:
The Checkbox's main display listing every logged-in Trupp with its Einsatzstatus and Restzeit.
_Avoid_: Liste der Einsätze, overview, dashboard

**Trupp-Ansicht**:
The graphic screen of one Trupp, showing its times, Flaschendruck and Rückzugsdruck.
_Avoid_: Detailansicht, detail screen

**Trupp-Menü**:
The menu of one Trupp, offering the Einsatzstatus changes and actions open to it.
_Avoid_: Detailansicht, context menu

**Statussymbol**:
The glyph in the Einsatzliste showing a Trupp's Einsatzstatus and how many Atemschutzträger it has.
_Avoid_: icon, Statusglyphe

## Monitoring

**Atemschutzträger**:
A person wearing breathing apparatus, identified by their Tally.
_Avoid_: Truppmitglied, user, wearer, Person

**Trupp**:
A group of 2–6 Atemschutzträger monitored together as one entry in the Einsatzliste.
_Avoid_: team, squad, Einsatztrupp

**Truppnummer**:
The two-digit number (01–06) the Checkbox gives a Trupp at login; the LCD shows `Trupp Nr.`.
_Avoid_: Trupp-ID, slot

**Angriffstrupp** / **Wassertrupp**:
The two Trupp roles of a vehicle's crew; in the simulator's roster each vehicle has one of each.
_Avoid_: attack team, water team

**Truppführer** / **Truppmann**:
The two positions within a Trupp of two: the leader and the second member.
_Avoid_: leader, member

**Funkrufname**:
A vehicle's radio call sign, e.g. "Florian Musterstadt 1/46-1"; the Trainee sets one per vehicle, together with the Kurzname the LCD shows for it.
_Avoid_: call sign, Fahrzeugname

**Kurzname**:
A vehicle's short name of at most 10 characters, e.g. "HLF"; with a role code it forms the name the LCD shows for a Tally, e.g. `HLF AT-F`.
_Avoid_: short name, Fahrzeugkürzel

**Sicherheitstrupp**:
A Trupp registered as standby rescue team; a flag alongside its Einsatzstatus, not a status of its own. It starts in Bereitschaft and is shown alternating with the text `SICHER`.
_Avoid_: Sicherungstrupp, rescue team

**Einsatzstatus**:
A Trupp's current phase: Bereitschaft, Anmarsch, Einsatzziel erreicht, or Rückmarsch. The LCD abbreviates Einsatzziel erreicht as `Esz-Ziel erreicht`.
_Avoid_: state, Status

**Bereitschaft**:
The Einsatzstatus of a Trupp waiting in a safe area, with its Einsatzzeit paused; with the Rückzugsalarmmodus on, leaving it starts a new Anmarsch.
_Avoid_: standby, pause

**Anmarsch**:
The Einsatzstatus of a Trupp on its way to the Einsatzziel; the LCD shows `ANMARSCH`.
_Avoid_: Im Anmarsch, approach, Hinweg

**Rückmarsch**:
The Einsatzstatus of a Trupp on its way back out, entered with the menu item `Rückzug antreten`; the LCD shows `RÜCKMARSCH`.
_Avoid_: Rückzug (as a status name), retreat

**Einsatzzeit**:
The total time budget a Trupp is given at login, chosen from Einsatzzeit #1–#4 (defaults 30, 60, 20, 240 min).
_Avoid_: duration, timer, Regelzeit

**Restzeit**:
The Einsatzzeit a Trupp has left; shown counting negative once exceeded.
_Avoid_: remaining time, countdown

**Anmarschzeit**:
The running time from the start of a Trupp's Anmarsch until it reports Einsatzziel erreicht; doubled, it sizes the Rückzugsalarm.
_Avoid_: approach time, Hinweg

**Rückmarschzeit**:
The time a Trupp's Rückmarsch is budgeted: twice its Anmarschzeit plus the Reservedruck converted to time; the Rückzugsalarm fires when the Restzeit falls to it.
_Avoid_: return time, Rückweg

**Flaschendruck**:
The pressure of a Trupp's breathing-air cylinders, in bar.
_Avoid_: pressure, Druck

**Anfangsdruck** / **Enddruck**:
The Flaschendruck entered when a Trupp logs in, and when it logs off.
_Avoid_: Anfangsdruckerfassung, Enddruckerfassung, start pressure

**Reservedruck**:
The Flaschendruck that must remain for a safe return; it feeds the Rückzugsalarm.
_Avoid_: reserve

**Rückzugsdruck**:
The Flaschendruck at which the Rückzugsalarm fires, shown on the Trupp-Ansicht.
_Avoid_: retreat pressure, Umkehrdruck

## Alarms

**Alarm**:
An acoustic and LED signal from the Checkbox that the operator acknowledges with OK.
_Avoid_: alert, warning

**Alarmgrenze**:
A percentage of the Einsatzzeit at which an Alarm fires (defaults 33 % and 66 %, up to four).
_Avoid_: Alarmstufe, threshold, alarm level

**Rückzugsalarm**:
An Alarm fired when the Restzeit drops to twice the Anmarsch time plus the Reservedruck allowance.
_Avoid_: retreat alarm

**Rückzugsalarmmodus**:
A switch per Einsatzzeit; when it is off, a Trupp has no Anmarsch or Rückzugsalarm and goes straight to Einsatzziel erreicht.
_Avoid_: retreat mode

**Daueralarm**:
A continuous Alarm that does not stop until its cause is fixed, e.g. an Atemschutzträger missing at logoff.
_Avoid_: permanent alarm

**Notausschaltung**:
Forcibly ending monitoring of one or all Trupps (X + Check held ~4 s) when a Tally is lost or broken.
_Avoid_: emergency stop, Not-Aus

**Einsatzprotokoll**:
The stored record of one Trupp's monitored Einsatz, kept on the Checkbox after logoff.
_Avoid_: log, protocol, report

## Simulation

**Trainee**:
The single person using the simulator, who both operates the Checkbox and plays every Atemschutzträger.
_Avoid_: user, operator, player

**Roster**:
The fixed set of eight virtual Tallys: two vehicles × (Angriffstrupp + Wassertrupp) × (Truppführer + Truppmann).
_Avoid_: Personalliste, crew list

# Draw the simulator's scope

The simulator is an operator training tool for the Checkbox 5+1 USB V04 (30936). A single Trainee operates the Checkbox and also plays every Atemschutzträger. It replicates the device closely (front panel and LCD as in the manual's figures) and its UI is German only. The scope is core operation plus every Alarm.

Deliberately **left out**, so nobody adds them back by accident:

- **The Checkbox 5+1 Workbench** (manual ch. 6) and everything that depends on it: parameter editing, Tally programming, personnel data, reports, firmware, the REMOTE screen and **Attribute** (`Attribute eintragen` is shown but does nothing). Every parameter is fixed at its factory default ([Fix the factory defaults the manual leaves open](0012-fix-the-factory-defaults-the-manual-leaves-open.md)).
- **Refused logins** (G26 expired or not an Atemschutzträger, parameter [55], screen X8). Every Tally in the Roster logs in.
- **Einsatzzeit #2 (60 min) and #4 (240 min)**, and with them the Prozentmodus ([45]–[48]). Only #1 (30 min) and #3 (20 min) are simulated, for a normal Pressluftatmer.
- **Behaviour the fixed defaults make unreachable:** Rückzugsalarmmodus off and [73] = 0. The rules stay recorded in the [timing and alarm rules](../research/timing-and-alarm-rules.md) (§9.3) for a later Workbench or trainer mode.
- **The SERVICE menu.** The Startdisplay's OK opens S02 as drawn, but every item is inert. Gaps G8 and G12 stay open for a later effort.
- **Batteries and power:** the battery compartments, the low-battery Alarms (X1, X9), failover and the power-off after batteries run out. The battery line on the LCD is drawn as a static display.
- **Pre-V04 variants** (Seriell 30158, USB 30160) and **non-German UI**.
- **Trainer and scripted-scenario modes**, and the **Einsatzstelle world model** (zones, a Flaschendruck per Atemschutzträger, radio reports). The Trainee makes up the radio reports. The device/world seam is kept open for these.

Decided while charting the wayfinding map [Checkbox 5+1 training simulator spec](https://github.com/lharzenetter/checkbox-simulator/issues/1), and in [Decide what the Prozentmodus does for Einsatzzeit #4](https://github.com/lharzenetter/checkbox-simulator/issues/15), [Specify the service menu screens and keys](https://github.com/lharzenetter/checkbox-simulator/issues/20) and [Settle the edge cases the verification scenarios exposed](https://github.com/lharzenetter/checkbox-simulator/issues/22).

// The Abschaltzeit has no parameter number in the manual; the value is the Startdisplay figure's
// countdown. Decided in "Fix the factory defaults the manual leaves open".
export const ABSCHALTZEIT_MS = 25_000;

// The SICHER alternation has no parameter number either: 1 s `SICHER`, 1 s Statussymbol.
// Decided in "Fix the factory defaults the manual leaves open".
export const SICHER_PHASE_MS = 1_000;

// ASSUMPTION: the siren's wail and the LED have no parameter number or measured rate; a fast
// wail, 250 ms rising with the LED lit and 250 ms falling with it dark, is what "Decide how
// alarms are presented" (point 2) asks for until the real device is recorded.
export const ALARM_BLINK_PHASE_MS = 250;

// The Einsatzprotokoll memory has no parameter number either: manual p. 15, p. 32.
export const EINSATZPROTOKOLL_CAPACITY = 100;

// manual 9.1; defaults from timing-and-alarm-rules §9.
export const P01_EINSATZZEIT_1_MS = 30 * 60_000;
export const P07_MINIMALE_ANZAHL_DER_TRUPPMITGLIEDER = 2;
export const P08_MAXIMALE_ANZAHL_DER_TRUPPMITGLIEDER = 6;
export const P10_EINSATZZEIT_3_MS = 20 * 60_000;

// Alarmgrenzen #1 and #2 of Einsatzzeit #1 ([03], [04]) and #3 ([61], [62]); #3 and #4 of each
// default to 0 (off), timing-and-alarm-rules §9.
export const P03_ALARMGRENZE_1_EINSATZZEIT_1_PROZENT = 33;
export const P04_ALARMGRENZE_2_EINSATZZEIT_1_PROZENT = 66;
export const P61_ALARMGRENZE_1_EINSATZZEIT_3_PROZENT = 33;
export const P62_ALARMGRENZE_2_EINSATZZEIT_3_PROZENT = 66;
export const P13_TRUPP_DETAILANSICHT_MS = 15_000;
export const P42_RESERVEDRUCK_BAR = 50;
export const P73_DRUCK_VERGROESSERBAR_BAR = 5;

// [14] fixes the Atemschutzflaschentyp to Flaschentyp 2, so every cylinder's Nenndruck is [81].
export const P81_FLASCHENTYP_2_BAR = 300;
export const P76_DRUCK_SPRUNGGROESSE_BAR = 5;
export const P77_MAX_UEBER_SOLL_PROZENT = 10;
export const P78_MIN_UNTER_SOLL_PROZENT = 10;
export const P72_ANZAHL_DER_MAXIMALEN_TRUPPS = 6;

// The Abschaltzeit has no parameter number in the manual; the value is the Startdisplay figure's
// countdown. Decided in "Fix the factory defaults the manual leaves open".
export const ABSCHALTZEIT_MS = 25_000;

// manual 9.1; defaults from timing-and-alarm-rules §9.
export const P01_EINSATZZEIT_1_MS = 30 * 60_000;
export const P07_MINIMALE_ANZAHL_DER_TRUPPMITGLIEDER = 2;
export const P08_MAXIMALE_ANZAHL_DER_TRUPPMITGLIEDER = 6;

// [14] fixes the Atemschutzflaschentyp to Flaschentyp 2, so every cylinder's Nenndruck is [81].
export const P81_FLASCHENTYP_2_BAR = 300;
export const P76_DRUCK_SPRUNGGROESSE_BAR = 5;
export const P77_MAX_UEBER_SOLL_PROZENT = 10;
export const P78_MIN_UNTER_SOLL_PROZENT = 10;
export const P72_ANZAHL_DER_MAXIMALEN_TRUPPS = 6;

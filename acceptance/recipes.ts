import type { TallyName, Window } from "./window";

/** Wakes the Checkbox from Aus to the Startdisplay with Check; manual 5.2. */
export async function powerOn({ trainee }: Window): Promise<void> {
  await trainee.press("Check");
}

/**
 * Logs a Trupp of these Tallys in to Anmarsch for 30 min at the cylinder's 300 bar, ending on its
 * Trupp-Ansicht: the first Tally opens Einsatzzeit wählen, OK takes 30 min, the others join on the
 * Anmeldefenster, OK on `Trupp OK Einsatz` and OK on the Anfangsdruck. Manual 5.3.
 */
export async function logIn(
  { trainee }: Window,
  [first, ...others]: readonly [TallyName, ...TallyName[]],
): Promise<void> {
  await trainee.holdTally(first);
  await trainee.press("OK");
  for (const tally of others) {
    await trainee.holdTally(tally);
  }
  await trainee.press("OK");
  await trainee.press("OK");
}

/**
 * Logs a Trupp off: each of its Atemschutzträger holds their Tally to Check, which marks them on
 * ABMELDEN, and OK logs the Trupp off. Pass every Atemschutzträger of the Trupp; with one missing,
 * OK leaves the Trupp on ABMELDEN. Manual 5.8.
 */
export async function logOff(
  { trainee }: Window,
  atemschutztraeger: readonly [TallyName, ...TallyName[]],
): Promise<void> {
  for (const tally of atemschutztraeger) {
    await trainee.holdTally(tally);
  }
  await trainee.press("OK");
}

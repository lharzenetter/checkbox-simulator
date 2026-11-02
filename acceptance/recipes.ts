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

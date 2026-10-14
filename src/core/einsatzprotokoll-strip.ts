import { EINSATZPROTOKOLL_SCREEN_LINES } from "./parameters";
import type { Einsatzprotokoll, State } from "./state";

/** One line of an Einsatzprotokoll on S16, top to bottom as in the manual's figure. */
export type EinsatzprotokollLine =
  | { readonly kind: "title" }
  | { readonly kind: "rule" }
  | { readonly kind: "einsatznummer"; readonly einsatznummer: number }
  | { readonly kind: "datum"; readonly loggedInAtMs: number }
  | {
      readonly kind: "truppnummerEinsatzzeit";
      readonly truppnummer: number;
      readonly einsatzzeitMs: number;
    }
  | { readonly kind: "einsatzkraefte" }
  | { readonly kind: "atemschutztraeger"; readonly name: string }
  | { readonly kind: "einsatzVon"; readonly loggedInAtMs: number }
  | { readonly kind: "bis"; readonly loggedOffAtMs: number }
  | { readonly kind: "davonAktiv"; readonly davonAktivMs: number }
  | { readonly kind: "notausschaltung" }
  | { readonly kind: "protokollEnde" };

/** The lines of the Einsatzprotokoll strip in view on S16; none while the memory is empty. */
export function einsatzprotokollWindow(
  state: State,
): readonly EinsatzprotokollLine[] {
  return strip(state).slice(
    state.einsatzprotokollFirstLine,
    state.einsatzprotokollFirstLine + EINSATZPROTOKOLL_SCREEN_LINES,
  );
}

// The oldest `Protokoll Ende` on the bottom line is as far as the strip scrolls.
export function lastEinsatzprotokollFirstLine(state: State): number {
  return Math.max(0, strip(state).length - EINSATZPROTOKOLL_SCREEN_LINES);
}

// ASSUMPTION: one continuous strip, newest first ("Show the Einsatzprotokolle on the LCD").
function strip(state: State): readonly EinsatzprotokollLine[] {
  return [...state.einsatzprotokolle].reverse().flatMap(linesOf);
}

const NOTAUSSCHALTUNG_LINE: EinsatzprotokollLine = { kind: "notausschaltung" };

// manual 5.10, S16 figure.
// ASSUMPTION: the `Notausschaltung` line ("Show the Einsatzprotokolle on the LCD").
function linesOf(
  einsatzprotokoll: Einsatzprotokoll,
): readonly EinsatzprotokollLine[] {
  return [
    { kind: "title" },
    { kind: "rule" },
    { kind: "einsatznummer", einsatznummer: einsatzprotokoll.einsatznummer },
    { kind: "datum", loggedInAtMs: einsatzprotokoll.loggedInAtMs },
    {
      kind: "truppnummerEinsatzzeit",
      truppnummer: einsatzprotokoll.truppnummer,
      einsatzzeitMs: einsatzprotokoll.einsatzzeitMs,
    },
    { kind: "rule" },
    { kind: "einsatzkraefte" },
    ...einsatzprotokoll.atemschutztraeger.map(
      ({ name }): EinsatzprotokollLine => ({ kind: "atemschutztraeger", name }),
    ),
    { kind: "rule" },
    { kind: "einsatzVon", loggedInAtMs: einsatzprotokoll.loggedInAtMs },
    { kind: "bis", loggedOffAtMs: einsatzprotokoll.loggedOffAtMs },
    { kind: "davonAktiv", davonAktivMs: einsatzprotokoll.davonAktivMs },
    { kind: "rule" },
    ...(einsatzprotokoll.notausschaltung ? [NOTAUSSCHALTUNG_LINE] : []),
    { kind: "protokollEnde" },
  ];
}

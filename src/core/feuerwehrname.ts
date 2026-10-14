/** The Feuerwehrname as the Checkbox leaves the factory (manual 5.2, Startdisplay figure). */
export const FACTORY_FEUERWEHRNAME = "FF-Musterstadt";

// ASSUMPTION: the Feuerwehrname may fill one LCD line of 21 characters and use only the
// characters the LCD font draws, as the Kurzname does; decided when making it configurable.
/** The longest Feuerwehrname: one full LCD line. */
export const FEUERWEHRNAME_MAX_LENGTH = 21;

const FEUERWEHRNAME_PATTERN = /^[\x20-\x7EÄÖÜäöüß]+$/;

/**
 * Whether a Feuerwehrname can be kept: not blank, at most {@link FEUERWEHRNAME_MAX_LENGTH}
 * characters, and drawable by the LCD.
 */
export function isValidFeuerwehrname(feuerwehrname: string): boolean {
  return (
    feuerwehrname.trim() !== "" &&
    feuerwehrname.length <= FEUERWEHRNAME_MAX_LENGTH &&
    FEUERWEHRNAME_PATTERN.test(feuerwehrname)
  );
}

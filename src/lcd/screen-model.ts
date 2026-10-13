import { abschaltzeitRestMs, assertNever } from "../core/index";
import type { State } from "../core/index";

/** What the LCD shows, per screen layout, with every value already formatted for display. */
export type ScreenModel =
  | { readonly layout: "aus" }
  | {
      readonly layout: "startdisplay";
      readonly feuerwehrname: string;
      readonly versionszeile: string;
      readonly batteriefach: string;
      readonly batteriekapazitaet: string;
      /** The battery gauge's fill, 0–1. */
      readonly batteriefuellstand: number;
      readonly datumUhrzeit: string;
      readonly hinweis: readonly string[];
      readonly abschaltzeitzeile: string;
    }
  | {
      readonly layout: "service";
      readonly title: string;
      readonly items: readonly string[];
      readonly selectedIndex: number;
    };

// The Startdisplay figure's values (manual 5.2). The SERVICE menu that would edit the name is
// inert, and the battery line is static, as decided in "Draw the simulator's scope".
const FEUERWEHRNAME = "FF-Musterstadt";
const FIRMWARE = "V04.02.23";
const SERIENNUMMER = "#12345";
const BATTERIEFACH = "B1";
const BATTERIEKAPAZITAET_PROZENT = 88;

// Only the four items the figure draws; the rest stay open with gap G8, as decided in
// "Draw the simulator's scope".
const SERVICE_ITEMS = [
  "Einsatzprotokoll",
  "Zeit/Datum einstellen",
  "Kontrast",
  "Testprogramm",
] as const;

/** Derives what the LCD shows from the device state. */
export function screenModel(state: State): ScreenModel {
  switch (state.screen) {
    case "aus":
      return { layout: "aus" };
    case "startdisplay":
      return {
        layout: "startdisplay",
        feuerwehrname: FEUERWEHRNAME,
        versionszeile: `${FIRMWARE}  ${SERIENNUMMER}`,
        batteriefach: `${BATTERIEFACH}-`,
        batteriekapazitaet: `+ ${String(BATTERIEKAPAZITAET_PROZENT)}%`,
        batteriefuellstand: BATTERIEKAPAZITAET_PROZENT / 100,
        datumUhrzeit: `${formatDatum(state.now)}     ${formatUhrzeit(state.now)}`,
        hinweis: ["OK für SERVICE", "oder TALLY auflegen"],
        abschaltzeitzeile: `sonst Ende in  > ${formatAbschaltzeit(abschaltzeitRestMs(state) ?? 0)}`,
      };
    case "service":
      return {
        layout: "service",
        title: "SERVICE",
        items: SERVICE_ITEMS,
        selectedIndex: 0,
      };
    default:
      return assertNever(state.screen);
  }
}

/** The screen's text lines top to bottom, without graphics; for assistive technology. */
export function screenText(model: ScreenModel): readonly string[] {
  switch (model.layout) {
    case "aus":
      return [];
    case "startdisplay":
      return [
        model.feuerwehrname,
        model.versionszeile,
        `${model.batteriefach} ${model.batteriekapazitaet}`,
        model.datumUhrzeit,
        ...model.hinweis,
        model.abschaltzeitzeile,
      ];
    case "service":
      return [model.title, ...model.items];
    default:
      return assertNever(model);
  }
}

// The Uhrzeit is local wall-clock time stored as if it were UTC (see `Clocks` in core), so the
// UTC getters read the local date and time without a time zone.
function formatDatum(uhrzeitMs: number): string {
  const date = new Date(uhrzeitMs);
  return [
    date.getUTCDate(),
    date.getUTCMonth() + 1,
    date.getUTCFullYear() % 100,
  ]
    .map(twoDigits)
    .join(".");
}

function formatUhrzeit(uhrzeitMs: number): string {
  const date = new Date(uhrzeitMs);
  return [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()]
    .map(twoDigits)
    .join(":");
}

// ASSUMPTION: whole seconds rounded up and right-aligned, so the figure's "25" shows for the
// first second; the manual draws only that one value (LCD screen catalogue, S01).
function formatAbschaltzeit(restMs: number): string {
  return String(Math.ceil(restMs / 1000)).padStart(3);
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

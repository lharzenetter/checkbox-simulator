import {
  abschaltzeitRestMs,
  ANMELDEAKTIONEN,
  assertNever,
  computeRestzeitMs,
  EINSATZZEITEN_MS,
  isSicherShown,
  P81_FLASCHENTYP_2_BAR,
} from "../core/index";
import type {
  Anmeldeaktion,
  Login,
  Atemschutztraeger,
  Einsatzstatus,
  State,
  Trupp,
} from "../core/index";

/** A Trupp's Statussymbol: its Einsatzstatus and how many Atemschutzträger it has. */
export interface Statussymbol {
  readonly einsatzstatus: Einsatzstatus;
  readonly count: number;
}

/** One occupied row of the Einsatzliste. */
export interface EinsatzlisteRow {
  readonly truppnummer: string;
  readonly selected: boolean;
  /** The Sicherheitstrupp's `SICHER` phase, shown instead of the Statussymbol. */
  readonly sicher: boolean;
  readonly statussymbol: Statussymbol;
  readonly restzeit: string;
}

/** An Atemschutzträger's line on ABMELDEN. */
export interface AbmeldenZeile {
  readonly name: string;
  /** Has held their Tally to Check; drawn inverse. */
  readonly markiert: boolean;
}

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
    }
  | {
      readonly layout: "einsatzzeitWaehlen";
      readonly title: string;
      readonly prompt: readonly string[];
      readonly atemschutztraeger: readonly string[];
      readonly items: readonly string[];
      readonly selectedIndex: number;
    }
  | {
      readonly layout: "anmeldefenster";
      readonly title: string;
      readonly atemschutztraeger: readonly string[];
      readonly items: readonly string[];
      readonly selectedIndex: number;
    }
  | {
      readonly layout: "flaschendruckEditor";
      readonly title: string;
      /** `null` on `Esz-Zeit ändern`, which shows no Truppnummer. */
      readonly truppnummer: string | null;
      readonly cylinder: string;
      readonly flaschendruck: string;
      readonly restzeit: string;
      /** The cylinder graphic's fill, 0–1. */
      readonly fillLevel: number;
    }
  | {
      readonly layout: "einsatzliste";
      readonly feuerwehrname: string;
      readonly batteriefach: string;
      readonly batterySign: string;
      /** The battery gauge's fill, 0–1. */
      readonly batteriefuellstand: number;
      readonly uhrzeit: string;
      /** The six rows, `null` where no Trupp has that Truppnummer. */
      readonly rows: readonly (EinsatzlisteRow | null)[];
    }
  | {
      readonly layout: "abmelden";
      readonly title: string;
      readonly atemschutztraeger: readonly AbmeldenZeile[];
      readonly hinweis: readonly string[];
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

// manual 5.3 step 5; the line's wording is decided in "Define the key-by-screen navigation model"
const LANGZEITEINSATZ_ITEM = "Langzeiteinsatz? OK";

const ANMELDEFENSTER_ITEMS: Readonly<Record<Anmeldeaktion, string>> = {
  truppOkEinsatz: "Trupp OK Einsatz",
  truppOkBereitschaft: "Trupp OK Bereitschaft",
  sicherheitstruppOk: "Sicherheitstrupp OK",
  flaschendruckAendern: "Druck ändern",
};

// manual 9.1 [72]
const EINSATZLISTE_ROWS = 6;

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
    case "einsatzzeitWaehlen":
      return einsatzzeitWaehlenModel(requireLogin(state));
    case "anmeldefenster":
      return anmeldefensterModel(requireLogin(state));
    case "anfangsdruckEditor":
      return anfangsdruckEditorModel(requireLogin(state));
    case "flaschendruckAendern":
      return flaschendruckAendernModel(requireLogin(state));
    case "einsatzliste":
      return einsatzlisteModel(state);
    case "abmelden":
      return abmeldenModel(state);
    default:
      return assertNever(state.screen);
  }
}

function einsatzzeitWaehlenModel(login: Login): ScreenModel {
  const items = EINSATZZEITEN_MS.map((einsatzzeitMs) =>
    login.awaitingLangzeiteinsatzOk && einsatzzeitMs === login.einsatzzeitMs
      ? LANGZEITEINSATZ_ITEM
      : `Einsatzzeit  ${formatMinutes(einsatzzeitMs)} min?`,
  );
  return {
    layout: "einsatzzeitWaehlen",
    title: "Neuen Trupp anmelden:",
    prompt: [
      "Wähle Einsatzzeit für",
      `Trupp Nr.: ${formatTruppnummer(login.truppnummer)}`,
    ],
    atemschutztraeger: login.atemschutztraeger.map(formatName),
    items,
    selectedIndex: EINSATZZEITEN_MS.indexOf(login.einsatzzeitMs),
  };
}

function anmeldefensterModel(login: Login): ScreenModel {
  return {
    layout: "anmeldefenster",
    title: `Trupp ${formatTruppnummer(login.truppnummer)}   ${formatMinutes(login.einsatzzeitMs)} min`,
    atemschutztraeger: login.atemschutztraeger.map(formatName),
    items: ANMELDEAKTIONEN.map((aktion) => ANMELDEFENSTER_ITEMS[aktion]),
    selectedIndex: ANMELDEAKTIONEN.indexOf(login.anmeldeaktion),
  };
}

function anfangsdruckEditorModel(login: Login): ScreenModel {
  return flaschendruckEditorModel(login, "Trupp Nr.:", login.anfangsdruckBar);
}

// The Druck ändern figure: the S06 layout titled `Esz-Zeit ändern`, without a Truppnummer
// (manual 5.3.2; LCD screen catalogue, gap G11).
function flaschendruckAendernModel(login: Login): ScreenModel {
  if (login.draftFlaschendruckBar === null) {
    throw new Error("Esz-Zeit ändern has no Flaschendruck to edit");
  }
  return {
    ...flaschendruckEditorModel(
      login,
      "Esz-Zeit ändern",
      login.draftFlaschendruckBar,
    ),
    truppnummer: null,
  };
}

function flaschendruckEditorModel(
  login: Login,
  title: string,
  flaschendruckBar: number,
): Extract<ScreenModel, { layout: "flaschendruckEditor" }> {
  return {
    layout: "flaschendruckEditor",
    title,
    truppnummer: formatTruppnummer(login.truppnummer),
    cylinder: formatBar(P81_FLASCHENTYP_2_BAR),
    flaschendruck: formatBar(flaschendruckBar),
    restzeit: formatRestzeit(
      computeRestzeitMs(login.einsatzzeitMs, flaschendruckBar),
    ),
    fillLevel: Math.min(1, flaschendruckBar / P81_FLASCHENTYP_2_BAR),
  };
}

function einsatzlisteModel(state: State): ScreenModel {
  return {
    layout: "einsatzliste",
    feuerwehrname: FEUERWEHRNAME,
    batteriefach: `${BATTERIEFACH}-`,
    batterySign: "+",
    batteriefuellstand: BATTERIEKAPAZITAET_PROZENT / 100,
    uhrzeit: formatUhrzeit(state.now),
    rows: Array.from({ length: EINSATZLISTE_ROWS }, (_, index) => {
      const trupp = state.trupps.find(
        (candidate) => candidate.truppnummer === index + 1,
      );
      return trupp === undefined ? null : einsatzlisteRow(state, trupp);
    }),
  };
}

function einsatzlisteRow(state: State, trupp: Trupp): EinsatzlisteRow {
  return {
    truppnummer: formatTruppnummer(trupp.truppnummer),
    selected: trupp.truppnummer === state.selectedTruppnummer,
    sicher: isSicherShown(state, trupp),
    statussymbol: {
      einsatzstatus: trupp.einsatzstatus,
      count: trupp.atemschutztraeger.length,
    },
    restzeit: formatRestzeit(trupp.restzeitMs),
  };
}

// manual 5.8, ABMELDEN figure
function abmeldenModel(state: State): ScreenModel {
  if (state.abmeldung === null) {
    throw new Error("ABMELDEN has no Abmeldung");
  }
  const { truppnummer, markierteTallyIds } = state.abmeldung;
  const trupp = state.trupps.find(
    (candidate) => candidate.truppnummer === truppnummer,
  );
  if (trupp === undefined) {
    throw new Error(`Trupp ${String(truppnummer)} is not logged in`);
  }
  return {
    layout: "abmelden",
    title: `Trupp ${formatTruppnummer(truppnummer)} ABMELDEN`,
    atemschutztraeger: trupp.atemschutztraeger.map((atemschutztraeger) => ({
      name: formatName(atemschutztraeger),
      markiert: markierteTallyIds.includes(atemschutztraeger.tallyId),
    })),
    hinweis: ["OK  =  abmelden", " X  =  nicht abmelden"],
  };
}

// Only these screens have an Login, so its absence is a broken invariant.
function requireLogin(state: State): Login {
  if (state.login === null) {
    throw new Error(`The ${state.screen} screen has no Login`);
  }
  return state.login;
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
    case "einsatzzeitWaehlen":
      return [
        model.title,
        ...model.prompt,
        ...model.atemschutztraeger,
        ...model.items,
      ];
    case "anmeldefenster":
      return [model.title, ...model.atemschutztraeger, ...model.items];
    case "flaschendruckEditor":
      return [
        model.truppnummer === null
          ? model.title
          : `${model.title} ${model.truppnummer}`,
        `Flasche: ${model.cylinder}`,
        `Druck ${model.flaschendruck}`,
        `Restzeit ${model.restzeit}`,
      ];
    case "abmelden":
      return [
        model.title,
        ...model.atemschutztraeger.map(
          (zeile) => `${zeile.name}${zeile.markiert ? " markiert" : ""}`,
        ),
        ...model.hinweis,
      ];
    case "einsatzliste":
      return [
        model.feuerwehrname,
        `${model.batteriefach} ${model.batterySign} ${model.uhrzeit}`,
        ...model.rows.flatMap((row) =>
          row === null ? [] : [einsatzlisteRowText(row)],
        ),
      ];
    default:
      return assertNever(model);
  }
}

function einsatzlisteRowText(row: EinsatzlisteRow): string {
  const markiert = row.selected ? " markiert" : "";
  const { count, einsatzstatus } = row.statussymbol;
  const status = row.sicher
    ? SICHER
    : `${String(count)}× ${EINSATZSTATUS_LABELS[einsatzstatus]}`;
  return `${row.truppnummer}${markiert}  ${status}  ${row.restzeit}`;
}

// manual 3.2.2
export const SICHER = "SICHER";

const EINSATZSTATUS_LABELS: Readonly<Record<Einsatzstatus, string>> = {
  bereitschaft: "Bereitschaft",
  anmarsch: "Anmarsch",
};

// The leading `*` is kept as drawn (LCD screen catalogue, gap G15).
function formatName(atemschutztraeger: Atemschutztraeger): string {
  return `*${atemschutztraeger.name}`;
}

function formatTruppnummer(truppnummer: number): string {
  return twoDigits(truppnummer);
}

function formatMinutes(durationMs: number): string {
  return String(durationMs / 60_000);
}

function formatBar(druckBar: number): string {
  return `${String(druckBar)} bar`;
}

// ASSUMPTION: whole seconds rounded up, so 00:00:00 first shows when the Einsatzzeit is used
// up; a negative Restzeit drops the hour's leading digit to fit the 8-character column, as
// decided in "Define the key-by-screen navigation model".
function formatRestzeit(restzeitMs: number): string {
  const seconds = Math.ceil(restzeitMs / 1000);
  const magnitude = Math.abs(seconds);
  const parts = [
    Math.floor(magnitude / 3600),
    Math.floor(magnitude / 60) % 60,
    magnitude % 60,
  ].map(twoDigits);
  return seconds < 0 ? `-${parts.join(":").slice(1)}` : parts.join(":");
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

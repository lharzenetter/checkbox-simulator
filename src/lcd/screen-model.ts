import {
  abschaltzeitRestMs,
  alarmTrupp,
  ANMELDEAKTIONEN,
  assertNever,
  computeRestzeitMs,
  EINSATZZEITEN_MS,
  estimateFlaschendruckBar,
  isSicherShown,
  P81_FLASCHENTYP_2_BAR,
  rueckzugsdruckBar,
  selectedTrupp,
  truppLoggingOff,
  truppMenueAktionen,
} from "../core/index";
import type {
  Anmeldeaktion,
  Login,
  Atemschutztraeger,
  Einsatzstatus,
  State,
  Trupp,
  TruppMenue,
  TruppMenueAktion,
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
export interface AbmeldenRow {
  readonly name: string;
  /** Has held their Tally to Check; drawn inverse. */
  readonly marked: boolean;
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
      readonly layout: "truppAnsicht";
      readonly title: string;
      readonly atemschutztraeger: readonly string[];
      readonly statussymbol: Statussymbol;
      /** The Aktueller Flaschendruck. */
      readonly flaschendruck: string;
      readonly restzeit: string;
      /** The cylinder graphic's fill, 0–1. */
      readonly fillLevel: number;
      /** `null` while the Trupp has no Anmarschzeit. */
      readonly rueckzugsdruck: string | null;
      readonly label: string;
    }
  | {
      readonly layout: "alarm";
      readonly title: string;
      readonly atemschutztraeger: readonly string[];
      /** The Aktueller Flaschendruck. */
      readonly flaschendruck: string;
      readonly restzeit: string;
      /** The cylinder graphic's fill, 0–1. */
      readonly fillLevel: number;
      /** `null` while the Trupp has no Anmarschzeit. */
      readonly rueckzugsdruck: string | null;
      /** `Alarmende mit OK`, in its two lines. */
      readonly prompt: readonly string[];
    }
  | {
      readonly layout: "truppMenue";
      readonly title: string;
      readonly atemschutztraeger: readonly string[];
      readonly restzeit: string;
      /** The items in view, at most four. */
      readonly items: readonly string[];
      /** The cursor's line among the items in view. */
      readonly selectedIndex: number;
    }
  | {
      readonly layout: "abmelden";
      readonly title: string;
      readonly atemschutztraeger: readonly AbmeldenRow[];
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

// The header words of the Trupp-Menü figures; decided in "Define the key-by-screen navigation
// model", its Trupp-Menü table.
const EINSATZSTATUS_HEADERS: Readonly<Record<Einsatzstatus, string>> = {
  bereitschaft: "BEREITSCHAFT",
  anmarsch: "ANMARSCH",
  einsatzzielErreicht: "EINSATZ",
  rueckmarsch: "RÜCKMARSCH",
};

// decided in "Define the key-by-screen navigation model", its Trupp-Menü table
const TRUPP_MENUE_ITEMS: Readonly<Record<TruppMenueAktion, string>> = {
  truppEinsatz: "Trupp -> Einsatz",
  truppBereitschaft: "Trupp -> Bereitschaft",
  einsatzzielErreicht: "Einsatzziel erreicht",
  rueckzugAntreten: "Rückzug antreten",
  flaschendruckAendern: "Druck ändern",
  attributeEintragen: "Attribute eintragen",
};

// manual 5.4, Trupp-Menü figure: four item lines
const TRUPP_MENUE_LINES = 4;

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
    case "truppAnsicht":
      return truppAnsichtModel(selectedTrupp(state));
    case "truppMenue":
      return truppMenueModel(state, requireTruppMenue(state));
    case "truppFlaschendruckAendern":
      return truppFlaschendruckAendernModel(
        selectedTrupp(state),
        requireTruppMenue(state),
      );
    case "abmelden":
      return abmeldenModel(state);
    case "alarm":
      return alarmModel(alarmTrupp(state));
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

// The same Druck ändern figure, opened from the Trupp-Menü (manual 5.4, 5.6.4, 5.7), titled
// after the item that opened it.
function truppFlaschendruckAendernModel(
  trupp: Trupp,
  truppMenue: TruppMenue,
): ScreenModel {
  if (truppMenue.draftFlaschendruckBar === null) {
    throw new Error("The pressure editor has no Flaschendruck to edit");
  }
  return {
    ...flaschendruckEditorModel(
      trupp,
      truppFlaschendruckEditorTitle(truppMenue.aktion),
      truppMenue.draftFlaschendruckBar,
    ),
    truppnummer: null,
  };
}

// decided in "Define the key-by-screen navigation model", its pressure editor table
function truppFlaschendruckEditorTitle(aktion: TruppMenueAktion): string {
  switch (aktion) {
    case "flaschendruckAendern":
      return "Esz-Zeit ändern";
    case "einsatzzielErreicht":
      return "Esz-Ziel erreicht";
    case "rueckzugAntreten":
      return "Rückzug antreten";
    case "truppEinsatz":
    case "truppBereitschaft":
    case "attributeEintragen":
      throw new Error(`${aktion} opens no pressure editor`);
    default:
      return assertNever(aktion);
  }
}

function flaschendruckEditorModel(
  { truppnummer, einsatzzeitMs }: Pick<Trupp, "truppnummer" | "einsatzzeitMs">,
  title: string,
  flaschendruckBar: number,
): Extract<ScreenModel, { layout: "flaschendruckEditor" }> {
  return {
    layout: "flaschendruckEditor",
    title,
    truppnummer: formatTruppnummer(truppnummer),
    cylinder: formatBar(P81_FLASCHENTYP_2_BAR),
    flaschendruck: formatBar(flaschendruckBar),
    restzeit: formatRestzeit(
      computeRestzeitMs(einsatzzeitMs, flaschendruckBar),
    ),
    fillLevel: cylinderFillLevel(flaschendruckBar),
  };
}

function cylinderFillLevel(flaschendruckBar: number): number {
  return Math.min(1, flaschendruckBar / P81_FLASCHENTYP_2_BAR);
}

// manual 3.2.3, Trupp-Ansicht figure
function truppAnsichtModel(trupp: Trupp): ScreenModel {
  const flaschendruckBar = estimateFlaschendruckBar(trupp);
  return {
    layout: "truppAnsicht",
    title: truppHeader(trupp),
    atemschutztraeger: trupp.atemschutztraeger.map(formatName),
    statussymbol: statussymbolOf(trupp),
    flaschendruck: formatBar(flaschendruckBar),
    restzeit: formatRestzeit(trupp.restzeitMs),
    fillLevel: cylinderFillLevel(flaschendruckBar),
    rueckzugsdruck: formatRueckzugsdruck(trupp),
    label: "Ansicht",
  };
}

// manual 5.5.3, ALARM figure; decided in "Decide how alarms are presented", point 1: live values,
// no cause text and no SICHER
function alarmModel(trupp: Trupp): ScreenModel {
  const flaschendruckBar = estimateFlaschendruckBar(trupp);
  return {
    layout: "alarm",
    title: `Trupp ${formatTruppnummer(trupp.truppnummer)} ALARM`,
    atemschutztraeger: trupp.atemschutztraeger.map(formatName),
    flaschendruck: formatBar(flaschendruckBar),
    restzeit: formatRestzeit(trupp.restzeitMs),
    fillLevel: cylinderFillLevel(flaschendruckBar),
    rueckzugsdruck: formatRueckzugsdruck(trupp),
    prompt: ["Alarmende", "mit OK"],
  };
}

// manual 5.4, Trupp-Menü figure
function truppMenueModel(state: State, truppMenue: TruppMenue): ScreenModel {
  const trupp = selectedTrupp(state);
  const aktionen = truppMenueAktionen(state);
  const cursor = aktionen.indexOf(truppMenue.aktion);
  // ASSUMPTION: the list scrolls only as far as needed to keep the cursor on the bottom line;
  // the navigation model says only that it scrolls past 4 lines.
  const firstInView = Math.max(0, cursor - (TRUPP_MENUE_LINES - 1));
  return {
    layout: "truppMenue",
    title: truppHeader(trupp),
    atemschutztraeger: trupp.atemschutztraeger.map(formatName),
    restzeit: formatRestzeit(trupp.restzeitMs),
    items: aktionen
      .slice(firstInView, firstInView + TRUPP_MENUE_LINES)
      .map((aktion) => TRUPP_MENUE_ITEMS[aktion]),
    selectedIndex: cursor - firstInView,
  };
}

// A Sicherheitstrupp's header follows its Einsatzstatus, as decided in "Define the key-by-screen
// navigation model".
function truppHeader(trupp: Trupp): string {
  return `Trupp ${formatTruppnummer(trupp.truppnummer)} ${EINSATZSTATUS_HEADERS[trupp.einsatzstatus]}`;
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
    statussymbol: statussymbolOf(trupp),
    restzeit: formatRestzeit(trupp.restzeitMs),
  };
}

// manual 3.2.3 item 9, 5.5.3: the box stays empty until the Trupp has an Anmarschzeit
function formatRueckzugsdruck(trupp: Trupp): string | null {
  const bar = rueckzugsdruckBar(trupp);
  return bar === null ? null : formatBar(bar);
}

function statussymbolOf(trupp: Trupp): Statussymbol {
  return {
    einsatzstatus: trupp.einsatzstatus,
    count: trupp.atemschutztraeger.length,
  };
}

// manual 5.8, ABMELDEN figure
function abmeldenModel(state: State): ScreenModel {
  const trupp = truppLoggingOff(state);
  const markedTallyIds = state.logoff?.markedTallyIds ?? [];
  return {
    layout: "abmelden",
    title: `Trupp ${formatTruppnummer(trupp.truppnummer)} ABMELDEN`,
    atemschutztraeger: trupp.atemschutztraeger.map((atemschutztraeger) => ({
      name: formatName(atemschutztraeger),
      marked: markedTallyIds.includes(atemschutztraeger.tallyId),
    })),
    hinweis: ["OK  =  abmelden", " X  =  nicht abmelden"],
  };
}

// Only the Trupp-Menü and its editor have one, so its absence is a broken invariant.
function requireTruppMenue(state: State): TruppMenue {
  if (state.truppMenue === null) {
    throw new Error(`The ${state.screen} screen has no Trupp-Menü`);
  }
  return state.truppMenue;
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
    case "truppAnsicht":
      return [
        model.title,
        ...model.atemschutztraeger,
        `Druck ${model.flaschendruck}`,
        `Restzeit ${model.restzeit}`,
        ...rueckzugsdruckText(model.rueckzugsdruck),
        model.label,
      ];
    case "alarm":
      return [
        model.title,
        ...model.atemschutztraeger,
        `Druck ${model.flaschendruck}`,
        `Restzeit ${model.restzeit}`,
        ...rueckzugsdruckText(model.rueckzugsdruck),
        ...model.prompt,
      ];
    case "truppMenue":
      return [
        model.title,
        ...model.atemschutztraeger,
        `Restzeit ${model.restzeit}`,
        ...model.items,
      ];
    case "abmelden":
      return [
        model.title,
        ...model.atemschutztraeger.map(
          (row) => `${row.name}${row.marked ? " markiert" : ""}`,
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

function rueckzugsdruckText(rueckzugsdruck: string | null): readonly string[] {
  return rueckzugsdruck === null ? [] : [`Rückzugsdruck ${rueckzugsdruck}`];
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
  einsatzzielErreicht: "Einsatzziel erreicht",
  rueckmarsch: "Rückmarsch",
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

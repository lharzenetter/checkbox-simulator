import { abschaltzeitRestMs } from "./abschaltzeit";
import { assertNever } from "./assert-never";
import type { Event, Key } from "./event";
import {
  P01_EINSATZZEIT_1_MS,
  P10_EINSATZZEIT_3_MS,
  P07_MINIMALE_ANZAHL_DER_TRUPPMITGLIEDER,
  P08_MAXIMALE_ANZAHL_DER_TRUPPMITGLIEDER,
  P72_ANZAHL_DER_MAXIMALEN_TRUPPS,
  P76_DRUCK_SPRUNGGROESSE_BAR,
  P77_MAX_UEBER_SOLL_PROZENT,
  P78_MIN_UNTER_SOLL_PROZENT,
  P81_FLASCHENTYP_2_BAR,
} from "./parameters";
import { computeRestzeitMs } from "./restzeit";
import { truppOfTally } from "./selectors";
import type {
  Anmeldeaktion,
  Atemschutztraeger,
  Login,
  Screen,
  State,
  Trupp,
} from "./state";

/** Applies one event to the device state. Input with no meaning on the current screen is ignored. */
export function reduce(state: State, event: Event): State {
  switch (event.type) {
    case "keyPressed":
      return handleKeyPress(state, event.key);
    case "tallyHeld":
      return handleTallyHeld(state, {
        tallyId: event.tallyId,
        name: event.name,
      });
    case "tick":
      return handleTick(
        { ...state, now: event.now, realNow: event.realNow },
        event.now - state.now,
      );
    default:
      return assertNever(event);
  }
}

function handleKeyPress(state: State, key: Key): State {
  switch (state.screen) {
    case "aus":
      return key === "Check" ? enterScreen(state, "startdisplay") : state;
    case "startdisplay":
      return key === "OK" ? enterScreen(state, "service") : state;
    case "service":
      return key === "X" ? enterScreen(state, "startdisplay") : state;
    case "einsatzzeitWaehlen":
      return handleEinsatzzeitWaehlenKey(state, key);
    case "anmeldefenster":
      return handleAnmeldefensterKey(state, key);
    case "anfangsdruckEditor":
      return handleAnfangsdruckEditorKey(state, key);
    case "flaschendruckAendern":
      return handleFlaschendruckAendernKey(state, key);
    case "einsatzliste":
      return key === "Up" || key === "Down" ? moveSelection(state, key) : state;
    default:
      return assertNever(state.screen);
  }
}

// decided in "Define the key-by-screen navigation model": occupied rows only, wrapping
function moveSelection(state: State, key: "Up" | "Down"): State {
  if (state.selectedTruppnummer === null) {
    return state;
  }
  return {
    ...state,
    selectedTruppnummer: moveCursor(
      state.trupps.map((trupp) => trupp.truppnummer),
      state.selectedTruppnummer,
      key,
    ),
  };
}

// #2 and #4 are not offered, decided in "Define the key-by-screen navigation model".
/** The Einsatzzeiten Einsatzzeit wählen offers, top to bottom. */
export const EINSATZZEITEN_MS = [
  P01_EINSATZZEIT_1_MS,
  P10_EINSATZZEIT_3_MS,
] as const;

// decided in "Define the key-by-screen navigation model"
function handleEinsatzzeitWaehlenKey(state: State, key: Key): State {
  const login = requireLogin(state);
  if (login.awaitingLangzeiteinsatzOk) {
    switch (key) {
      case "OK":
        return enterScreen(
          withLogin(state, { ...login, awaitingLangzeiteinsatzOk: false }),
          "anmeldefenster",
        );
      case "X":
        return withLogin(state, { ...login, awaitingLangzeiteinsatzOk: false });
      case "Up":
      case "Down":
      case "Check":
        return state;
      default:
        return assertNever(key);
    }
  }
  switch (key) {
    case "Up":
    case "Down":
      return withLogin(state, {
        ...login,
        einsatzzeitMs: moveCursor(EINSATZZEITEN_MS, login.einsatzzeitMs, key),
      });
    // manual 5.3 step 5; timing-and-alarm-rules §8.3
    case "OK":
      return login.einsatzzeitMs === P01_EINSATZZEIT_1_MS
        ? enterScreen(state, "anmeldefenster")
        : withLogin(state, { ...login, awaitingLangzeiteinsatzOk: true });
    case "X":
      return discardLogin(state);
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

// ASSUMPTION: the cursor wraps on every choice screen, like the Einsatzliste's; the navigation
// model decides wrapping only there ("Define the key-by-screen navigation model").
function moveCursor<T>(
  choices: readonly T[],
  current: T,
  key: "Up" | "Down",
): T {
  const step = key === "Down" ? 1 : -1;
  const index = choices.indexOf(current);
  const next = choices[(index + step + choices.length) % choices.length];
  if (next === undefined) {
    throw new Error("A cursor needs at least one choice");
  }
  return next;
}

// decided in "Define the key-by-screen navigation model": the members are discarded and the
// Truppnummer is freed
function discardLogin(state: State): State {
  return enterScreen(
    { ...state, login: null },
    state.trupps.length === 0 ? "startdisplay" : "einsatzliste",
  );
}

function withLogin(state: State, login: Login): State {
  return { ...state, login };
}

// manual 9.1 [76]–[78]; timing-and-alarm-rules §1.6
const ANFANGSDRUCK_MIN_BAR =
  P81_FLASCHENTYP_2_BAR -
  (P81_FLASCHENTYP_2_BAR * P78_MIN_UNTER_SOLL_PROZENT) / 100;
const ANFANGSDRUCK_MAX_BAR =
  P81_FLASCHENTYP_2_BAR +
  (P81_FLASCHENTYP_2_BAR * P77_MAX_UEBER_SOLL_PROZENT) / 100;

function stepFlaschendruck(
  flaschendruckBar: number,
  key: "Up" | "Down",
): number {
  return key === "Up"
    ? Math.min(
        flaschendruckBar + P76_DRUCK_SPRUNGGROESSE_BAR,
        ANFANGSDRUCK_MAX_BAR,
      )
    : Math.max(
        flaschendruckBar - P76_DRUCK_SPRUNGGROESSE_BAR,
        ANFANGSDRUCK_MIN_BAR,
      );
}

function handleAnfangsdruckEditorKey(state: State, key: Key): State {
  const login = requireLogin(state);
  switch (key) {
    case "Up":
    case "Down":
      return withLogin(state, {
        ...login,
        anfangsdruckBar: stepFlaschendruck(login.anfangsdruckBar, key),
      });
    case "OK":
      return logIn(state, login);
    case "X":
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

// decided in "Define the key-by-screen navigation model": OK keeps the value, X drops it, and
// both return to the Anmeldefenster
function handleFlaschendruckAendernKey(state: State, key: Key): State {
  const login = requireLogin(state);
  const draftFlaschendruckBar = requireDraftFlaschendruck(login);
  switch (key) {
    case "Up":
    case "Down":
      return withLogin(state, {
        ...login,
        draftFlaschendruckBar: stepFlaschendruck(draftFlaschendruckBar, key),
      });
    case "OK":
      return enterScreen(
        withLogin(state, {
          ...login,
          anfangsdruckBar: draftFlaschendruckBar,
          draftFlaschendruckBar: null,
        }),
        "anmeldefenster",
      );
    case "X":
      return enterScreen(
        withLogin(state, { ...login, draftFlaschendruckBar: null }),
        "anmeldefenster",
      );
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

function requireDraftFlaschendruck(login: Login): number {
  if (login.draftFlaschendruckBar === null) {
    throw new Error("Esz-Zeit ändern has no Flaschendruck to edit");
  }
  return login.draftFlaschendruckBar;
}

/** The Anmeldefenster's choices, top to bottom. */
export const ANMELDEAKTIONEN: readonly Anmeldeaktion[] = [
  "truppOkEinsatz",
  "truppOkBereitschaft",
  "sicherheitstruppOk",
  "flaschendruckAendern",
];

// decided in "Define the key-by-screen navigation model"
function handleAnmeldefensterKey(state: State, key: Key): State {
  const login = requireLogin(state);
  switch (key) {
    case "Up":
    case "Down":
      return withLogin(state, {
        ...login,
        anmeldeaktion: moveCursor(ANMELDEAKTIONEN, login.anmeldeaktion, key),
      });
    case "OK":
      return login.anmeldeaktion === "flaschendruckAendern"
        ? enterScreen(
            withLogin(state, {
              ...login,
              draftFlaschendruckBar: login.anfangsdruckBar,
            }),
            "flaschendruckAendern",
          )
        : confirmTrupp(state);
    case "X":
      return discardLogin(state);
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

// timing-and-alarm-rules §12.1, 12.8
function logIn(state: State, login: Login): State {
  const trupp: Trupp = {
    truppnummer: login.truppnummer,
    einsatzzeitMs: login.einsatzzeitMs,
    atemschutztraeger: login.atemschutztraeger,
    einsatzstatus:
      login.anmeldeaktion === "truppOkEinsatz" ? "anmarsch" : "bereitschaft",
    sicherheitstrupp: login.anmeldeaktion === "sicherheitstruppOk",
    restzeitMs: computeRestzeitMs(login.einsatzzeitMs, login.anfangsdruckBar),
  };
  return enterScreen(
    {
      ...state,
      login: null,
      trupps: [...state.trupps, trupp].sort(
        (a, b) => a.truppnummer - b.truppnummer,
      ),
      selectedTruppnummer: trupp.truppnummer,
    },
    "einsatzliste",
  );
}

// ASSUMPTION: below [07] OK does nothing until the login Daueralarm exists, which the navigation
// model starts there instead ("Define the key-by-screen navigation model").
function confirmTrupp(state: State): State {
  const login = requireLogin(state);
  if (
    login.atemschutztraeger.length < P07_MINIMALE_ANZAHL_DER_TRUPPMITGLIEDER
  ) {
    return state;
  }
  return enterScreen(state, "anfangsdruckEditor");
}

// decided in "Define the key-by-screen navigation model", its "Tally on Check" table
function handleTallyHeld(
  state: State,
  atemschutztraeger: Atemschutztraeger,
): State {
  switch (state.screen) {
    case "aus":
    case "startdisplay":
    case "einsatzliste":
      return startLogin(state, atemschutztraeger);
    case "anmeldefenster":
      return addAtemschutztraeger(state, atemschutztraeger);
    case "service":
    case "einsatzzeitWaehlen":
    case "anfangsdruckEditor":
    case "flaschendruckAendern":
      return state;
    default:
      return assertNever(state.screen);
  }
}

// ASSUMPTION: a running Trupp's Atemschutzträger is ignored until logoff exists; the navigation model
// routes them to ABMELDEN ("Define the key-by-screen navigation model").
function startLogin(state: State, atemschutztraeger: Atemschutztraeger): State {
  if (
    state.trupps.length >= P72_ANZAHL_DER_MAXIMALEN_TRUPPS ||
    isInTrupp(state, atemschutztraeger)
  ) {
    return state;
  }
  return enterScreen(
    {
      ...state,
      login: {
        truppnummer: nextFreeTruppnummer(state),
        einsatzzeitMs: P01_EINSATZZEIT_1_MS,
        awaitingLangzeiteinsatzOk: false,
        atemschutztraeger: [atemschutztraeger],
        anmeldeaktion: "truppOkEinsatz",
        anfangsdruckBar: P81_FLASCHENTYP_2_BAR,
        draftFlaschendruckBar: null,
      },
    },
    "einsatzzeitWaehlen",
  );
}

function addAtemschutztraeger(
  state: State,
  atemschutztraeger: Atemschutztraeger,
): State {
  const login = requireLogin(state);
  if (
    login.atemschutztraeger.length >= P08_MAXIMALE_ANZAHL_DER_TRUPPMITGLIEDER ||
    login.atemschutztraeger.some(
      (candidate) => candidate.tallyId === atemschutztraeger.tallyId,
    ) ||
    isInTrupp(state, atemschutztraeger)
  ) {
    return state;
  }
  return {
    ...state,
    login: {
      ...login,
      atemschutztraeger: [...login.atemschutztraeger, atemschutztraeger],
    },
  };
}

function isInTrupp(
  state: State,
  atemschutztraeger: Atemschutztraeger,
): boolean {
  return truppOfTally(state, atemschutztraeger.tallyId) !== undefined;
}

function nextFreeTruppnummer(state: State): number {
  let truppnummer = 1;
  while (state.trupps.some((trupp) => trupp.truppnummer === truppnummer)) {
    truppnummer++;
  }
  return truppnummer;
}

function requireLogin(state: State): Login {
  if (state.login === null) {
    throw new Error(`The ${state.screen} screen has no Login`);
  }
  return state.login;
}

function handleTick(state: State, elapsedMs: number): State {
  const ticked = {
    ...state,
    trupps: state.trupps.map((trupp) => runDown(trupp, elapsedMs)),
  };
  return abschaltzeitRestMs(ticked) === 0 ? enterScreen(ticked, "aus") : ticked;
}

// timing-and-alarm-rules §1.1, 1.2, 4.1
function runDown(trupp: Trupp, elapsedMs: number): Trupp {
  if (trupp.einsatzstatus === "bereitschaft") {
    return trupp;
  }
  return { ...trupp, restzeitMs: trupp.restzeitMs - elapsedMs };
}

// ASSUMPTION: entering a screen restarts its display timing, so returning to the Startdisplay
// from SERVICE shows the full Abschaltzeit again; the manual leaves SERVICE's timing open
// (LCD screen catalogue, S02).
function enterScreen(state: State, screen: Screen): State {
  return { ...state, screen, screenEnteredRealMs: state.realNow };
}

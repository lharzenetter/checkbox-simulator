import { abschaltzeitRestMs } from "./abschaltzeit";
import { assertNever } from "./assert-never";
import type { Event, Key } from "./event";
import {
  P01_EINSATZZEIT_1_MS,
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
import type { Login, Atemschutztraeger, Screen, State, Trupp } from "./state";

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
      return key === "OK" ? enterScreen(state, "anmeldefenster") : state;
    case "anmeldefenster":
      return key === "OK" ? confirmTrupp(state) : state;
    case "anfangsdruckEditor":
      return handleAnfangsdruckEditorKey(state, key);
    case "einsatzliste":
      return state;
    default:
      return assertNever(state.screen);
  }
}

// manual 9.1 [76]–[78]; timing-and-alarm-rules §1.6
const ANFANGSDRUCK_MIN_BAR =
  P81_FLASCHENTYP_2_BAR -
  (P81_FLASCHENTYP_2_BAR * P78_MIN_UNTER_SOLL_PROZENT) / 100;
const ANFANGSDRUCK_MAX_BAR =
  P81_FLASCHENTYP_2_BAR +
  (P81_FLASCHENTYP_2_BAR * P77_MAX_UEBER_SOLL_PROZENT) / 100;

function handleAnfangsdruckEditorKey(state: State, key: Key): State {
  const login = requireLogin(state);
  switch (key) {
    case "Up":
      return withAnfangsdruck(
        state,
        login,
        Math.min(
          login.anfangsdruckBar + P76_DRUCK_SPRUNGGROESSE_BAR,
          ANFANGSDRUCK_MAX_BAR,
        ),
      );
    case "Down":
      return withAnfangsdruck(
        state,
        login,
        Math.max(
          login.anfangsdruckBar - P76_DRUCK_SPRUNGGROESSE_BAR,
          ANFANGSDRUCK_MIN_BAR,
        ),
      );
    case "OK":
      return logIn(state, login);
    case "X":
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

function withAnfangsdruck(
  state: State,
  login: Login,
  anfangsdruckBar: number,
): State {
  return { ...state, login: { ...login, anfangsdruckBar } };
}

// timing-and-alarm-rules §12.1
function logIn(state: State, login: Login): State {
  const trupp: Trupp = {
    truppnummer: login.truppnummer,
    einsatzzeitMs: login.einsatzzeitMs,
    atemschutztraeger: login.atemschutztraeger,
    einsatzstatus: "anmarsch",
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
        atemschutztraeger: [atemschutztraeger],
        anfangsdruckBar: P81_FLASCHENTYP_2_BAR,
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

// timing-and-alarm-rules §1.1, 1.2
function runDown(trupp: Trupp, elapsedMs: number): Trupp {
  return { ...trupp, restzeitMs: trupp.restzeitMs - elapsedMs };
}

// ASSUMPTION: entering a screen restarts its display timing, so returning to the Startdisplay
// from SERVICE shows the full Abschaltzeit again; the manual leaves SERVICE's timing open
// (LCD screen catalogue, S02).
function enterScreen(state: State, screen: Screen): State {
  return { ...state, screen, screenEnteredRealMs: state.realNow };
}

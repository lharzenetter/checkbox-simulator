import { abschaltzeitRestMs } from "./abschaltzeit";
import { hasAlarmFired } from "./alarm";
import { assertNever } from "./assert-never";
import type { Event, Key } from "./event";
import {
  EINSATZPROTOKOLL_CAPACITY,
  NOTAUSSCHALTUNG_HALTEZEIT_MS,
  P01_EINSATZZEIT_1_MS,
  P10_EINSATZZEIT_3_MS,
  P13_TRUPP_DETAILANSICHT_MS,
  P07_MINIMALE_ANZAHL_DER_TRUPPMITGLIEDER,
  P08_MAXIMALE_ANZAHL_DER_TRUPPMITGLIEDER,
  P72_ANZAHL_DER_MAXIMALEN_TRUPPS,
  P73_DRUCK_VERGROESSERBAR_BAR,
  P76_DRUCK_SPRUNGGROESSE_BAR,
  P77_MAX_UEBER_SOLL_PROZENT,
  P78_MIN_UNTER_SOLL_PROZENT,
  P81_FLASCHENTYP_2_BAR,
} from "./parameters";
import {
  computeRestzeitMs,
  estimateFlaschendruckBar,
  snapToFlaschendruckGrid,
} from "./restzeit";
import {
  selectedTrupp,
  truppLoggingOff,
  truppMenueAktionen,
  truppOfTally,
} from "./selectors";
import type {
  Logoff,
  Anmeldeaktion,
  Atemschutztraeger,
  Einsatzprotokoll,
  Login,
  NotausschaltungAktion,
  Screen,
  State,
  Trupp,
  TruppMenue,
} from "./state";

/** Applies one event to the device state. Input with no meaning on the current screen is ignored. */
export function reduce(state: State, event: Event): State {
  switch (event.type) {
    case "keyPressed":
      return handleKeyPress(
        holdNotausschaltungKey(state, event.key),
        event.key,
      );
    case "keyReleased":
      return releaseKey(state, event.key);
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
      return handleEinsatzlisteKey(state, key);
    case "truppAnsicht":
      return handleTruppAnsichtKey(resetIdle(state), key);
    case "truppMenue":
      return handleTruppMenueKey(resetIdle(state), key);
    case "truppFlaschendruckAendern":
      return handleTruppFlaschendruckAendernKey(state, key);
    case "abmelden":
      return handleAbmeldenKey(state, key);
    case "alarm":
      return handleAlarmKey(state, key);
    case "notausschaltungAuswahl":
      return handleNotausschaltungAuswahlKey(state, key);
    case "notausschaltungBestaetigung":
      return handleNotausschaltungBestaetigungKey(state, key);
    default:
      return assertNever(state.screen);
  }
}

// manual 5.9 steps 4–5: OK ends the Trupp(s), any other key cancels
function handleNotausschaltungBestaetigungKey(state: State, key: Key): State {
  if (key !== "OK") {
    return leaveNotausschaltung(state);
  }
  const ended =
    requireNotausschaltung(state) === "alleTrupps"
      ? state.trupps
      : [selectedTrupp(state)];
  return leaveNotausschaltung(endTrupps(state, ended));
}

/** The choices of Notausschaltung – Auswahl, top to bottom. */
export const NOTAUSSCHALTUNG_AKTIONEN: readonly NotausschaltungAktion[] = [
  "markierterTrupp",
  "alleTrupps",
  "zurueck",
];

// manual 5.9 steps 3–4; decided in "Define the key-by-screen navigation model".
// ASSUMPTION: X is inert, as only `-> zurueck` is named as the way back.
function handleNotausschaltungAuswahlKey(state: State, key: Key): State {
  const aktion = requireNotausschaltung(state);
  switch (key) {
    case "Up":
    case "Down":
      return {
        ...state,
        notausschaltung: moveCursor(NOTAUSSCHALTUNG_AKTIONEN, aktion, key),
      };
    case "OK":
      return aktion === "zurueck"
        ? leaveNotausschaltung(state)
        : enterScreen(state, "notausschaltungBestaetigung");
    case "X":
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

function leaveNotausschaltung(state: State): State {
  return enterScreen({ ...state, notausschaltung: null }, "einsatzliste");
}

function requireNotausschaltung(state: State): NotausschaltungAktion {
  if (state.notausschaltung === null) {
    throw new Error(`The ${state.screen} screen has no Notausschaltung`);
  }
  return state.notausschaltung;
}

// manual 5.9 step 2; decided in "Define the key-by-screen navigation model": from the
// Einsatzliste only, so S12 needs its OK first.
// ASSUMPTION: without a marked Trupp there is nothing to end, so the hold does nothing (the
// navigation model starts S14 on `-> markierten Trupp NN`).
function holdNotausschaltungKey(state: State, key: Key): State {
  if (
    !isNotausschaltungKey(key) ||
    state.screen !== "einsatzliste" ||
    state.selectedTruppnummer === null ||
    state.notausschaltungKeysHeld.includes(key)
  ) {
    return state;
  }
  const notausschaltungKeysHeld = [...state.notausschaltungKeysHeld, key];
  return {
    ...state,
    notausschaltungKeysHeld,
    notausschaltungHeldSinceRealMs:
      notausschaltungKeysHeld.length === 2 ? state.realNow : null,
  };
}

function isNotausschaltungKey(key: Key): key is "X" | "Check" {
  return key === "X" || key === "Check";
}

function releaseKey(state: State, key: Key): State {
  if (
    !isNotausschaltungKey(key) ||
    !state.notausschaltungKeysHeld.includes(key)
  ) {
    return state;
  }
  return {
    ...state,
    notausschaltungKeysHeld: state.notausschaltungKeysHeld.filter(
      (held) => held !== key,
    ),
    notausschaltungHeldSinceRealMs: null,
  };
}

// decided in "Design how the Trainee handles Tallys and the clock": ~4 s of real time at any
// speed
function hasNotausschaltungHoldRunOut(state: State): boolean {
  return (
    state.notausschaltungHeldSinceRealMs !== null &&
    state.realNow - state.notausschaltungHeldSinceRealMs >=
      NOTAUSSCHALTUNG_HALTEZEIT_MS
  );
}

// decided in "Decide how alarms are presented", points 5 and 6: only OK works, and nothing else
// is buffered
function handleAlarmKey(state: State, key: Key): State {
  switch (key) {
    case "OK":
      return acknowledgeAlarm(state);
    case "Up":
    case "Down":
    case "X":
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

// timing-and-alarm-rules §8.1; decided in "Decide how alarms are presented", point 5
function acknowledgeAlarm(state: State): State {
  const [acknowledged, ...pendingAlarms] = state.pendingAlarms;
  if (acknowledged === undefined) {
    throw new Error("The ALARM screen has no pending Alarm");
  }
  if (pendingAlarms.length > 0) {
    // S12 stays on screen, so the wail and the LED keep their cycle (point 4)
    return { ...state, pendingAlarms };
  }
  return state.interruptedScreen === null
    ? enterScreen(
        { ...state, pendingAlarms, selectedTruppnummer: acknowledged },
        "einsatzliste",
      )
    : enterScreen(
        { ...state, pendingAlarms, interruptedScreen: null },
        state.interruptedScreen,
      );
}

// decided in "Decide how alarms are presented", points 4 and 5: one pending Alarm per Trupp, in
// firing order, and S12 takes over from any screen.
// ASSUMPTION: an interrupted Einsatzliste counts as nothing interrupted, so the last OK selects the
// acknowledged Trupp there (point 5's fallback; LCD screen catalogue, S12).
function raiseAlarms(state: State, truppnummern: readonly number[]): State {
  const fired = truppnummern.filter(
    (truppnummer) => !state.pendingAlarms.includes(truppnummer),
  );
  if (fired.length === 0) {
    return state;
  }
  const pendingAlarms = [...state.pendingAlarms, ...fired];
  if (state.screen === "alarm") {
    return { ...state, pendingAlarms };
  }
  return enterScreen(
    {
      ...state,
      pendingAlarms,
      interruptedScreen: state.screen === "einsatzliste" ? null : state.screen,
    },
    "alarm",
  );
}

// decided in "Define the key-by-screen navigation model"
function handleEinsatzlisteKey(state: State, key: Key): State {
  switch (key) {
    case "Up":
    case "Down":
      return moveSelection(state, key);
    case "OK":
      return state.selectedTruppnummer === null
        ? state
        : enterScreen(state, "truppAnsicht");
    case "X":
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

// decided in "Define the key-by-screen navigation model": read-only
function handleTruppAnsichtKey(state: State, key: Key): State {
  switch (key) {
    case "OK":
      return enterScreen(
        withTruppMenue(state, {
          aktion: firstOf(truppMenueAktionen(state)),
          draftFlaschendruckBar: null,
        }),
        "truppMenue",
      );
    case "X":
      return enterScreen(state, "einsatzliste");
    case "Up":
    case "Down":
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

// decided in "Define the key-by-screen navigation model"; `Attribute eintragen` is inert
function handleTruppMenueKey(state: State, key: Key): State {
  const truppMenue = requireTruppMenue(state);
  switch (key) {
    case "Up":
    case "Down":
      return withTruppMenue(state, {
        ...truppMenue,
        aktion: moveCursor(truppMenueAktionen(state), truppMenue.aktion, key),
      });
    case "X":
      return enterScreen(withTruppMenue(state, null), "truppAnsicht");
    case "OK":
      return chooseTruppMenueAktion(state, truppMenue);
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

// decided in "Define the key-by-screen navigation model", its Trupp-Menü and pressure editor
// tables; timing-and-alarm-rules §12.5
function chooseTruppMenueAktion(state: State, truppMenue: TruppMenue): State {
  switch (truppMenue.aktion) {
    case "truppEinsatz":
    case "truppBereitschaft":
      return enterScreen(
        withTruppMenue(
          changeEinsatzstatus(state, selectedTrupp(state), truppMenue.aktion),
          null,
        ),
        "einsatzliste",
      );
    case "einsatzzielErreicht":
    case "rueckzugAntreten":
    case "flaschendruckAendern":
      return enterScreen(
        withTruppMenue(state, {
          ...truppMenue,
          draftFlaschendruckBar: snapToFlaschendruckGrid(
            estimateFlaschendruckBar(selectedTrupp(state)),
          ),
        }),
        "truppFlaschendruckAendern",
      );
    case "attributeEintragen":
      return state;
    default:
      return assertNever(truppMenue.aktion);
  }
}

// timing-and-alarm-rules §4.1, 4.6, 5.15, 12.3, 12.4, 12.5: Bereitschaft is a safe area, so
// `Trupp -> Einsatz` starts a new Anmarsch, and choosing the current status changes nothing
function changeEinsatzstatus(
  state: State,
  trupp: Trupp,
  aktion: "truppEinsatz" | "truppBereitschaft",
): State {
  const isBereitschaft = trupp.einsatzstatus === "bereitschaft";
  if (aktion === "truppBereitschaft") {
    return isBereitschaft
      ? state
      : replaceTrupp(state, trupp, { ...trupp, einsatzstatus: "bereitschaft" });
  }
  return isBereitschaft
    ? replaceTrupp(state, trupp, {
        ...trupp,
        einsatzstatus: "anmarsch",
        anmarschBeganAtRunningTimeMs: trupp.runningTimeMs,
        anmarschzeitMs: null,
      })
    : state;
}

// decided in "Define the key-by-screen navigation model": OK enters the Flaschendruck, X keeps
// the old one and the Einsatzstatus
function handleTruppFlaschendruckAendernKey(state: State, key: Key): State {
  const truppMenue = requireTruppMenue(state);
  const draftFlaschendruckBar = requireTruppDraftFlaschendruck(truppMenue);
  switch (key) {
    case "Up":
    case "Down":
      return withTruppMenue(state, {
        ...truppMenue,
        draftFlaschendruckBar: changeFlaschendruck(draftFlaschendruckBar, key),
      });
    case "OK":
      return confirmFlaschendruck(state, truppMenue, draftFlaschendruckBar);
    case "X":
      return enterScreen(
        withTruppMenue(state, { ...truppMenue, draftFlaschendruckBar: null }),
        "truppMenue",
      );
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

function requireTruppDraftFlaschendruck(truppMenue: TruppMenue): number {
  if (truppMenue.draftFlaschendruckBar === null) {
    throw new Error("Esz-Zeit ändern has no Flaschendruck to edit");
  }
  return truppMenue.draftFlaschendruckBar;
}

// timing-and-alarm-rules §1.5, 1.8: raised in [73] steps up to the Anfangsdruck's ceiling,
// lowered in [76] steps down to an empty cylinder (verification scenario V5)
function changeFlaschendruck(
  flaschendruckBar: number,
  key: "Up" | "Down",
): number {
  return key === "Up"
    ? Math.min(
        flaschendruckBar + P73_DRUCK_VERGROESSERBAR_BAR,
        ANFANGSDRUCK_MAX_BAR,
      )
    : Math.max(flaschendruckBar - P76_DRUCK_SPRUNGGROESSE_BAR, 0);
}

// decided in "Define the key-by-screen navigation model", its pressure editor table: Rückzug
// antreten shows the Trupp in RÜCKMARSCH, the others return to the Einsatzliste
function confirmFlaschendruck(
  state: State,
  truppMenue: TruppMenue,
  flaschendruckBar: number,
): State {
  const trupp = selectedTrupp(state);
  const entered = enterFlaschendruck(trupp, flaschendruckBar);
  switch (truppMenue.aktion) {
    case "einsatzzielErreicht":
      return leaveTruppMenue(
        state,
        trupp,
        reachEinsatzziel(entered),
        "einsatzliste",
      );
    case "rueckzugAntreten":
      return leaveTruppMenue(
        state,
        trupp,
        { ...entered, einsatzstatus: "rueckmarsch" },
        "truppAnsicht",
      );
    case "flaschendruckAendern":
      return leaveTruppMenue(state, trupp, entered, "einsatzliste");
    case "truppEinsatz":
    case "truppBereitschaft":
    case "attributeEintragen":
      throw new Error(`${truppMenue.aktion} opens no Flaschendruck editor`);
    default:
      return assertNever(truppMenue.aktion);
  }
}

function leaveTruppMenue(
  state: State,
  trupp: Trupp,
  updated: Trupp,
  screen: Screen,
): State {
  return enterScreen(
    withTruppMenue(replaceTrupp(state, trupp, updated), null),
    screen,
  );
}

// timing-and-alarm-rules §1.4
function enterFlaschendruck(trupp: Trupp, flaschendruckBar: number): Trupp {
  return {
    ...trupp,
    restzeitMs: computeRestzeitMs(trupp.einsatzzeitMs, flaschendruckBar),
  };
}

// timing-and-alarm-rules §5.4, 5.15: `t_A` is measured from the start of the current Anmarsch
function reachEinsatzziel(trupp: Trupp): Trupp {
  return {
    ...trupp,
    einsatzstatus: "einsatzzielErreicht",
    anmarschzeitMs: trupp.runningTimeMs - trupp.anmarschBeganAtRunningTimeMs,
  };
}

function replaceTrupp(state: State, trupp: Trupp, updated: Trupp): State {
  return {
    ...state,
    trupps: state.trupps.map((candidate) =>
      candidate === trupp ? updated : candidate,
    ),
  };
}

function withTruppMenue(state: State, truppMenue: TruppMenue | null): State {
  return { ...state, truppMenue };
}

function requireTruppMenue(state: State): TruppMenue {
  if (state.truppMenue === null) {
    throw new Error(`The ${state.screen} screen has no Trupp-Menü`);
  }
  return state.truppMenue;
}

function firstOf<T>(choices: readonly T[]): T {
  const first = choices[0];
  if (first === undefined) {
    throw new Error("A cursor needs at least one choice");
  }
  return first;
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
    runningTimeMs: 0,
    anmarschBeganAtRunningTimeMs: 0,
    anmarschzeitMs: null,
    loggedInAtMs: state.now,
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
      return routeTally(state, atemschutztraeger);
    case "truppAnsicht":
    case "truppMenue":
      return routeTallyFromTrupp(state, atemschutztraeger);
    case "anmeldefenster":
      return addAtemschutztraeger(state, atemschutztraeger);
    case "abmelden":
      return markAtemschutztraeger(state, atemschutztraeger.tallyId);
    case "service":
    case "einsatzzeitWaehlen":
    case "anfangsdruckEditor":
    case "flaschendruckAendern":
    case "truppFlaschendruckAendern":
    case "alarm":
    case "notausschaltungAuswahl":
    case "notausschaltungBestaetigung":
      return state;
    default:
      return assertNever(state.screen);
  }
}

function routeTally(state: State, atemschutztraeger: Atemschutztraeger): State {
  return isInTrupp(state, atemschutztraeger)
    ? openAbmelden(state, atemschutztraeger)
    : startLogin(state, atemschutztraeger);
}

// The Trupp-Menü closes only if the Tally opens another screen; an ignored one leaves it open.
function routeTallyFromTrupp(
  state: State,
  atemschutztraeger: Atemschutztraeger,
): State {
  const routed = routeTally(withTruppMenue(state, null), atemschutztraeger);
  return routed.screen === state.screen ? state : routed;
}

function startLogin(state: State, atemschutztraeger: Atemschutztraeger): State {
  if (state.trupps.length >= P72_ANZAHL_DER_MAXIMALEN_TRUPPS) {
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

// manual 5.8 step 1
function openAbmelden(
  state: State,
  atemschutztraeger: Atemschutztraeger,
): State {
  const trupp = requireTruppOfTally(state, atemschutztraeger.tallyId);
  return enterScreen(
    {
      ...state,
      logoff: {
        truppnummer: trupp.truppnummer,
        markedTallyIds: [atemschutztraeger.tallyId],
      },
    },
    "abmelden",
  );
}

// manual 5.8 step 4; decided in "Define the key-by-screen navigation model"
function handleAbmeldenKey(state: State, key: Key): State {
  switch (key) {
    case "X":
      return enterScreen({ ...state, logoff: null }, "einsatzliste");
    case "OK":
      return isEveryoneMarked(state) ? logOff(state) : state;
    case "Up":
    case "Down":
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

function isEveryoneMarked(state: State): boolean {
  const logoff = requireLogoff(state);
  return truppLoggingOff(state).atemschutztraeger.every((atemschutztraeger) =>
    logoff.markedTallyIds.includes(atemschutztraeger.tallyId),
  );
}

// manual 5.8 step 4; timing-and-alarm-rules §12.7
function logOff(state: State): State {
  return enterScreen(
    { ...endTrupps(state, [truppLoggingOff(state)]), logoff: null },
    "einsatzliste",
  );
}

// manual p. 31: a logoff and a Notausschaltung each write an Einsatzprotokoll
function endTrupps(state: State, ended: readonly Trupp[]): State {
  const trupps = state.trupps.filter((trupp) => !ended.includes(trupp));
  return {
    ...state,
    trupps,
    selectedTruppnummer: selectionAfterLogoff(state, trupps),
    einsatzprotokolle: [
      ...state.einsatzprotokolle,
      ...ended.map((trupp) => einsatzprotokoll(state, trupp)),
    ].slice(-EINSATZPROTOKOLL_CAPACITY),
  };
}

function einsatzprotokoll(state: State, trupp: Trupp): Einsatzprotokoll {
  return {
    truppnummer: trupp.truppnummer,
    einsatzzeitMs: trupp.einsatzzeitMs,
    atemschutztraeger: trupp.atemschutztraeger,
    einsatzstatus: trupp.einsatzstatus,
    sicherheitstrupp: trupp.sicherheitstrupp,
    loggedInAtMs: trupp.loggedInAtMs,
    loggedOffAtMs: state.now,
  };
}

// ASSUMPTION: the selection stays where it was, or moves to the first remaining Trupp when the
// selected one logs off; the navigation model does not say ("Define the key-by-screen
// navigation model").
function selectionAfterLogoff(
  state: State,
  trupps: readonly Trupp[],
): number | null {
  const stillSelected = trupps.some(
    (trupp) => trupp.truppnummer === state.selectedTruppnummer,
  );
  return stillSelected
    ? state.selectedTruppnummer
    : (trupps[0]?.truppnummer ?? null);
}

// manual 5.8 steps 2–3; decided in "Define the key-by-screen navigation model": anyone else is
// ignored
function markAtemschutztraeger(state: State, tallyId: string): State {
  const logoff = requireLogoff(state);
  if (
    truppOfTally(state, tallyId)?.truppnummer !== logoff.truppnummer ||
    logoff.markedTallyIds.includes(tallyId)
  ) {
    return state;
  }
  return {
    ...state,
    logoff: {
      ...logoff,
      markedTallyIds: [...logoff.markedTallyIds, tallyId],
    },
  };
}

function requireLogoff(state: State): Logoff {
  if (state.logoff === null) {
    throw new Error(`The ${state.screen} screen has no Logoff`);
  }
  return state.logoff;
}

function requireTruppOfTally(state: State, tallyId: string): Trupp {
  const trupp = truppOfTally(state, tallyId);
  if (trupp === undefined) {
    throw new Error(`Tally ${tallyId} is in no Trupp`);
  }
  return trupp;
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
  const trupps = state.trupps.map((trupp) => runDown(trupp, elapsedMs));
  const fired = trupps
    .filter((trupp, index) => {
      const before = state.trupps[index];
      return before !== undefined && hasAlarmFired(before, trupp);
    })
    .map((trupp) => trupp.truppnummer);
  return raiseAlarms(runDisplayTimings({ ...state, trupps }), fired);
}

function runDisplayTimings(state: State): State {
  if (hasNotausschaltungHoldRunOut(state)) {
    return enterScreen(
      { ...state, notausschaltung: "markierterTrupp" },
      "notausschaltungAuswahl",
    );
  }
  if (hasP13TimeoutRunOut(state)) {
    return enterScreen(withTruppMenue(state, null), "einsatzliste");
  }
  return abschaltzeitRestMs(state) === 0 ? enterScreen(state, "aus") : state;
}

// timing-and-alarm-rules §9 [13], 9.1
// ASSUMPTION: the pressure editor `Esz-Zeit ändern` has no timeout; [13] names only the Trupp-
// Ansicht and the Trupp-Menü ("Define the key-by-screen navigation model").
function hasP13TimeoutRunOut(state: State): boolean {
  return (
    (state.screen === "truppAnsicht" || state.screen === "truppMenue") &&
    state.realNow - state.idleSinceRealMs >= P13_TRUPP_DETAILANSICHT_MS
  );
}

// timing-and-alarm-rules §9 [13]: idle means no key pressed
function resetIdle(state: State): State {
  return { ...state, idleSinceRealMs: state.realNow };
}

// timing-and-alarm-rules §1.1, 1.2, 4.1
function runDown(trupp: Trupp, elapsedMs: number): Trupp {
  if (trupp.einsatzstatus === "bereitschaft") {
    return trupp;
  }
  return {
    ...trupp,
    restzeitMs: trupp.restzeitMs - elapsedMs,
    runningTimeMs: trupp.runningTimeMs + elapsedMs,
  };
}

// ASSUMPTION: entering a screen restarts its display timing, so returning to the Startdisplay
// from SERVICE shows the full Abschaltzeit again; the manual leaves SERVICE's timing open
// (LCD screen catalogue, S02). Leaving the Einsatzliste also drops a Notausschaltung hold.
function enterScreen(state: State, screen: Screen): State {
  return {
    ...state,
    screen,
    screenEnteredRealMs: state.realNow,
    idleSinceRealMs: state.realNow,
    notausschaltungKeysHeld: [],
    notausschaltungHeldSinceRealMs: null,
  };
}

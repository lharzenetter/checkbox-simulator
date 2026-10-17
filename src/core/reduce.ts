import { abschaltzeitRestMs } from "./abschaltzeit";
import { checkAlarms, compareFiredAlarms } from "./alarm";
import type { FiredAlarm } from "./alarm";
import { assertNever } from "./assert-never";
import { lastEinsatzprotokollFirstLine } from "./einsatzprotokoll-strip";
import type { Event, Key } from "./event";
import {
  EINSATZPROTOKOLL_CAPACITY,
  NOTAUSSCHALTUNG_HALTEZEIT_MS,
  P01_EINSATZZEIT_1_MS,
  P10_EINSATZZEIT_3_MS,
  P13_TRUPP_DETAILANSICHT_MS,
  P17_EINSATZZEIT_4_MS,
  P07_MINIMALE_ANZAHL_DER_TRUPPMITGLIEDER,
  P08_MAXIMALE_ANZAHL_DER_TRUPPMITGLIEDER,
  P72_ANZAHL_DER_MAXIMALEN_TRUPPS,
  P73_DRUCK_VERGROESSERBAR_BAR,
  P76_DRUCK_SPRUNGGROESSE_BAR,
  P77_MAX_UEBER_SOLL_PROZENT,
  P78_MIN_UNTER_SOLL_PROZENT,
  P81_FLASCHENTYP_2_BAR,
  TRUPP_ANSICHT_ANZEIGEZEIT_MS,
} from "./parameters";
import {
  computeRestzeitMs,
  estimateFlaschendruckBar,
  rueckzugsalarmRestzeitMs,
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
  PendingAlarm,
  Screen,
  ServiceAktion,
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
      return key === "OK"
        ? enterScreen(
            { ...state, serviceAktion: firstOf(SERVICE_AKTIONEN) },
            "service",
          )
        : state;
    case "service":
      return handleServiceKey(state, key);
    case "einsatzprotokoll":
      return handleEinsatzprotokollKey(state, key);
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
      return handleTruppAnsichtKey(state);
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

/** The SERVICE menu's items as drawn, top to bottom. */
export const SERVICE_AKTIONEN: readonly ServiceAktion[] = [
  "einsatzprotokoll",
  "zeitDatumEinstellen",
  "kontrast",
  "testprogramm",
];

// manual 5.2, 5.10 steps 3–4; decided in "Show the Einsatzprotokolle on the LCD": only
// `Einsatzprotokoll` is live
function handleServiceKey(state: State, key: Key): State {
  const aktion = requireServiceAktion(state);
  switch (key) {
    case "Up":
    case "Down":
      return {
        ...state,
        serviceAktion: moveCursor(SERVICE_AKTIONEN, aktion, key),
      };
    case "OK":
      return aktion === "einsatzprotokoll"
        ? enterScreen(
            { ...state, einsatzprotokollFirstLine: 0 },
            "einsatzprotokoll",
          )
        : state;
    case "X":
      return enterScreen({ ...state, serviceAktion: null }, "startdisplay");
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

// manual 5.10 steps 5–6.
// ASSUMPTION: Up and Down scroll the strip line by line, as far as its ends ("Show the
// Einsatzprotokolle on the LCD").
function handleEinsatzprotokollKey(state: State, key: Key): State {
  switch (key) {
    case "Up":
    case "Down":
      return scrollEinsatzprotokolle(state, key === "Down" ? 1 : -1);
    case "X":
      return enterScreen({ ...state, einsatzprotokollFirstLine: 0 }, "service");
    case "OK":
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

function scrollEinsatzprotokolle(state: State, step: 1 | -1): State {
  const einsatzprotokollFirstLine = Math.min(
    Math.max(state.einsatzprotokollFirstLine + step, 0),
    lastEinsatzprotokollFirstLine(state),
  );
  return einsatzprotokollFirstLine === state.einsatzprotokollFirstLine
    ? state
    : { ...state, einsatzprotokollFirstLine };
}

function requireServiceAktion(state: State): ServiceAktion {
  if (state.serviceAktion === null) {
    throw new Error(`The ${state.screen} screen has no SERVICE item`);
  }
  return state.serviceAktion;
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
  return leaveNotausschaltung(
    endTrupps(state, ended, { notausschaltung: true }),
  );
}

/** The choices of Notausschaltung – Auswahl, top to bottom. */
export const NOTAUSSCHALTUNG_AKTIONEN: readonly NotausschaltungAktion[] = [
  "markierterTrupp",
  "alleTrupps",
  "zurueck",
];

// manual 5.9 steps 3–4; decided in "Define the key-by-screen navigation model".
// ASSUMPTION: X is inert, as "Define the key-by-screen navigation model" names only `-> zurueck`
// as the way back.
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
// ASSUMPTION: without a marked Trupp there is nothing to end, so the hold does nothing, and a key
// already down when the Einsatzliste opens counts only once pressed again; the navigation model
// starts S14 on `-> markierten Trupp NN` but says no more ("Define the key-by-screen navigation
// model").
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

// timing-and-alarm-rules §8.1, 8.4: the first OK silences the Alarm, the second ends it;
// decided in "Decide how alarms are presented", point 5
function acknowledgeAlarm(state: State): State {
  if (!state.alarmSilenced) {
    return { ...state, alarmSilenced: true };
  }
  const [ended, ...pendingAlarms] = state.pendingAlarms;
  if (ended === undefined) {
    throw new Error("The ALARM screen has no pending Alarm");
  }
  const next = { ...state, pendingAlarms, alarmSilenced: false };
  if (pendingAlarms.length > 0) {
    // ASSUMPTION: the first OK stopped the signal, so the next Alarm starts its wail afresh, as
    // one that interrupts a screen does (timing-and-alarm-rules §8.4: "the next queued Alarm
    // (sounding)").
    return enterScreen(next, "alarm");
  }
  return state.interruptedScreen === null
    ? enterScreen(
        { ...next, selectedTruppnummer: ended.truppnummer },
        "einsatzliste",
      )
    : enterScreen(
        { ...next, interruptedScreen: null },
        state.interruptedScreen,
      );
}

// decided in "Decide how alarms are presented", points 4 and 5, and timing-and-alarm-rules §8.2:
// every Alarm queues on its own, first in, first out, and S12 takes over from any screen.
// ASSUMPTION: an interrupted Einsatzliste counts as nothing interrupted, so the last OK selects the
// acknowledged Trupp there (point 5's fallback; LCD screen catalogue, S12).
function raiseAlarms(state: State, fired: readonly PendingAlarm[]): State {
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

function toPendingAlarm(
  truppnummer: number,
  { cause }: FiredAlarm,
): PendingAlarm {
  return { truppnummer, cause };
}

// decided in "Define the key-by-screen navigation model", as amended in "Correct the simulator
// against the real Checkbox": OK opens the Trupp-Menü directly
function handleEinsatzlisteKey(state: State, key: Key): State {
  switch (key) {
    case "Up":
    case "Down":
      return moveSelection(state, key);
    case "OK":
      return state.selectedTruppnummer === null
        ? state
        : enterScreen(
            withTruppMenue(state, {
              aktion: firstOf(truppMenueAktionen(state)),
              draftFlaschendruckBar: null,
              sicherheitstruppDeaktivierenShown: false,
            }),
            "truppMenue",
          );
    case "X":
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

// decided in "Correct the simulator against the real Checkbox": any key closes it early
function handleTruppAnsichtKey(state: State): State {
  return enterScreen(state, "einsatzliste");
}

// decided in "Define the key-by-screen navigation model", as amended in "Correct the simulator
// against the real Checkbox"; `Attribute eintragen` is inert
function handleTruppMenueKey(state: State, key: Key): State {
  const truppMenue = requireTruppMenue(state);
  if (truppMenue.sicherheitstruppDeaktivierenShown) {
    return handleSicherheitstruppDeaktivierenKey(state, key);
  }
  switch (key) {
    case "Up":
    case "Down":
      return withTruppMenue(state, {
        ...truppMenue,
        aktion: moveCursor(truppMenueAktionen(state), truppMenue.aktion, key),
      });
    case "X":
      return enterScreen(withTruppMenue(state, null), "einsatzliste");
    case "OK":
      return chooseTruppMenueAktion(state, truppMenue);
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

// decided in "Define the key-by-screen navigation model", its Trupp-Menü and pressure editor
// tables; timing-and-alarm-rules §12.5, 12.8.
// ASSUMPTION: `Sicherheitstrupp deaktivieren?` asks each time a Sicherheitstrupp leaves
// Bereitschaft, not only the first time ("Correct the simulator against the real Checkbox").
function chooseTruppMenueAktion(state: State, truppMenue: TruppMenue): State {
  const trupp = selectedTrupp(state);
  switch (truppMenue.aktion) {
    case "truppEinsatz":
      return trupp.sicherheitstrupp && trupp.einsatzstatus === "bereitschaft"
        ? withTruppMenue(state, {
            ...truppMenue,
            sicherheitstruppDeaktivierenShown: true,
          })
        : chooseEinsatzstatus(state, trupp, "truppEinsatz");
    case "truppBereitschaft":
      return chooseEinsatzstatus(state, trupp, "truppBereitschaft");
    case "einsatzzielErreicht":
    case "rueckzugAntreten":
    case "flaschendruckAendern":
      return enterScreen(
        withTruppMenue(state, {
          ...truppMenue,
          draftFlaschendruckBar: snapToFlaschendruckGrid(
            estimateFlaschendruckBar(trupp),
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

// timing-and-alarm-rules §12.8: X sends the Trupp in still a Sicherheitstrupp, OK as an ordinary
// Trupp, for good.
// ASSUMPTION: Up, Down and Check are ignored while it shows, as on every box over a screen
// ("Correct the simulator against the real Checkbox").
function handleSicherheitstruppDeaktivierenKey(state: State, key: Key): State {
  const trupp = selectedTrupp(state);
  switch (key) {
    case "X":
      return chooseEinsatzstatus(state, trupp, "truppEinsatz");
    case "OK": {
      const deactivated = { ...trupp, sicherheitstrupp: false };
      return chooseEinsatzstatus(
        replaceTrupp(state, trupp, deactivated),
        deactivated,
        "truppEinsatz",
      );
    }
    case "Up":
    case "Down":
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

function chooseEinsatzstatus(
  state: State,
  trupp: Trupp,
  aktion: "truppEinsatz" | "truppBereitschaft",
): State {
  return enterScreen(
    withTruppMenue(changeEinsatzstatus(state, trupp, aktion), null),
    "einsatzliste",
  );
}

// timing-and-alarm-rules §4.1, 4.6, 12.3, 12.4, 12.5: `Trupp -> Einsatz` restores the earlier
// Einsatzstatus and keeps the Anmarschzeit, the Rückzugsdruck and the Rückzugsalarm as they
// were, and choosing the current status changes nothing
function changeEinsatzstatus(
  state: State,
  trupp: Trupp,
  aktion: "truppEinsatz" | "truppBereitschaft",
): State {
  const isBereitschaft = trupp.einsatzstatus === "bereitschaft";
  if (aktion === "truppBereitschaft") {
    return isBereitschaft
      ? state
      : replaceTrupp(state, trupp, {
          ...trupp,
          einsatzstatus: "bereitschaft",
          timeInBereitschaftMs: 0,
          einsatzstatusBeforeBereitschaft: trupp.einsatzstatus,
        });
  }
  return isBereitschaft
    ? replaceTrupp(state, trupp, {
        ...trupp,
        einsatzstatus: trupp.einsatzstatusBeforeBereitschaft ?? "anmarsch",
        timeInBereitschaftMs: 0,
        einsatzstatusBeforeBereitschaft: null,
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

// decided in "Correct the simulator against the real Checkbox", navigation: every pressure entry
// shows the Trupp-Ansicht
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
        reachEinsatzziel(entered, flaschendruckBar),
      );
    case "rueckzugAntreten":
      return leaveTruppMenue(state, trupp, {
        ...entered,
        einsatzstatus: "rueckmarsch",
      });
    case "flaschendruckAendern":
      return leaveTruppMenue(state, trupp, entered);
    case "truppEinsatz":
    case "truppBereitschaft":
    case "attributeEintragen":
      throw new Error(`${truppMenue.aktion} opens no Flaschendruck editor`);
    default:
      return assertNever(truppMenue.aktion);
  }
}

// timing-and-alarm-rules §3.4, 5.9, 5.14: an entry that takes the Restzeit past an Alarm point fires
// it on OK, and one that lifts the estimate above the Rückzugsdruck re-arms the Rückzugsalarm
function leaveTruppMenue(state: State, trupp: Trupp, updated: Trupp): State {
  const { trupp: checked, fired } = checkAlarms(
    trupp,
    rearmRueckzugsalarm(updated),
  );
  return raiseAlarms(
    enterScreen(
      withTruppMenue(replaceTrupp(state, trupp, checked), null),
      "truppAnsicht",
    ),
    fired.map((alarm) => toPendingAlarm(checked.truppnummer, alarm)),
  );
}

// timing-and-alarm-rules §1.4
function enterFlaschendruck(trupp: Trupp, flaschendruckBar: number): Trupp {
  return {
    ...trupp,
    restzeitMs: computeRestzeitMs(trupp.einsatzzeitMs, flaschendruckBar),
  };
}

// timing-and-alarm-rules §5.9: only a pressure entry that lifts the estimate above the
// Rückzugsdruck re-arms the Rückzugsalarm
function rearmRueckzugsalarm(trupp: Trupp): Trupp {
  return trupp.restzeitMs > rueckzugsalarmRestzeitMs(trupp)
    ? { ...trupp, rueckzugsalarmArmed: true }
    : trupp;
}

// timing-and-alarm-rules §4.6, 5.4, 5.7, 5.15: Bereitschaft pauses `t_run`, so `t_A` is the
// running time at Einsatzziel erreicht; the Anmarschdruck always runs from the Anfangsdruck
function reachEinsatzziel(trupp: Trupp, flaschendruckBar: number): Trupp {
  return {
    ...trupp,
    einsatzstatus: "einsatzzielErreicht",
    anmarschzeitMs: trupp.runningTimeMs,
    anmarschdruckBar: trupp.anfangsdruckBar - flaschendruckBar,
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

// #2 is not offered, decided in "Define the key-by-screen navigation model"; #4 is, decided in
// "Correct the simulator against the real Checkbox".
/** The Einsatzzeiten Einsatzzeit wählen offers, top to bottom. */
export const EINSATZZEITEN_MS = [
  P01_EINSATZZEIT_1_MS,
  P10_EINSATZZEIT_3_MS,
  P17_EINSATZZEIT_4_MS,
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

// decided in "Define the key-by-screen navigation model"
// ASSUMPTION: X keeps the Anfangsdruck as last set, so it is not reset on the way back; the user
// confirmed only that X returns to the Anmeldefenster.
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
      return enterScreen(state, "anmeldefenster");
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
  if (login.zuWenigEinsatzkraefteShown) {
    return handleZuWenigEinsatzkraefteKey(state, login, key);
  }
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

// timing-and-alarm-rules §7.6: OK and X close only the box, keeping the members.
// ASSUMPTION: Up, Down and Check are ignored while it shows, as on every box over a screen
// ("Correct the simulator against the real Checkbox").
function handleZuWenigEinsatzkraefteKey(
  state: State,
  login: Login,
  key: Key,
): State {
  switch (key) {
    case "OK":
    case "X":
      return withLogin(state, { ...login, zuWenigEinsatzkraefteShown: false });
    case "Up":
    case "Down":
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

// timing-and-alarm-rules §12.1, 12.8.
// ASSUMPTION: the login's Anfangsdruck counts as a pressure entry, so it shows the Trupp-Ansicht too
// ("Correct the simulator against the real Checkbox", navigation) and fires on OK the Alarms an
// entry down from the full Einsatzzeit passes, such as 00:00:00 at 0 bar (§3.4, 5.9, 5.14).
function logIn(state: State, login: Login): State {
  const trupp: Trupp = {
    truppnummer: login.truppnummer,
    einsatzzeitMs: login.einsatzzeitMs,
    atemschutztraeger: login.atemschutztraeger,
    einsatzstatus:
      login.anmeldeaktion === "truppOkEinsatz" ? "anmarsch" : "bereitschaft",
    sicherheitstrupp: login.anmeldeaktion === "sicherheitstruppOk",
    restzeitMs: computeRestzeitMs(login.einsatzzeitMs, login.anfangsdruckBar),
    anfangsdruckBar: login.anfangsdruckBar,
    runningTimeMs: 0,
    timeInBereitschaftMs: 0,
    einsatzstatusBeforeBereitschaft: null,
    anmarschzeitMs: null,
    anmarschdruckBar: null,
    // timing-and-alarm-rules §5.13
    rueckzugsalarmArmed: true,
    loggedInAtMs: state.now,
  };
  const { trupp: checked, fired } = checkAlarms(
    { ...trupp, restzeitMs: trupp.einsatzzeitMs },
    trupp,
  );
  return raiseAlarms(
    enterScreen(
      {
        ...state,
        login: null,
        trupps: [...state.trupps, checked].sort(
          (a, b) => a.truppnummer - b.truppnummer,
        ),
        selectedTruppnummer: checked.truppnummer,
      },
      "truppAnsicht",
    ),
    fired.map((alarm) => toPendingAlarm(checked.truppnummer, alarm)),
  );
}

// timing-and-alarm-rules §7.5: below [07] OK shows `Zu wenig Einsatzkräfte!` over the
// Anmeldefenster
function confirmTrupp(state: State): State {
  const login = requireLogin(state);
  return hasEnoughAtemschutztraeger(login)
    ? enterScreen(state, "anfangsdruckEditor")
    : withLogin(state, { ...login, zuWenigEinsatzkraefteShown: true });
}

// decided in "Decide when a Daueralarm starts and ends": OK never silences a Daueralarm.
// ASSUMPTION: nor does it restart one that is sounding, so its wail runs on unbroken; the ADR
// restarts it only once it has stopped (taken in "Sound the login and logoff Daueralarme",
// issue #36).
function soundDaueralarm(state: State, logoff: Logoff): Logoff {
  return logoff.daueralarmSinceRealMs === null
    ? { ...logoff, daueralarmSinceRealMs: state.realNow }
    : logoff;
}

function hasEnoughAtemschutztraeger(login: Login): boolean {
  return (
    login.atemschutztraeger.length >= P07_MINIMALE_ANZAHL_DER_TRUPPMITGLIEDER
  );
}

// decided in "Define the key-by-screen navigation model", its "Tally on Check" table.
// ASSUMPTION: a Tally is no key, so it does not close the Trupp-Ansicht of "Correct the simulator
// against the real Checkbox" but is routed from it as from the Trupp-Menü (taken in issue #50).
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
      return routeTallyFromTrupp(state, atemschutztraeger);
    // ASSUMPTION: a Tally is ignored while `Sicherheitstrupp deaktivieren?` shows, like every key
    // but X and OK (taken in issue #52).
    case "truppMenue":
      return requireTruppMenue(state).sicherheitstruppDeaktivierenShown
        ? state
        : routeTallyFromTrupp(state, atemschutztraeger);
    case "anmeldefenster":
      return addAtemschutztraeger(state, atemschutztraeger);
    case "abmelden":
      return markAtemschutztraeger(state, atemschutztraeger.tallyId);
    case "service":
    case "einsatzprotokoll":
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
        zuWenigEinsatzkraefteShown: false,
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
        daueralarmSinceRealMs: null,
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
      // timing-and-alarm-rules §7.3: with anyone unmarked OK starts the logoff Daueralarm instead
      return isEveryoneMarked(state)
        ? logOff(state)
        : { ...state, logoff: soundDaueralarm(state, requireLogoff(state)) };
    case "Up":
    case "Down":
    case "Check":
      return state;
    default:
      return assertNever(key);
  }
}

function isEveryoneMarked(state: State): boolean {
  return isEveryoneIn(truppLoggingOff(state), requireLogoff(state));
}

function isEveryoneIn(trupp: Trupp, logoff: Logoff): boolean {
  return trupp.atemschutztraeger.every((atemschutztraeger) =>
    logoff.markedTallyIds.includes(atemschutztraeger.tallyId),
  );
}

// manual 5.8 step 4; timing-and-alarm-rules §12.7
function logOff(state: State): State {
  return enterScreen(
    {
      ...endTrupps(state, [truppLoggingOff(state)], { notausschaltung: false }),
      logoff: null,
    },
    "einsatzliste",
  );
}

// manual p. 31: a logoff and a Notausschaltung each write an Einsatzprotokoll.
// ASSUMPTION: each gets its own Einsatznummer, and `davon aktiv` is `t_run` ("Show the
// Einsatzprotokolle on the LCD").
function endTrupps(
  state: State,
  ended: readonly Trupp[],
  { notausschaltung }: { readonly notausschaltung: boolean },
): State {
  const trupps = state.trupps.filter((trupp) => !ended.includes(trupp));
  const written = ended.map((trupp, index): Einsatzprotokoll => ({
    einsatznummer: state.nextEinsatznummer + index,
    truppnummer: trupp.truppnummer,
    einsatzzeitMs: trupp.einsatzzeitMs,
    atemschutztraeger: trupp.atemschutztraeger,
    einsatzstatus: trupp.einsatzstatus,
    sicherheitstrupp: trupp.sicherheitstrupp,
    loggedInAtMs: trupp.loggedInAtMs,
    loggedOffAtMs: state.now,
    davonAktivMs: trupp.runningTimeMs,
    notausschaltung,
  }));
  return {
    ...state,
    trupps,
    selectedTruppnummer: selectionAfterEnding(state, trupps),
    einsatzprotokolle: [...state.einsatzprotokolle, ...written].slice(
      -EINSATZPROTOKOLL_CAPACITY,
    ),
    nextEinsatznummer: state.nextEinsatznummer + written.length,
  };
}

// ASSUMPTION: the selection stays where it was, or moves to the first remaining Trupp when the
// selected one is logged off or ended; the navigation model does not say ("Define the key-by-screen
// navigation model").
function selectionAfterEnding(
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
  const marked: Logoff = {
    ...logoff,
    markedTallyIds: [...logoff.markedTallyIds, tallyId],
  };
  // timing-and-alarm-rules §7.4: the last mark stops the Daueralarm, and ABMELDEN waits for OK
  return {
    ...state,
    logoff: isEveryoneIn(truppLoggingOff(state), marked)
      ? { ...marked, daueralarmSinceRealMs: null }
      : marked,
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
  // timing-and-alarm-rules §7.6: a joining Tally closes `Zu wenig Einsatzkräfte!`, and the
  // Anmeldefenster waits for OK
  return withLogin(state, {
    ...login,
    atemschutztraeger: [...login.atemschutztraeger, atemschutztraeger],
    zuWenigEinsatzkraefteShown: false,
  });
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
  const checks = state.trupps.map((trupp) =>
    checkAlarms(trupp, runDown(trupp, elapsedMs)),
  );
  const trupps = checks.map(({ trupp }) => trupp);
  // timing-and-alarm-rules §8.2: across Trupps too, in the order the thresholds were reached; the
  // sort is stable, so Trupps tie in Truppnummer order
  const fired = checks
    .flatMap(({ trupp, fired: alarms }) =>
      alarms.map((alarm) => ({ alarm, truppnummer: trupp.truppnummer })),
    )
    .sort((a, b) => compareFiredAlarms(a.alarm, b.alarm))
    .map(({ alarm, truppnummer }) => toPendingAlarm(truppnummer, alarm));
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
  if (hasTruppAnsichtRunOut(state)) {
    return enterScreen(state, "einsatzliste");
  }
  return abschaltzeitRestMs(state) === 0 ? enterScreen(state, "aus") : state;
}

// timing-and-alarm-rules §9 [13], 9.1
// ASSUMPTION: [13] closes `Sicherheitstrupp deaktivieren?` with the Trupp-Menü, leaving the Trupp
// in Bereitschaft and flagged, since the box answers neither question (taken in issue #52).
// ASSUMPTION: the pressure editor `Esz-Zeit ändern` has no timeout; [13] names only the Trupp-Menü
// ("Correct the simulator against the real Checkbox").
function hasP13TimeoutRunOut(state: State): boolean {
  return (
    state.screen === "truppMenue" &&
    state.realNow - state.idleSinceRealMs >= P13_TRUPP_DETAILANSICHT_MS
  );
}

// timing-and-alarm-rules §9, 9.1.
// ASSUMPTION: an Alarm that a pressure entry fires takes over from its Trupp-Ansicht, and the last
// OK shows that Trupp-Ansicht again for a full 5 s, as entering any screen restarts its display
// timing (taken in issue #50).
function hasTruppAnsichtRunOut(state: State): boolean {
  return (
    state.screen === "truppAnsicht" &&
    state.realNow - state.screenEnteredRealMs >= TRUPP_ANSICHT_ANZEIGEZEIT_MS
  );
}

// timing-and-alarm-rules §9 [13]: idle means no key pressed
function resetIdle(state: State): State {
  return { ...state, idleSinceRealMs: state.realNow };
}

// timing-and-alarm-rules §1.1, 1.2, 4.1, 4.4
function runDown(trupp: Trupp, elapsedMs: number): Trupp {
  if (trupp.einsatzstatus === "bereitschaft") {
    return {
      ...trupp,
      timeInBereitschaftMs: trupp.timeInBereitschaftMs + elapsedMs,
    };
  }
  return {
    ...trupp,
    restzeitMs: trupp.restzeitMs - elapsedMs,
    runningTimeMs: trupp.runningTimeMs + elapsedMs,
  };
}

// ASSUMPTION: entering a screen restarts its display timing, so returning to the Startdisplay
// from SERVICE shows the full Abschaltzeit again; the manual leaves SERVICE's timing open
// (LCD screen catalogue, S02).
// A Notausschaltung hold counts only while the Einsatzliste stays on screen, so S12 taking over
// ends it (decided in "Decide how alarms are presented", point 6).
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

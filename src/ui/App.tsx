import { useCallback, useState } from "react";
import { alarmCycleMs, isAlarmSounding } from "../core/index";
import type { Key } from "../core/index";
import { ROSTER, tallyHeld } from "../world/index";
import type { RosterTally } from "../world/index";
import { ClockControls } from "./ClockControls";
import { FirstLaunchDialog } from "./FirstLaunchDialog";
import { FrontPanel } from "./FrontPanel";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import type { ClockAction } from "./keyboard-bindings";
import { MuteToggle } from "./MuteToggle";
import { SessionChoiceDialog } from "./SessionChoiceDialog";
import { Settings } from "./Settings";
import { TallyRoster } from "./TallyRoster";
import { useKeyMap } from "./use-key-map";
import { useSiren } from "./use-siren";
import { useSimulator } from "./use-simulator";
import styles from "./App.module.css";

export function App() {
  const {
    state,
    dispatch,
    clock,
    pause,
    play,
    setSpeed,
    stepSpeed,
    togglePause,
    vehicles,
    firstLaunchDone,
    nameVehicles,
    muted,
    toggleMute,
    resetToFactory,
    sessionChoicePending,
    resumeSession,
    discardSession,
  } = useSimulator();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // decided in "Decide how alarms are presented", points 7 and 8: pause and mute silence only
  // the siren
  useSiren({
    sounding: isAlarmSounding(state) && !clock.paused && !muted,
    cycleMs: alarmCycleMs(state),
  });
  const pressKey = useCallback(
    (key: Key) => {
      dispatch({ type: "keyPressed", key });
    },
    [dispatch],
  );
  const releaseKey = useCallback(
    (key: Key) => {
      dispatch({ type: "keyReleased", key });
    },
    [dispatch],
  );
  const tapTally = useCallback(
    (tally: RosterTally | undefined) => {
      if (tally !== undefined) {
        dispatch(tallyHeld(tally, vehicles));
      }
    },
    [dispatch, vehicles],
  );
  const tapTallyAt = useCallback(
    (rosterIndex: number) => {
      tapTally(ROSTER[rosterIndex]);
    },
    [tapTally],
  );
  const tapTallyById = useCallback(
    (tallyId: string) => {
      tapTally(ROSTER.find((tally) => tally.tallyId === tallyId));
    },
    [tapTally],
  );
  const steerClock = useCallback(
    (action: ClockAction) => {
      if (action === "togglePause") {
        togglePause();
      } else {
        stepSpeed(action);
      }
    },
    [stepSpeed, togglePause],
  );
  useKeyMap({
    enabled:
      firstLaunchDone &&
      !sessionChoicePending &&
      !settingsOpen &&
      !shortcutsOpen,
    onKeyPressed: pressKey,
    onKeyReleased: releaseKey,
    onTallyKeyPressed: tapTallyAt,
    onClockKeyPressed: steerClock,
  });

  return (
    <main className={styles.app}>
      <ClockControls
        clock={clock}
        onPause={pause}
        onPlay={play}
        onSpeedChosen={setSpeed}
      />
      <div className={styles.chrome}>
        <MuteToggle muted={muted} onToggle={toggleMute} />
        <button
          type="button"
          className={styles.chromeButton}
          onClick={() => {
            setSettingsOpen(true);
          }}
        >
          Einstellungen
        </button>
        <button
          type="button"
          className={styles.chromeButton}
          onClick={() => {
            setShortcutsOpen(true);
          }}
        >
          Tastenkürzel
        </button>
      </div>
      <div className={styles.stage}>
        <FrontPanel
          state={state}
          dispatch={dispatch}
          onTallyDropped={tapTallyById}
        />
        <TallyRoster
          state={state}
          vehicles={vehicles}
          onTallyTapped={tapTally}
        />
      </div>
      {!firstLaunchDone && (
        <FirstLaunchDialog vehicles={vehicles} onConfirm={nameVehicles} />
      )}
      {sessionChoicePending && (
        <SessionChoiceDialog
          onResume={resumeSession}
          onDiscard={discardSession}
        />
      )}
      {settingsOpen && (
        <Settings
          vehicles={vehicles}
          onVehiclesNamed={nameVehicles}
          onFactoryReset={resetToFactory}
          onClose={() => {
            setSettingsOpen(false);
          }}
        />
      )}
      {shortcutsOpen && (
        <KeyboardShortcuts
          onClose={() => {
            setShortcutsOpen(false);
          }}
        />
      )}
    </main>
  );
}

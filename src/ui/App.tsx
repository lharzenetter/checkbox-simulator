import { useCallback, useState } from "react";
import { alarmCycleMs, isAlarmSounding } from "../core/index";
import type { Key } from "../core/index";
import { ROSTER, tallyHeld } from "../world/index";
import type { RosterTally } from "../world/index";
import { ClockControls } from "./ClockControls";
import { FirstLaunchDialog } from "./FirstLaunchDialog";
import { Footer } from "./Footer";
import { FrontPanel } from "./FrontPanel";
import { IconButton } from "./IconButton";
import {
  KeyboardIcon,
  MaximizeIcon,
  MinimizeIcon,
  SettingsIcon,
} from "./Icons";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import type { ClockAction } from "./keyboard-bindings";
import { MuteToggle } from "./MuteToggle";
import { SessionChoiceDialog } from "./SessionChoiceDialog";
import { Settings } from "./Settings";
import { TallyRoster } from "./TallyRoster";
import { useFullscreen } from "./use-fullscreen";
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
    names,
    firstLaunchDone,
    setNames,
    muted,
    toggleMute,
    resetToFactory,
    sessionChoicePending,
    resumeSession,
    discardSession,
  } = useSimulator();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const {
    supported: fullscreenSupported,
    fullscreen,
    toggleFullscreen,
  } = useFullscreen();
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
        dispatch(tallyHeld(tally, names.vehicles));
      }
    },
    [dispatch, names.vehicles],
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
    <div className={styles.app}>
      <header className={styles.bar}>
        <h1 className={styles.title}>
          Checkbox<span className={styles.titleSuffix}>-Simulator</span>
        </h1>
        <div className={styles.clock}>
          <ClockControls
            clock={clock}
            onPause={pause}
            onPlay={play}
            onSpeedChosen={setSpeed}
          />
        </div>
        <div className={styles.chrome}>
          <MuteToggle muted={muted} onToggle={toggleMute} />
          <IconButton
            label="Einstellungen"
            onClick={() => {
              setSettingsOpen(true);
            }}
          >
            <SettingsIcon />
          </IconButton>
          <IconButton
            label="Tastenkürzel"
            onClick={() => {
              setShortcutsOpen(true);
            }}
          >
            <KeyboardIcon />
          </IconButton>
          {fullscreenSupported && (
            <IconButton
              label="Vollbild"
              tooltip={fullscreen ? "Vollbild beenden" : "Vollbild"}
              pressed={fullscreen}
              onClick={toggleFullscreen}
            >
              {fullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
            </IconButton>
          )}
        </div>
      </header>
      <main className={styles.stage}>
        <FrontPanel
          state={state}
          feuerwehrname={names.feuerwehrname}
          dispatch={dispatch}
          onTallyDropped={tapTallyById}
        />
        <TallyRoster
          state={state}
          vehicles={names.vehicles}
          onTallyTapped={tapTally}
        />
      </main>
      <Footer />
      {!firstLaunchDone && (
        <FirstLaunchDialog names={names} onConfirm={setNames} />
      )}
      {sessionChoicePending && (
        <SessionChoiceDialog
          onResume={resumeSession}
          onDiscard={discardSession}
        />
      )}
      {settingsOpen && (
        <Settings
          names={names}
          onNamed={setNames}
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
    </div>
  );
}

import { useCallback } from "react";
import { alarmCycleMs, isAlarmSounding } from "../core/index";
import type { Key } from "../core/index";
import { ROSTER, tallyHeld } from "../world/index";
import type { RosterTally } from "../world/index";
import { ClockControls } from "./ClockControls";
import { FrontPanel } from "./FrontPanel";
import { MuteToggle } from "./MuteToggle";
import { TallyRoster } from "./TallyRoster";
import { useKeyMap } from "./use-key-map";
import { useSiren } from "./use-siren";
import { useSimulator } from "./use-simulator";
import styles from "./App.module.css";

export function App() {
  const { state, dispatch, clock, pause, play, setSpeed, muted, toggleMute } =
    useSimulator();
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
        dispatch(tallyHeld(tally));
      }
    },
    [dispatch],
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
  useKeyMap({
    onKeyPressed: pressKey,
    onKeyReleased: releaseKey,
    onTallyKeyPressed: tapTallyAt,
  });

  return (
    <main className={styles.app}>
      <ClockControls
        clock={clock}
        onPause={pause}
        onPlay={play}
        onSpeedChosen={setSpeed}
      />
      <MuteToggle muted={muted} onToggle={toggleMute} />
      <div className={styles.stage}>
        <FrontPanel
          state={state}
          dispatch={dispatch}
          onTallyDropped={tapTallyById}
        />
        <TallyRoster state={state} onTallyTapped={tapTally} />
      </div>
    </main>
  );
}

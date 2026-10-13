import { useCallback } from "react";
import type { Key } from "../core/index";
import { ROSTER, tallyHeld } from "../world/index";
import type { RosterTally } from "../world/index";
import { ClockControls } from "./ClockControls";
import { FrontPanel } from "./FrontPanel";
import { TallyRoster } from "./TallyRoster";
import { useKeyMap } from "./use-key-map";
import { useSimulator } from "./use-simulator";
import styles from "./App.module.css";

export function App() {
  const { state, dispatch, clock, pause, play, setSpeed } = useSimulator();
  const pressKey = useCallback(
    (key: Key) => {
      dispatch({ type: "keyPressed", key });
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
  useKeyMap({ onKeyPressed: pressKey, onTallyKeyPressed: tapTallyAt });

  return (
    <main className={styles.app}>
      <ClockControls
        clock={clock}
        onPause={pause}
        onPlay={play}
        onSpeedChosen={setSpeed}
      />
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

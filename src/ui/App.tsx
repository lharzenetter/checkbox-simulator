import { useCallback } from "react";
import type { Key } from "../core/index";
import { ClockControls } from "./ClockControls";
import { FrontPanel } from "./FrontPanel";
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
  useKeyMap(pressKey);

  return (
    <main className={styles.app}>
      <ClockControls
        clock={clock}
        onPause={pause}
        onPlay={play}
        onSpeedChosen={setSpeed}
      />
      <FrontPanel state={state} dispatch={dispatch} />
    </main>
  );
}

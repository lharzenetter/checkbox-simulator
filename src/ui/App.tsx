import { useCallback } from "react";
import type { Key } from "../core/index";
import { FrontPanel } from "./FrontPanel";
import { useKeyMap } from "./use-key-map";
import { useSimulator } from "./use-simulator";
import styles from "./App.module.css";

export function App() {
  const { state, dispatch } = useSimulator();
  const pressKey = useCallback(
    (key: Key) => {
      dispatch({ type: "keyPressed", key });
    },
    [dispatch],
  );
  useKeyMap(pressKey);

  return (
    <main className={styles.app}>
      <FrontPanel state={state} dispatch={dispatch} />
    </main>
  );
}

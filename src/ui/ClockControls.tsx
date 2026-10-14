import { SPEEDS } from "../world/index";
import type { SimulationClock, Speed } from "../world/index";
import { clockKeyShortcutFor } from "./keyboard-bindings";
import styles from "./ClockControls.module.css";

export function ClockControls({
  clock,
  onPause,
  onPlay,
  onSpeedChosen,
}: {
  clock: SimulationClock;
  onPause: () => void;
  onPlay: () => void;
  onSpeedChosen: (speed: Speed) => void;
}) {
  return (
    <section className={styles.controls} aria-label="Zeitsteuerung">
      <button
        type="button"
        className={styles.playPause}
        aria-keyshortcuts={clockKeyShortcutFor("togglePause")}
        onClick={clock.paused ? onPlay : onPause}
      >
        {clock.paused ? "▶ Weiter" : "❚❚ Pause"}
      </button>
      <div
        className={styles.speeds}
        role="group"
        aria-label="Geschwindigkeit"
        aria-keyshortcuts={`${clockKeyShortcutFor("faster")} ${clockKeyShortcutFor("slower")}`}
      >
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            className={styles.speed}
            aria-pressed={clock.speed === speed}
            disabled={clock.paused}
            onClick={() => {
              onSpeedChosen(speed);
            }}
          >
            {speed}×
          </button>
        ))}
      </div>
      {clock.paused && <p className={styles.status}>Simulation pausiert</p>}
    </section>
  );
}

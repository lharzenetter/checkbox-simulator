import { SPEEDS } from "../world/index";
import type { SimulationClock, Speed } from "../world/index";
import { IconButton } from "./IconButton";
import { PauseIcon, PlayIcon } from "./Icons";
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
      <IconButton
        label={clock.paused ? "Weiter" : "Pause"}
        keyShortcuts={clockKeyShortcutFor("togglePause")}
        onClick={clock.paused ? onPlay : onPause}
      >
        {clock.paused ? <PlayIcon /> : <PauseIcon />}
      </IconButton>
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

import type { PointerEvent, MouseEvent, ReactNode } from "react";
import type { Event, Key, State } from "../core/index";
import { Lcd } from "./Lcd";
import styles from "./FrontPanel.module.css";

export function FrontPanel({
  state,
  dispatch,
}: {
  state: State;
  dispatch: (event: Event) => void;
}) {
  function press(key: Key): void {
    dispatch({ type: "keyPressed", key });
  }

  return (
    <section className={styles.housing} aria-label="Checkbox 5+1">
      <div className={styles.faceplate}>
        <header className={styles.band}>
          <span
            className={styles.led}
            role="status"
            aria-label="Alarm-LED aus"
            data-lit="false"
          />
          <span className={styles.brand}>CHECKBOX 5+1</span>
        </header>
        <div className={styles.lcdWindow}>
          <Lcd state={state} />
        </div>
        <div className={styles.keypad}>
          <DeviceKey keyName="Up" className={styles.up} onPress={press}>
            <Chevron direction="up" />
          </DeviceKey>
          <DeviceKey keyName="X" className={styles.x} onPress={press}>
            C<span className={styles.cross}>×</span>
          </DeviceKey>
          <DeviceKey keyName="OK" className={styles.ok} onPress={press}>
            OK
          </DeviceKey>
          <DeviceKey keyName="Down" className={styles.down} onPress={press}>
            <Chevron direction="down" />
          </DeviceKey>
          <DeviceKey keyName="Check" className={styles.check} onPress={press}>
            CHECK
          </DeviceKey>
        </div>
      </div>
    </section>
  );
}

// Keys act on pointer-down like a physical key. A click with `detail === 0` comes from the
// keyboard (Enter or Space on a focused key), so the key stays operable without a pointer.
function DeviceKey({
  keyName,
  className,
  onPress,
  children,
}: {
  keyName: Key;
  className: string | undefined;
  onPress: (key: Key) => void;
  children: ReactNode;
}) {
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>): void {
    if (event.button === 0) {
      onPress(keyName);
    }
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    if (event.detail === 0) {
      onPress(keyName);
    }
  }

  return (
    <button
      type="button"
      className={`${styles.key ?? ""} ${className ?? ""}`}
      aria-label={`Taste ${keyName}`}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

function Chevron({ direction }: { direction: "up" | "down" }) {
  return (
    <svg viewBox="0 0 40 24" className={styles.chevron} aria-hidden="true">
      <polyline
        points={direction === "up" ? "4,20 20,4 36,20" : "4,4 20,20 36,4"}
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

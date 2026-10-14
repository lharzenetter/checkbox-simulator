import type { DragEvent, PointerEvent, MouseEvent, ReactNode } from "react";
import { isAlarmLedLit, isAlarmSounding } from "../core/index";
import type { Event, Key, State } from "../core/index";
import { keyShortcutsFor } from "./keyboard-bindings";
import { Lcd } from "./Lcd";
import { TALLY_DRAG_TYPE } from "./TallyRoster";
import styles from "./FrontPanel.module.css";

export function FrontPanel({
  state,
  feuerwehrname,
  dispatch,
  onTallyDropped,
}: {
  state: State;
  feuerwehrname: string;
  dispatch: (event: Event) => void;
  onTallyDropped: (tallyId: string) => void;
}) {
  function press(key: Key): void {
    dispatch({ type: "keyPressed", key });
  }

  function release(key: Key): void {
    dispatch({ type: "keyReleased", key });
  }

  return (
    <section
      className={styles.housing}
      aria-label="Checkbox 5+1"
      data-front-panel
    >
      <div className={styles.faceplate}>
        <header className={styles.band}>
          <span
            className={styles.led}
            role="status"
            aria-label={
              isAlarmSounding(state) ? "Alarm-LED blinkt" : "Alarm-LED aus"
            }
            data-lit={isAlarmLedLit(state)}
          />
          <span className={styles.brand}>CHECKBOX 5+1</span>
        </header>
        <div className={styles.lcdWindow}>
          <Lcd state={state} feuerwehrname={feuerwehrname} />
        </div>
        <div className={styles.keypad}>
          <DeviceKey
            keyName="Up"
            className={styles.up}
            onPress={press}
            onRelease={release}
          >
            <Chevron direction="up" />
          </DeviceKey>
          <DeviceKey
            keyName="X"
            className={styles.x}
            onPress={press}
            onRelease={release}
          >
            C<span className={styles.cross}>×</span>
          </DeviceKey>
          <DeviceKey
            keyName="OK"
            className={styles.ok}
            onPress={press}
            onRelease={release}
          >
            OK
          </DeviceKey>
          <DeviceKey
            keyName="Down"
            className={styles.down}
            onPress={press}
            onRelease={release}
          >
            <Chevron direction="down" />
          </DeviceKey>
          <DeviceKey
            keyName="Check"
            className={styles.check}
            onPress={press}
            onRelease={release}
            onTallyDropped={onTallyDropped}
          >
            CHECK
          </DeviceKey>
        </div>
      </div>
    </section>
  );
}

// Keys act on pointer-down like a physical key and are held until that pointer lifts or slides
// off, so two fingers can hold X and Check together for the Notausschaltung. A click with `detail === 0`
// comes from assistive technology, so the key stays operable without a pointer; it is pressed
// and released at once. A key never takes focus, neither from Tab nor from a press: the keyboard
// bindings already press it, and a focused key would only show a stray focus ring.
// Dropping a dragged Tally on a key taps it there; only Check accepts one, decided in "Design
// how the Trainee handles Tallys and the clock".
function DeviceKey({
  keyName,
  className,
  onPress,
  onRelease,
  onTallyDropped,
  children,
}: {
  keyName: Key;
  className: string | undefined;
  onPress: (key: Key) => void;
  onRelease: (key: Key) => void;
  onTallyDropped?: (tallyId: string) => void;
  children: ReactNode;
}) {
  function handleDragOver(event: DragEvent<HTMLButtonElement>): void {
    if (event.dataTransfer.types.includes(TALLY_DRAG_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>): void {
    const tallyId = event.dataTransfer.getData(TALLY_DRAG_TYPE);
    if (tallyId !== "") {
      event.preventDefault();
      onTallyDropped?.(tallyId);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>): void {
    if (event.button === 0) {
      onPress(keyName);
    }
  }

  function handlePointerUp(): void {
    onRelease(keyName);
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    if (event.detail === 0) {
      onPress(keyName);
      onRelease(keyName);
    }
  }

  return (
    <button
      type="button"
      className={`${styles.key ?? ""} ${className ?? ""}`}
      aria-label={`Taste ${keyName}`}
      aria-keyshortcuts={keyShortcutsFor(keyName)}
      tabIndex={-1}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={handleClick}
      {...(onTallyDropped && {
        onDragOver: handleDragOver,
        onDrop: handleDrop,
      })}
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

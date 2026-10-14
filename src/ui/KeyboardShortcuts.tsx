import {
  CLOCK_KEY_BINDINGS,
  DEVICE_KEY_BINDINGS,
  TALLY_KEY_COUNT,
} from "./keyboard-bindings";
import { ModalBody, ModalDialog, ModalFooter } from "./ModalDialog";
import styles from "./KeyboardShortcuts.module.css";

export function KeyboardShortcuts({ onClose }: { onClose: () => void }) {
  return (
    <ModalDialog title="Tastenkürzel" onCancel={onClose}>
      <ModalBody>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Taste</th>
              <th scope="col">Tastatur</th>
            </tr>
          </thead>
          <tbody>
            {DEVICE_KEY_BINDINGS.map((binding) => (
              <tr key={binding.key}>
                <th scope="row">{binding.key}</th>
                <td>
                  {binding.keyboardKeys.map((keyboardKey, index) => (
                    <span key={keyboardKey.eventKey}>
                      {index > 0 && " oder "}
                      <kbd className={styles.kbd}>{keyboardKey.label}</kbd>
                    </span>
                  ))}
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Tally antippen, Fahrzeug 1–2</th>
              <td>
                <kbd className={styles.kbd}>1</kbd>–
                <kbd className={styles.kbd}>{TALLY_KEY_COUNT}</kbd>
              </td>
            </tr>
            <tr>
              <th scope="row">Tally antippen, Fahrzeug 3–4</th>
              <td>
                <kbd className={styles.kbd}>⇧</kbd> +{" "}
                <kbd className={styles.kbd}>1</kbd>–
                <kbd className={styles.kbd}>{TALLY_KEY_COUNT}</kbd>
              </td>
            </tr>
          </tbody>
        </table>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Zeitsteuerung</th>
              <th scope="col">Tastatur</th>
            </tr>
          </thead>
          <tbody>
            {CLOCK_KEY_BINDINGS.map((binding) => (
              <tr key={binding.action}>
                <th scope="row">{binding.label}</th>
                <td>
                  <kbd className={styles.kbd}>{binding.keyboardKey.label}</kbd>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ModalBody>
      <ModalFooter>
        <button type="button" className={styles.close} onClick={onClose}>
          Schließen
        </button>
      </ModalFooter>
    </ModalDialog>
  );
}

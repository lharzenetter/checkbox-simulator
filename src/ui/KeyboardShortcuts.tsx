import { DEVICE_KEY_BINDINGS, TALLY_KEY_COUNT } from "./keyboard-bindings";
import { ModalDialog } from "./ModalDialog";
import styles from "./KeyboardShortcuts.module.css";

export function KeyboardShortcuts({ onClose }: { onClose: () => void }) {
  return (
    <ModalDialog title="Tastenkürzel" onCancel={onClose}>
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
            <th scope="row">Tally antippen</th>
            <td>
              <kbd className={styles.kbd}>1</kbd>–
              <kbd className={styles.kbd}>{TALLY_KEY_COUNT}</kbd>
            </td>
          </tr>
        </tbody>
      </table>
      <button type="button" className={styles.close} onClick={onClose}>
        Schließen
      </button>
    </ModalDialog>
  );
}

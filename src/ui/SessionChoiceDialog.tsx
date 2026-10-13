import { ModalDialog } from "./ModalDialog";
import styles from "./SessionChoiceDialog.module.css";

// Decided in "Decide what survives a page reload". The "fortsetzen" click is also the gesture
// that unlocks audio ("Decide how alarms are presented", point 7), which `useSiren` hears on the
// window.
export function SessionChoiceDialog({
  onResume,
  onDiscard,
}: {
  onResume: () => void;
  onDiscard: () => void;
}) {
  return (
    <ModalDialog title="Laufenden Einsatz fortsetzen?">
      <p>
        Vor dem Neuladen lief noch ein Einsatz. Beim Fortsetzen geht es
        angehalten an derselben Stelle weiter. Beim Verwerfen werden die
        angemeldeten Trupps ohne Einsatzprotokoll gelöscht; die Fahrzeugnamen
        und Einsatzprotokolle bleiben erhalten.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.choice} onClick={onResume}>
          Fortsetzen
        </button>
        <button type="button" className={styles.choice} onClick={onDiscard}>
          Verwerfen
        </button>
      </div>
    </ModalDialog>
  );
}

import { useState } from "react";
import { ModalDialog } from "./ModalDialog";
import { NamesForm } from "./NamesForm";
import type { Names } from "./use-simulator";
import styles from "./Settings.module.css";

export function Settings({
  names,
  onNamed,
  onFactoryReset,
  onClose,
}: {
  names: Names;
  onNamed: (names: Names) => void;
  onFactoryReset: () => void;
  onClose: () => void;
}) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  if (confirmingReset) {
    return (
      <ModalDialog
        title="Auf Werkszustand zurücksetzen?"
        onCancel={() => {
          setConfirmingReset(false);
        }}
      >
        <p>
          Der Feuerwehrname, die Namen der Fahrzeuge, die Einsatzprotokolle, die
          Stummschaltung und der laufende Einsatz werden gelöscht.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.danger}
            onClick={onFactoryReset}
          >
            Zurücksetzen
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              setConfirmingReset(false);
            }}
          >
            Abbrechen
          </button>
        </div>
      </ModalDialog>
    );
  }

  return (
    <ModalDialog title="Einstellungen" onCancel={onClose}>
      <NamesForm
        initialNames={names}
        submitLabel="Speichern"
        onSubmit={(named) => {
          onNamed(named);
          onClose();
        }}
      >
        <button type="button" className={styles.secondary} onClick={onClose}>
          Abbrechen
        </button>
      </NamesForm>
      <section className={styles.reset} aria-label="Werkszustand">
        <button
          type="button"
          className={styles.danger}
          onClick={() => {
            setConfirmingReset(true);
          }}
        >
          Auf Werkszustand zurücksetzen
        </button>
      </section>
    </ModalDialog>
  );
}

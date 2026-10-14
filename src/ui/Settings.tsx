import { useState } from "react";
import type { State } from "../core/index";
import { ModalBody, ModalDialog, ModalFooter } from "./ModalDialog";
import { NamesForm } from "./NamesForm";
import type { Names } from "./use-simulator";
import styles from "./Settings.module.css";

export function Settings({
  names,
  state,
  onNamed,
  onFactoryReset,
  onClose,
}: {
  names: Names;
  state: State;
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
        <ModalBody>
          <p>
            Der Feuerwehrname, die Fahrzeuge, die Einsatzprotokolle, die
            Stummschaltung und der laufende Einsatz werden gelöscht.
          </p>
        </ModalBody>
        <ModalFooter>
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
        </ModalFooter>
      </ModalDialog>
    );
  }

  return (
    <ModalDialog title="Einstellungen" onCancel={onClose}>
      <NamesForm
        initialNames={names}
        state={state}
        submitLabel="Speichern"
        onSubmit={(named) => {
          onNamed(named);
          onClose();
        }}
        appendix={
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
        }
      >
        <button type="button" className={styles.secondary} onClick={onClose}>
          Abbrechen
        </button>
      </NamesForm>
    </ModalDialog>
  );
}

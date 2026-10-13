import { useState } from "react";
import type { Vehicles } from "../world/index";
import { ModalDialog } from "./ModalDialog";
import { VehicleNamesForm } from "./VehicleNamesForm";
import styles from "./Settings.module.css";

export function Settings({
  vehicles,
  onVehiclesNamed,
  onFactoryReset,
  onClose,
}: {
  vehicles: Vehicles;
  onVehiclesNamed: (vehicles: Vehicles) => void;
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
          Die Namen der Fahrzeuge, die Einsatzprotokolle, die Stummschaltung und
          der laufende Einsatz werden gelöscht.
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
      <VehicleNamesForm
        initialVehicles={vehicles}
        submitLabel="Speichern"
        onSubmit={(named) => {
          onVehiclesNamed(named);
          onClose();
        }}
      >
        <button type="button" className={styles.secondary} onClick={onClose}>
          Abbrechen
        </button>
      </VehicleNamesForm>
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

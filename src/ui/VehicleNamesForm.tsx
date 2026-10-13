import { useState } from "react";
import type { ReactNode, SyntheticEvent } from "react";
import { isValidVehicle, KURZNAME_MAX_LENGTH } from "../world/index";
import type { Vehicle, Vehicles } from "../world/index";
import styles from "./VehicleNamesForm.module.css";

export function VehicleNamesForm({
  initialVehicles,
  submitLabel,
  onSubmit,
  children,
}: {
  initialVehicles: Vehicles;
  submitLabel: string;
  onSubmit: (vehicles: Vehicles) => void;
  // Further buttons next to the submit button.
  children?: ReactNode;
}) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const allValid = vehicles.every(isValidVehicle);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (allValid) {
      onSubmit(vehicles);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {vehicles.map((vehicle, index) => (
        <VehicleFields
          key={index}
          legend={`Fahrzeug ${String(index + 1)}`}
          vehicle={vehicle}
          onChange={(changed) => {
            setVehicles((current) =>
              index === 0 ? [changed, current[1]] : [current[0], changed],
            );
          }}
        />
      ))}
      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={!allValid}>
          {submitLabel}
        </button>
        {children}
      </div>
    </form>
  );
}

function VehicleFields({
  legend,
  vehicle,
  onChange,
}: {
  legend: string;
  vehicle: Vehicle;
  onChange: (vehicle: Vehicle) => void;
}) {
  const valid = isValidVehicle(vehicle);
  return (
    <fieldset className={styles.vehicle}>
      <legend>{legend}</legend>
      <label className={styles.field}>
        Funkrufname
        <input
          className={styles.input}
          value={vehicle.funkrufname}
          required
          onChange={(event) => {
            onChange({ ...vehicle, funkrufname: event.target.value });
          }}
        />
      </label>
      <label className={styles.field}>
        Kurzname
        <input
          className={styles.input}
          value={vehicle.kurzname}
          required
          maxLength={KURZNAME_MAX_LENGTH}
          onChange={(event) => {
            onChange({ ...vehicle, kurzname: event.target.value });
          }}
        />
      </label>
      {!valid && (
        <p className={styles.problem} role="alert">
          Bitte einen Funkrufnamen und einen Kurznamen mit höchstens{" "}
          {KURZNAME_MAX_LENGTH} Zeichen angeben, die das Display zeigen kann.
        </p>
      )}
    </fieldset>
  );
}

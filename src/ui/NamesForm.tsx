import { useState } from "react";
import type { ReactNode, SyntheticEvent } from "react";
import { FEUERWEHRNAME_MAX_LENGTH, isValidFeuerwehrname } from "../core/index";
import { isValidVehicle, KURZNAME_MAX_LENGTH } from "../world/index";
import type { Vehicle } from "../world/index";
import type { Names } from "./use-simulator";
import styles from "./NamesForm.module.css";

export function NamesForm({
  initialNames,
  submitLabel,
  onSubmit,
  children,
}: {
  initialNames: Names;
  submitLabel: string;
  onSubmit: (names: Names) => void;
  // Further buttons next to the submit button.
  children?: ReactNode;
}) {
  const [feuerwehrname, setFeuerwehrname] = useState(
    initialNames.feuerwehrname,
  );
  const [vehicles, setVehicles] = useState(initialNames.vehicles);
  const feuerwehrnameValid = isValidFeuerwehrname(feuerwehrname);
  const allValid = feuerwehrnameValid && vehicles.every(isValidVehicle);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (allValid) {
      onSubmit({ feuerwehrname, vehicles });
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        Feuerwehrname
        <input
          className={styles.input}
          value={feuerwehrname}
          required
          maxLength={FEUERWEHRNAME_MAX_LENGTH}
          onChange={(event) => {
            setFeuerwehrname(event.target.value);
          }}
        />
      </label>
      {!feuerwehrnameValid && (
        <p className={styles.problem} role="alert">
          Bitte einen Feuerwehrnamen mit höchstens {FEUERWEHRNAME_MAX_LENGTH}{" "}
          Zeichen angeben, die das Display zeigen kann.
        </p>
      )}
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

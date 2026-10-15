import { useId, useState } from "react";
import type { ReactNode, SyntheticEvent } from "react";
import { FEUERWEHRNAME_MAX_LENGTH, isValidFeuerwehrname } from "../core/index";
import type { State } from "../core/index";
import {
  addFahrzeug,
  canAddFahrzeug,
  hasDuplicateKurzname,
  isValidFahrzeug,
  isValidRoster,
  KURZNAME_MAX_LENGTH,
  MAX_FAHRZEUGE,
  removalBlocker,
  removeFahrzeug,
} from "../world/index";
import type { Fahrzeug, RemovalBlocker } from "../world/index";
import { ModalBody, ModalFooter } from "./ModalDialog";
import type { Names } from "./use-simulator";
import styles from "./NamesForm.module.css";

// The body and footer of a dialog. The submit button sits in the footer, outside the scrolling
// form, and joins it through its `form` attribute.
// Decided in "Let the Trainee add and remove Fahrzeuge", point 5: nothing applies before the
// submit button, so adding and removing need no confirmation.
export function NamesForm({
  initialNames,
  state,
  submitLabel,
  onSubmit,
  intro,
  extraFields,
  appendix,
  children,
}: {
  initialNames: Names;
  // The running session, which decides whether a Fahrzeug is in use.
  state: State;
  submitLabel: string;
  onSubmit: (names: Names) => void;
  // Content above the fields.
  intro?: ReactNode;
  // Further fields, submitted with the names.
  extraFields?: ReactNode;
  // Content below the form.
  appendix?: ReactNode;
  // Further buttons next to the submit button.
  children?: ReactNode;
}) {
  const [feuerwehrname, setFeuerwehrname] = useState(
    initialNames.feuerwehrname,
  );
  const [fahrzeuge, setFahrzeuge] = useState(initialNames.fahrzeuge);
  const feuerwehrnameValid = isValidFeuerwehrname(feuerwehrname);
  const allValid = feuerwehrnameValid && isValidRoster(fahrzeuge);
  const formId = useId();

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (allValid) {
      onSubmit({ feuerwehrname, fahrzeuge });
    }
  }

  return (
    <>
      <ModalBody>
        {intro}
        <form id={formId} className={styles.form} onSubmit={handleSubmit}>
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
              Bitte einen Feuerwehrnamen mit höchstens{" "}
              {FEUERWEHRNAME_MAX_LENGTH} Zeichen angeben, die das Display zeigen
              kann.
            </p>
          )}
          {fahrzeuge.map((fahrzeug, index) => (
            <FahrzeugFields
              key={fahrzeug.id}
              legend={`Fahrzeug ${String(index + 1)}`}
              fahrzeug={fahrzeug}
              duplicateKurzname={hasDuplicateKurzname(fahrzeuge, fahrzeug)}
              removalBlocker={removalBlocker(state, fahrzeuge, fahrzeug.id)}
              onChange={(changed) => {
                setFahrzeuge((current) =>
                  current.map((candidate) =>
                    candidate.id === changed.id ? changed : candidate,
                  ),
                );
              }}
              onRemove={() => {
                setFahrzeuge((current) => removeFahrzeug(current, fahrzeug.id));
              }}
            />
          ))}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={!canAddFahrzeug(fahrzeuge)}
              onClick={() => {
                setFahrzeuge(addFahrzeug);
              }}
            >
              Fahrzeug hinzufügen
            </button>
            {!canAddFahrzeug(fahrzeuge) && (
              <p className={styles.note}>
                Höchstens {MAX_FAHRZEUGE} Fahrzeuge.
              </p>
            )}
          </div>
          {extraFields}
        </form>
        {appendix}
      </ModalBody>
      <ModalFooter>
        <button
          type="submit"
          form={formId}
          className={styles.button}
          disabled={!allValid}
        >
          {submitLabel}
        </button>
        {children}
      </ModalFooter>
    </>
  );
}

const REMOVAL_BLOCKER_NOTES: Readonly<Record<RemovalBlocker, string>> = {
  lastFahrzeug: "Mindestens ein Fahrzeug muss bleiben.",
  inUse:
    "Atemschutzträger dieses Fahrzeugs sind angemeldet oder werden gerade angemeldet.",
};

function FahrzeugFields({
  legend,
  fahrzeug,
  duplicateKurzname,
  removalBlocker,
  onChange,
  onRemove,
}: {
  legend: string;
  fahrzeug: Fahrzeug;
  duplicateKurzname: boolean;
  removalBlocker: RemovalBlocker | undefined;
  onChange: (fahrzeug: Fahrzeug) => void;
  onRemove: () => void;
}) {
  const valid = isValidFahrzeug(fahrzeug);
  return (
    <fieldset className={styles.fahrzeug}>
      <legend>{legend}</legend>
      <label className={styles.field}>
        Funkrufname
        <input
          className={styles.input}
          value={fahrzeug.funkrufname}
          required
          onChange={(event) => {
            onChange({ ...fahrzeug, funkrufname: event.target.value });
          }}
        />
      </label>
      <label className={styles.field}>
        Kurzname
        <input
          className={styles.input}
          value={fahrzeug.kurzname}
          required
          maxLength={KURZNAME_MAX_LENGTH}
          aria-invalid={!valid || duplicateKurzname}
          onChange={(event) => {
            onChange({ ...fahrzeug, kurzname: event.target.value });
          }}
        />
      </label>
      {!valid && (
        <p className={styles.problem} role="alert">
          Bitte einen Funkrufnamen und einen Kurznamen mit höchstens{" "}
          {KURZNAME_MAX_LENGTH} Zeichen angeben, die das Display zeigen kann.
        </p>
      )}
      {valid && duplicateKurzname && (
        <p className={styles.problem} role="alert">
          Kurzname bereits vergeben
        </p>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={removalBlocker !== undefined}
          onClick={onRemove}
        >
          Fahrzeug entfernen
        </button>
        {removalBlocker !== undefined && (
          <p className={styles.note}>{REMOVAL_BLOCKER_NOTES[removalBlocker]}</p>
        )}
      </div>
    </fieldset>
  );
}

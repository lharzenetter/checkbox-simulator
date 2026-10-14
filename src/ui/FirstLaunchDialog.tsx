import type { State } from "../core/index";
import { ModalDialog } from "./ModalDialog";
import { NamesForm } from "./NamesForm";
import type { Names } from "./use-simulator";

// Decided in "Decide the contents of the fixed Tally roster": one click on the prefilled
// defaults is enough. Its click is also the gesture that unlocks audio ("Decide how alarms are
// presented", point 7), which `useSiren` hears on the window.
export function FirstLaunchDialog({
  names,
  state,
  onConfirm,
}: {
  names: Names;
  state: State;
  onConfirm: (names: Names) => void;
}) {
  return (
    <ModalDialog title="Willkommen beim Checkbox-Simulator">
      <p>
        Wie heißen deine Feuerwehr und ihre Fahrzeuge? Der Feuerwehrname steht
        oben auf dem Display der Checkbox, der Funkrufname bei den
        Atemschutzträgern, der Kurzname auf dem Display. Bis zu vier Fahrzeuge
        sind möglich. Alles lässt sich später in den Einstellungen ändern.
      </p>
      <NamesForm
        initialNames={names}
        state={state}
        submitLabel="Übernehmen"
        onSubmit={onConfirm}
      />
    </ModalDialog>
  );
}

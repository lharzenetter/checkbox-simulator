import { ModalDialog } from "./ModalDialog";
import { NamesForm } from "./NamesForm";
import type { Names } from "./use-simulator";

// Decided in "Decide the contents of the fixed Tally roster": one click on the prefilled
// defaults is enough. Its click is also the gesture that unlocks audio ("Decide how alarms are
// presented", point 7), which `useSiren` hears on the window.
export function FirstLaunchDialog({
  names,
  onConfirm,
}: {
  names: Names;
  onConfirm: (names: Names) => void;
}) {
  return (
    <ModalDialog title="Willkommen beim Checkbox-Simulator">
      <p>
        Wie heißen deine Feuerwehr und die beiden Fahrzeuge? Der Feuerwehrname
        steht oben auf dem Display der Checkbox, der Funkrufname bei den
        Atemschutzträgern, der Kurzname auf dem Display. Alles lässt sich später
        in den Einstellungen ändern.
      </p>
      <NamesForm
        initialNames={names}
        submitLabel="Übernehmen"
        onSubmit={onConfirm}
      />
    </ModalDialog>
  );
}

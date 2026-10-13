import type { Vehicles } from "../world/index";
import { ModalDialog } from "./ModalDialog";
import { VehicleNamesForm } from "./VehicleNamesForm";

// Decided in "Decide the contents of the fixed Tally roster": one click on the prefilled
// defaults is enough. Its click is also the gesture that unlocks audio ("Decide how alarms are
// presented", point 7), which `useSiren` hears on the window.
export function FirstLaunchDialog({
  vehicles,
  onConfirm,
}: {
  vehicles: Vehicles;
  onConfirm: (vehicles: Vehicles) => void;
}) {
  return (
    <ModalDialog title="Willkommen beim Checkbox-Simulator">
      <p>
        Wie heißen die beiden Fahrzeuge? Der Funkrufname steht bei den
        Atemschutzträgern, der Kurzname auf dem Display der Checkbox. Beides
        lässt sich später in den Einstellungen ändern.
      </p>
      <VehicleNamesForm
        initialVehicles={vehicles}
        submitLabel="Übernehmen"
        onSubmit={onConfirm}
      />
    </ModalDialog>
  );
}

import { useEffect, useState } from "react";
import { createSiren } from "../audio/index";

// Decided in "Decide how alarms are presented", point 7: audio unlocks on the first gesture.
export function useSiren(sounding: boolean): void {
  const [siren] = useState(createSiren);

  useEffect(() => {
    function unlock(): void {
      siren.unlock();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [siren]);

  useEffect(() => {
    siren.setSounding(sounding);
  }, [siren, sounding]);
}

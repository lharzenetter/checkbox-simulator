import { powerOn } from "../recipes";
import { scenario } from "../scenario";

// manual 5.2, Startdisplay figure; manual 5.12: Aus shows a blank display
scenario(
  "Check wakes the Checkbox from Display aus to the Startdisplay",
  async (window) => {
    await window.see.lcd().isOff();

    await powerOn(window);

    await window.see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "V04.02.23  #12345",
        "B1- + 88%",
        "12.04.17     11:11:00",
        "OK für SERVICE",
        "oder TALLY auflegen",
        "sonst Ende in  >  25",
      ]);
  },
);

import { scenario } from "../scenario";

// manual 5.3; decided in "Define the key-by-screen navigation model", as amended in "Correct the
// simulator against the real Checkbox": the Trupp-Ansicht comes first
scenario(
  "a Trupp logs in to Anmarsch for 30 min at 300 bar",
  async ({ trainee, see }) => {
    await trainee.holdTally({ fahrzeug: "HLF", role: "Angriffstruppführer" });
    // real-device photo einsatzzeit-waehlen.jpeg
    await see
      .lcd()
      .reads([
        "Neuen Trupp anmelden:",
        "Wähle Einsatzzeit für",
        "Trupp Nr.: 01",
        "*HLF AT-F",
        "Einsatzzeit 30 min?",
        "Einsatzzeit 20 min?",
        "Einsatzzeit 180 min?",
      ]);

    await trainee.press("OK");
    // manual 5.3 step 6, Anmeldefenster figure
    await trainee.holdTally({ fahrzeug: "HLF", role: "Angriffstruppmann" });
    await trainee.holdTally({ fahrzeug: "LF", role: "Angriffstruppführer" });
    await see
      .lcd()
      .reads([
        "Trupp 01   30 min",
        "*HLF AT-F",
        "*HLF AT-M",
        "*LF AT-F",
        "Trupp OK Einsatz",
        "Trupp OK Bereitschaft",
        "Sicherheitstrupp OK",
        "Druck ändern",
      ]);

    await trainee.press("OK");
    // manual 5.3, S06 figure
    await see
      .lcd()
      .reads([
        "Trupp Nr.: 01",
        "Flasche: 300 bar",
        "Druck 300 bar",
        "Restzeit 00:30:00",
      ]);

    await trainee.press("OK");
    await see
      .lcd()
      .reads([
        "Trupp 01 ANMARSCH",
        "Personen-Anzahl: 3",
        "Druck 300 bar",
        "Restzeit 00:30:00",
        "Rückzugsdruck 50 bar",
        "Ansicht",
      ]);

    // manual 5.3, Einsatzliste figure with one Trupp
    await trainee.press("X");
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:11:00",
        "01 markiert  3× Anmarsch  00:30:00",
      ]);
    await see.alarmLed().isOff();
  },
);

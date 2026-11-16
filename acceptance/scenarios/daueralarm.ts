import { logIn } from "../recipes";
import { scenario } from "../scenario";
import type { TallyName, Window } from "../window";

const HLF_AT_F: TallyName = { fahrzeug: "HLF", role: "Angriffstruppführer" };
const HLF_AT_M: TallyName = { fahrzeug: "HLF", role: "Angriffstruppmann" };
const LF_AT_F: TallyName = { fahrzeug: "LF", role: "Angriffstruppführer" };
const LF_AT_M: TallyName = { fahrzeug: "LF", role: "Angriffstruppmann" };

// ABMELDEN starts from the Einsatzliste rather than the Trupp-Ansicht the login ends on.
async function truppInAnmarsch(window: Window): Promise<void> {
  await logIn(window, [HLF_AT_F, HLF_AT_M]);
  await window.trainee.press("X");
}

// manual 5.8, ABMELDEN figure: a Trupp's two Atemschutzträger, each markiert or not.
function abmelden(
  truppnummer: string,
  atF: string,
  atM: string,
): readonly string[] {
  return [
    `Trupp ${truppnummer} ABMELDEN`,
    atF,
    atM,
    "OK  =  abmelden",
    " X  =  nicht abmelden",
  ];
}

// Trupp 01's logoff Daueralarm: HLF AT-F markiert, HLF AT-M missing, OK.
async function logoffDaueralarm(window: Window): Promise<void> {
  await window.trainee.holdTally(HLF_AT_F);
  await window.trainee.press("OK");
}

// verification-scenarios V18 step 1; timing-and-alarm-rules §7.3: nothing starts it before OK
scenario("ABMELDEN waits without a Daueralarm until OK", async (window) => {
  const { trainee, see } = window;
  await truppInAnmarsch(window);

  await trainee.holdTally(HLF_AT_F);
  await see.lcd().reads(abmelden("01", "*HLF AT-F markiert", "*HLF AT-M"));
  await see.alarmLed().isOff();
});

// verification-scenarios V18 steps 2 and 3; timing-and-alarm-rules §7.3; decided in "Decide when
// a Daueralarm starts and ends": OK never silences a Daueralarm
scenario(
  "OK with an Atemschutzträger missing starts the logoff Daueralarm, and OK does not silence it",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);

    await logoffDaueralarm(window);
    await see.alarmLed().isBlinking();
    await see.lcd().reads(abmelden("01", "*HLF AT-F markiert", "*HLF AT-M"));

    await trainee.press("OK");
    await see.alarmLed().isBlinking();
    await see.lcd().reads(abmelden("01", "*HLF AT-F markiert", "*HLF AT-M"));
  },
);

// verification-scenarios V18 steps 4 and 5; timing-and-alarm-rules §7.4: no auto-logoff
scenario(
  "the last Atemschutzträger markiert stops the logoff Daueralarm, and ABMELDEN waits for OK",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await logoffDaueralarm(window);

    await trainee.holdTally(HLF_AT_M);
    await see.alarmLed().isOff();
    await see
      .lcd()
      .reads(abmelden("01", "*HLF AT-F markiert", "*HLF AT-M markiert"));

    await trainee.press("OK");
    await see.lcd().reads(["FF-Musterstadt", "B1- + 11:11:00"]);
  },
);

// verification-scenarios V18, variants X and OK again after X; timing-and-alarm-rules §7.4
scenario(
  "X stops the logoff Daueralarm with the marks cleared, and OK with someone missing restarts it",
  async (window) => {
    const { trainee, see } = window;
    await truppInAnmarsch(window);
    await logoffDaueralarm(window);

    await trainee.press("X");
    await see.alarmLed().isOff();
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:11:00",
        "01 markiert  2× Anmarsch  00:30:00",
      ]);

    await trainee.holdTally(HLF_AT_M);
    await see.lcd().reads(abmelden("01", "*HLF AT-F", "*HLF AT-M markiert"));
    await trainee.press("OK");
    await see.alarmLed().isBlinking();
  },
);

// verification-scenarios V18, variant time keeps running; timing-and-alarm-rules §7.4; decided in
// "Drop the simulation to real time while an Alarm sounds", points 1 and 3: a Daueralarm drops
// the simulation to 1×, and the speed stays there after it
scenario(
  "the Restzeit runs on at real time while the logoff Daueralarm sounds",
  async (window) => {
    const { trainee, see, time } = window;
    await truppInAnmarsch(window);
    await trainee.setSpeed(10);
    await logoffDaueralarm(window);

    await time.passes({ minutes: 1 });
    await see.alarmLed().isBlinking();
    await trainee.press("X");
    await see
      .lcd()
      .reads([
        "FF-Musterstadt",
        "B1- + 11:12:00",
        "01 markiert  2× Anmarsch  00:29:00",
      ]);

    await time.passes({ seconds: 10 });
    await see.lcd().shows("01 markiert  2× Anmarsch  00:28:50");
  },
);

// verification-scenarios V22; timing-and-alarm-rules §8.2, 8.4; decided in "Decide how alarms are
// presented", points 4 and 5: S12 interrupts ABMELDEN, and the Daueralarm behind it keeps the
// signal running through both OKs
scenario(
  "an Alarm of another Trupp interrupts the logoff Daueralarm, which sounds on behind it",
  async (window) => {
    const { trainee, see, time } = window;
    await truppInAnmarsch(window);
    // 10× keeps the Playwright driver's clock steps few; Trupp 02 logs in at 0:30
    await trainee.setSpeed(10);
    await time.passes({ seconds: 3 });
    await logIn(window, [LF_AT_F, LF_AT_M]);
    await trainee.press("X");

    // 9:30: Trupp 02's logoff Daueralarm, which drops the simulation to 1×
    await time.passes({ seconds: 54 });
    await trainee.holdTally(LF_AT_F);
    await trainee.press("OK");
    await time.passes({ seconds: 23 });
    await see.lcd().reads(abmelden("02", "*LF AT-F markiert", "*LF AT-M"));

    // 9:54: Trupp 01's first Alarmgrenze
    await time.passes({ seconds: 1 });
    await see.lcd().shows("Trupp 01 ALARM 1");
    await see.alarmLed().isBlinking();

    await trainee.press("OK");
    await see.lcd().shows("Trupp 01 ALARM 1");
    await see.alarmLed().isBlinking();

    await trainee.press("OK");
    await see.lcd().reads(abmelden("02", "*LF AT-F markiert", "*LF AT-M"));
    await see.alarmLed().isBlinking();

    await trainee.press("OK");
    await see.alarmLed().isBlinking();
  },
);

// The Anmeldefenster for 30 min with only HLF AT-F joined.
async function anmeldefensterOfOne({ trainee }: Window): Promise<void> {
  await trainee.holdTally(HLF_AT_F);
  await trainee.press("OK");
}

// manual 5.3, Anmeldefenster figure
const ANMELDEFENSTER_OF_ONE = [
  "Trupp 01   30 min",
  "*HLF AT-F",
  "Trupp OK Einsatz",
  "Trupp OK Bereitschaft",
  "Sicherheitstrupp OK",
  "Druck ändern",
];

// real-device photo zu-wenig-einsatzkraefte.jpeg
const ZU_WENIG_EINSATZKRAEFTE = [
  ...ANMELDEFENSTER_OF_ONE,
  "Zu wenig",
  "Einsatzkräfte!",
];

// verification-scenarios V19 steps 1 and 2; manual 9.1 [07]; timing-and-alarm-rules §7.5: the
// box replaced the login Daueralarm ("Correct the simulator against the real Checkbox")
for (const { anmeldeaktion, downs } of [
  { anmeldeaktion: "Trupp OK Einsatz", downs: 0 },
  { anmeldeaktion: "Trupp OK Bereitschaft", downs: 1 },
  { anmeldeaktion: "Sicherheitstrupp OK", downs: 2 },
]) {
  scenario(
    `${anmeldeaktion} with one Atemschutzträger shows Zu wenig Einsatzkräfte! without a Daueralarm`,
    async (window) => {
      const { trainee, see } = window;
      await anmeldefensterOfOne(window);

      for (let down = 0; down < downs; down++) {
        await trainee.press("Down");
      }
      await trainee.press("OK");
      await see.lcd().reads(ZU_WENIG_EINSATZKRAEFTE);
      await see.alarmLed().isOff();
    },
  );
}

// verification-scenarios V19 steps 3 and 4; timing-and-alarm-rules §7.6
scenario(
  "a joining Tally closes Zu wenig Einsatzkräfte!, and the Anmeldefenster waits for OK",
  async (window) => {
    const { trainee, see } = window;
    await anmeldefensterOfOne(window);
    await trainee.press("OK");

    await trainee.holdTally(HLF_AT_M);
    await see
      .lcd()
      .reads([
        "Trupp 01   30 min",
        "*HLF AT-F",
        "*HLF AT-M",
        "Trupp OK Einsatz",
        "Trupp OK Bereitschaft",
        "Sicherheitstrupp OK",
        "Druck ändern",
      ]);
    await see.alarmLed().isOff();

    await trainee.press("OK");
    await trainee.press("OK");
    await see.lcd().shows("Trupp 01 ANMARSCH");
  },
);

// verification-scenarios V19, variant OK; ASSUMPTION: OK closes only the box and keeps the
// members (timing-and-alarm-rules §7.6)
scenario(
  "OK closes only Zu wenig Einsatzkräfte!, and OK with still one Atemschutzträger shows it again",
  async (window) => {
    const { trainee, see } = window;
    await anmeldefensterOfOne(window);
    await trainee.press("OK");

    await trainee.press("OK");
    await see.lcd().reads(ANMELDEFENSTER_OF_ONE);

    await trainee.press("OK");
    await see.lcd().reads(ZU_WENIG_EINSATZKRAEFTE);
  },
);

// verification-scenarios V19, variant X; ASSUMPTION: X closes only the box and keeps the members
// (timing-and-alarm-rules §7.6); decided in "Define the key-by-screen navigation model": X on the
// Anmeldefenster throws the login away and frees its Truppnummer
scenario(
  "X closes only Zu wenig Einsatzkräfte!, and a second X throws the login away",
  async (window) => {
    const { trainee, see } = window;
    await anmeldefensterOfOne(window);
    await trainee.press("OK");

    await trainee.press("X");
    await see.lcd().reads(ANMELDEFENSTER_OF_ONE);

    await trainee.press("X");
    await trainee.holdTally(HLF_AT_M);
    await see.lcd().shows("Trupp Nr.: 01");
    await see.lcd().shows("*HLF AT-M");
  },
);

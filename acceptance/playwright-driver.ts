import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import type { Key } from "../src/core/index";
import { roleCode } from "../src/world/index";
import type { Speed } from "../src/world/index";
import { openSimulator } from "../e2e/first-launch";
import {
  expectAlarmLed,
  expectLcdReads,
  expectLcdShows,
  rosterTally,
  spanMs,
  START_UHRZEIT,
  TICK_MS,
} from "./drivers";
import type { Span, TallyName, Window } from "./window";

// The page renders after each step on its own schedule, so an observation retries until it
// holds. Time is stopped meanwhile, so retrying cannot change what the LCD shows.
const OBSERVATION_TIMEOUT_MS = 5_000;

// Real time the page may take to load and accept the first-launch dialog before the clock stops
// at the START_UHRZEIT; generous, because `pauseAt` cannot go back if a slow CI runner overruns.
const LOAD_MS = 60_000;

/**
 * A fresh simulator in the browser, used through the UI as the Trainee does: first-launch
 * defaults accepted, the default Roster, Checkbox off, real time stopped at 11:11:00 until a
 * step lets it pass. The page must run in the UTC time zone, so the Uhrzeit matches the
 * in-process driver's. Decided in "State use cases as acceptance scenarios with swappable
 * drivers", points 1 and 7.
 */
export async function playwrightWindow(page: Page): Promise<Window> {
  await page.clock.install({ time: START_UHRZEIT - LOAD_MS });
  await openSimulator(page);
  await page.clock.pauseAt(START_UHRZEIT);

  const lcd = page.getByRole("img");
  const alarmLed = page.getByRole("status", { name: /^Alarm-LED/ });

  function keyButton(key: Key): Locator {
    return page.getByRole("button", { name: `Taste ${key}`, exact: true });
  }

  // `fastForward` fires each due animation frame once, where `runFor` would play every frame
  // and take minutes per scenario; steps of one tick land every Alarmgrenze as in-process.
  async function letTimePass(span: Span): Promise<void> {
    for (let leftMs = spanMs(span); leftMs > 0; leftMs -= TICK_MS) {
      await page.clock.fastForward(Math.min(TICK_MS, leftMs));
    }
    await renderSettled(page);
  }

  async function clickIfPresent(button: Locator): Promise<void> {
    if ((await button.count()) > 0) {
      await button.click();
    }
  }

  async function lcdLines(): Promise<readonly string[]> {
    const label = await lcd.getAttribute("aria-label");
    return label === null || label === "Display aus" ? [] : label.split("\n");
  }

  async function ledBlinking(): Promise<boolean> {
    return (await alarmLed.getAttribute("aria-label")) === "Alarm-LED blinkt";
  }

  async function observe(check: () => Promise<void>): Promise<void> {
    await expect(check).toPass({ timeout: OBSERVATION_TIMEOUT_MS });
  }

  return {
    trainee: {
      press: async (key: Key) => {
        await keyButton(key).click();
      },
      hold: async (key: Key, span: Span) => {
        await keyButton(key).hover();
        await page.mouse.down();
        await letTimePass(span);
        await page.mouse.up();
      },
      holdTally: async (tally: TallyName) => {
        const code = roleCode(rosterTally(tally));
        await page
          .getByRole("button", {
            name: `${tally.fahrzeug} ${code} auflegen`,
            exact: true,
          })
          .click();
      },
      // A disabled preset does nothing, as for the Trainee, rather than waiting to be enabled.
      setSpeed: async (speed: Speed) => {
        const preset = page
          .getByRole("group", { name: "Geschwindigkeit" })
          .getByRole("button", { name: `${String(speed)}×`, exact: true });
        if (await preset.isEnabled()) {
          await preset.click();
        }
      },
      // Pause and Weiter share one button, so the one not shown has nothing to do.
      pause: () =>
        clickIfPresent(
          page.getByRole("button", { name: "Pause", exact: true }),
        ),
      play: () =>
        clickIfPresent(
          page.getByRole("button", { name: "Weiter", exact: true }),
        ),
    },
    see: {
      lcd: () => ({
        reads: (lines) =>
          observe(async () => {
            expectLcdReads(await lcdLines(), lines);
          }),
        shows: (line) =>
          observe(async () => {
            expectLcdShows(await lcdLines(), line);
          }),
        isOff: () =>
          observe(async () => {
            expectLcdReads(await lcdLines(), []);
          }),
      }),
      alarmLed: () => ({
        isBlinking: () =>
          observe(async () => {
            expectAlarmLed(await ledBlinking(), true);
          }),
        isOff: () =>
          observe(async () => {
            expectAlarmLed(await ledBlinking(), false);
          }),
      }),
    },
    time: {
      passes: letTimePass,
    },
  };
}

// A tick's render is scheduled through a MessageChannel, which `page.clock` does not fake; a
// message posted after it arrives once that render is done, so an observation that expects no
// change cannot pass on the screen from before the tick.
async function renderSettled(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => {
          resolve();
        };
        channel.port2.postMessage(null);
      }),
  );
}

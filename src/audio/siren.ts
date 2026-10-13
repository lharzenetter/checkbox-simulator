import { ALARM_BLINK_PHASE_MS } from "../core/index";

/** The Checkbox's siren, synthesised with Web Audio. */
export interface Siren {
  /** Creates or resumes the audio output; browsers allow this only inside a user gesture. */
  readonly unlock: () => void;
  /**
   * Starts or stops the wail. `cycleMs` is how far the LED is into its blink cycle, so a wail
   * that starts now runs in step with it. Before {@link Siren.unlock} the siren stays silent.
   */
  readonly setSounding: (sounding: boolean, cycleMs: number) => void;
}

// ASSUMPTION: a synthesised wail stands in until the real device is recorded, as decided in
// "Decide how alarms are presented", point 2; pitch and loudness are not measured.
const WAIL_LOW_HZ = 700;
const WAIL_HIGH_HZ = 1400;
const VOLUME = 0.2;
const RAMP_S = 0.01;
const CYCLE_MS = 2 * ALARM_BLINK_PHASE_MS;
const SWEEP_HARMONICS = 15;

interface Output {
  readonly context: AudioContext;
  readonly sweepDepth: GainNode;
  readonly gain: GainNode;
  sweep: OscillatorNode | null;
}

/** A siren that wails in step with the LED: rising while it is lit, falling while it is dark. */
export function createSiren(): Siren {
  let output: Output | null = null;
  let sounding = false;
  let lastCycleMs = 0;

  function unlock(): void {
    if (output === null) {
      output = createOutput(new AudioContext());
      if (sounding) {
        startWail(output, lastCycleMs);
      }
    }
    void output.context.resume();
  }

  function setSounding(next: boolean, cycleMs: number): void {
    lastCycleMs = cycleMs;
    if (next === sounding) {
      return;
    }
    sounding = next;
    if (output === null) {
      return;
    }
    if (sounding) {
      startWail(output, cycleMs);
    } else {
      stopWail(output);
    }
  }

  return { unlock, setSounding };
}

function createOutput(context: AudioContext): Output {
  const tone = new OscillatorNode(context, {
    type: "square",
    frequency: (WAIL_LOW_HZ + WAIL_HIGH_HZ) / 2,
  });
  const sweepDepth = new GainNode(context, {
    gain: (WAIL_HIGH_HZ - WAIL_LOW_HZ) / 2,
  });
  const gain = new GainNode(context, { gain: 0 });
  sweepDepth.connect(tone.frequency);
  tone.connect(gain).connect(context.destination);
  tone.start();
  return { context, sweepDepth, gain, sweep: null };
}

// A fresh sweep per wail, so it starts at the LED's point in the cycle, even after a pause.
function startWail(output: Output, cycleMs: number): void {
  output.sweep?.stop();
  const sweep = new OscillatorNode(output.context, {
    frequency: 1000 / CYCLE_MS,
    periodicWave: triangleFromLowest(output.context, cycleMs / CYCLE_MS),
  });
  sweep.connect(output.sweepDepth);
  sweep.start();
  output.sweep = sweep;
  output.gain.gain.setTargetAtTime(VOLUME, output.context.currentTime, RAMP_S);
}

function stopWail(output: Output): void {
  output.gain.gain.setTargetAtTime(0, output.context.currentTime, RAMP_S);
}

// A triangle wave between -1 and 1 that is at its lowest at cycle 0, rises for the first half
// and falls for the second, started `cycleFraction` of the way in. Built from the triangle's
// Fourier series, because an oscillator's own phase cannot be set.
function triangleFromLowest(
  context: AudioContext,
  cycleFraction: number,
): PeriodicWave {
  const real = new Float32Array(SWEEP_HARMONICS + 1);
  const imag = new Float32Array(SWEEP_HARMONICS + 1);
  // a sine-phase triangle is lowest three quarters into its cycle
  const shift = 2 * Math.PI * (cycleFraction + 3 / 4);
  for (let n = 1; n <= SWEEP_HARMONICS; n += 2) {
    const amplitude =
      ((8 / (Math.PI * Math.PI)) * (((n - 1) / 2) % 2 === 0 ? 1 : -1)) /
      (n * n);
    real[n] = amplitude * Math.sin(n * shift);
    imag[n] = amplitude * Math.cos(n * shift);
  }
  return new PeriodicWave(context, {
    real,
    imag,
    disableNormalization: true,
  });
}

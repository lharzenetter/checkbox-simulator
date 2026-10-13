import { ALARM_BLINK_PHASE_MS } from "../core/index";

/** The Checkbox's siren, synthesised with Web Audio. */
export interface Siren {
  /** Creates or resumes the audio output; browsers allow this only inside a user gesture. */
  readonly unlock: () => void;
  /** Starts or stops the wail. Before {@link Siren.unlock} it stays silent. */
  readonly setSounding: (sounding: boolean) => void;
}

// ASSUMPTION: a synthesised wail stands in until the real device is recorded, as decided in
// "Decide how alarms are presented", point 2; pitch and loudness are not measured.
const WAIL_LOW_HZ = 700;
const WAIL_HIGH_HZ = 1400;
const VOLUME = 0.2;
const RAMP_S = 0.01;

/** A siren that wails in step with the LED: rising while it is lit, falling while it is dark. */
export function createSiren(): Siren {
  let output: { context: AudioContext; gain: GainNode } | null = null;
  let sounding = false;

  function unlock(): void {
    if (output === null) {
      output = startWail(new AudioContext());
      applyVolume(output, sounding);
    }
    void output.context.resume();
  }

  function setSounding(next: boolean): void {
    sounding = next;
    if (output !== null) {
      applyVolume(output, sounding);
    }
  }

  return { unlock, setSounding };
}

// The oscillators run from unlock on; the siren is switched by its volume alone.
function startWail(context: AudioContext): {
  context: AudioContext;
  gain: GainNode;
} {
  const tone = new OscillatorNode(context, {
    type: "square",
    frequency: (WAIL_LOW_HZ + WAIL_HIGH_HZ) / 2,
  });
  const sweep = new OscillatorNode(context, {
    type: "triangle",
    frequency: 1000 / (2 * ALARM_BLINK_PHASE_MS),
  });
  const sweepDepth = new GainNode(context, {
    gain: (WAIL_HIGH_HZ - WAIL_LOW_HZ) / 2,
  });
  const gain = new GainNode(context, { gain: 0 });
  sweep.connect(sweepDepth).connect(tone.frequency);
  tone.connect(gain).connect(context.destination);
  sweep.start();
  tone.start();
  return { context, gain };
}

function applyVolume(
  { context, gain }: { context: AudioContext; gain: GainNode },
  sounding: boolean,
): void {
  gain.gain.setTargetAtTime(sounding ? VOLUME : 0, context.currentTime, RAMP_S);
}

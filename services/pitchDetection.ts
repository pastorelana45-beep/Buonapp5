
/**
 * Pitch Detection tramite algoritmo YIN ottimizzato per bassa latenza.
 */
export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const threshold = 0.15;
  const SIZE = buffer.length;
  // Analizziamo solo metà buffer per dimezzare i calcoli (sufficiente per frequenze umane)
  const halfSize = Math.floor(SIZE / 2);
  const yinBuffer = new Float32Array(halfSize);

  // Step 1: Difference function (ottimizzata)
  for (let tau = 0; tau < halfSize; tau++) {
    let diff = 0;
    for (let i = 0; i < halfSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      diff += delta * delta;
    }
    yinBuffer[tau] = diff;
  }

  // Step 2: Cumulative mean normalized difference function
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / (runningSum || 1);
  }

  // Step 3: Absolute threshold
  let tau = -1;
  for (let t = 1; t < halfSize; t++) {
    if (yinBuffer[t] < threshold) {
      tau = t;
      break;
    }
  }

  if (tau === -1) {
    let minVal = 1;
    for (let t = 1; t < halfSize; t++) {
      if (yinBuffer[t] < minVal) {
        minVal = yinBuffer[t];
        tau = t;
      }
    }
    if (minVal > 0.4) return null;
  }

  // Step 4: Parabolic interpolation
  if (tau > 0 && tau < halfSize - 1) {
    const s0 = yinBuffer[tau - 1];
    const s1 = yinBuffer[tau];
    const s2 = yinBuffer[tau + 1];
    const denominator = 2 * (2 * s1 - s2 - s0);
    if (denominator !== 0) {
      const betterTau = tau + (s2 - s0) / denominator;
      return sampleRate / betterTau;
    }
  }

  return tau > 0 ? sampleRate / tau : null;
}

export function frequencyToMidi(frequency: number): number {
  if (!frequency || frequency <= 0) return 0;
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}

export function midiToNoteName(midi: number): string {
  if (midi === null || midi === undefined || isNaN(midi) || !isFinite(midi)) {
    return "--";
  }
  
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const m = Math.round(midi);
  const octave = Math.floor(m / 12) - 1;
  const noteIndex = ((m % 12) + 12) % 12;
  
  return String(notes[noteIndex]) + String(octave);
}

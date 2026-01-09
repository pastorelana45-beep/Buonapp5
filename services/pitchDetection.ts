export function calculateRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const SIZE = buffer.length;
  const maxShift = Math.floor(SIZE / 2);
  let bestPitch = null;
  let minSum = Infinity;
  let secondMinSum = Infinity;
  let bestTau = -1;

  // AMDF Algorithm - Più veloce per tempo reale
  for (let tau = 50; tau < maxShift; tau++) {
    let sum = 0;
    for (let i = 0; i < maxShift; i++) {
      sum += Math.abs(buffer[i] - buffer[i + tau]);
    }
    if (sum < minSum) {
      secondMinSum = minSum;
      minSum = sum;
      bestTau = tau;
    }
  }

  if (bestTau > 0 && minSum < secondMinSum * 0.9) {
    return sampleRate / bestTau;
  }
  return null;
}

export function frequencyToMidi(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}

export function midiToNoteName(midi: number): string {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return notes[midi % 12] + (Math.floor(midi / 12) - 1);
}

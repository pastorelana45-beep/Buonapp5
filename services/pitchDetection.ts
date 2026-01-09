/**
 * Calcola l'ampiezza RMS per il GATE THRESHOLD
 */
export function calculateRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

/**
 * Pitch Detection con logica specifica per strumenti percussivi (Piano)
 */
export function detectPitch(
  buffer: Float32Array, 
  sampleRate: number, 
  settings: EngineSettings
): number | null {
  
  // 1. Controllo GATE (0.020 RMS dallo screenshot)
  const rms = calculateRMS(buffer);
  if (rms < settings.gateThreshold) return null;

  // Algoritmo YIN (Logica esistente ottimizzata)
  const threshold = 0.15;
  const SIZE = buffer.length;
  const halfSize = Math.floor(SIZE / 2);
  const yinBuffer = new Float32Array(halfSize);

  for (let tau = 0; tau < halfSize; tau++) {
    let diff = 0;
    for (let i = 0; i < halfSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      diff += delta * delta;
    }
    yinBuffer[tau] = diff;
  }

  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / (runningSum || 1);
  }

  let tau = -1;
  for (let t = 1; t < halfSize; t++) {
    if (yinBuffer[t] < threshold) {
      tau = t;
      break;
    }
  }

  if (tau === -1) return null;

  let frequency = sampleRate / tau;

  // 2. Logica di CORREZIONE per il PIANO
  if (settings.isQuantized) {
    const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
    // Se NO PITCH BEND è attivo, restituiamo la frequenza esatta del tasto
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  return frequency;
}

export function frequencyToMidi(frequency: number): number {
  if (!frequency || frequency <= 0) return 0;
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}

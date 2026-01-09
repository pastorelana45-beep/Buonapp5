export enum Category {
  ALL = 'ALL',
  PIANO = 'PIANO',
  KEYS = 'KEYS',
  PERC = 'PERC',
  ORGAN = 'ORGAN',
  GUITAR = 'GUITAR',
  BASS = 'BASS',
  STRINGS = 'STRINGS',
  BRASS = 'BRASS',
  REED = 'REED',
  SYNTH = 'SYNTH',
  ETHNIC = 'ETHNIC'
}

export interface Instrument {
  id: string;
  name: string;
  category: Category;
  icon?: string;
}

export type ScaleType = 'CHR' | 'MAJ' | 'MIN' | 'PEN';

export interface EngineSettings {
  transientSensitivity: number; // Valore 0.5 (50%)
  gateThreshold: number;        // Valore 0.020 RMS
  sustainDecay: number;         // Valore 1.5s
  isQuantized: boolean;         // MIDI Quantized
  isVelocitySensitive: boolean; // Velocity Sensitive
  noPitchBend: boolean;         // No Pitch Bend
  currentScale: ScaleType;      // Scala selezionata (CHR, MAJ, ecc.)
}

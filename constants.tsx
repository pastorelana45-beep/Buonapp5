import { EngineSettings, Instrument, Category } from './types';

export const DEFAULT_SETTINGS: EngineSettings = {
  transientSensitivity: 0.5, // 50%
  gateThreshold: 0.020,      // 0.020 RMS
  sustainDecay: 1.5,         // 1.5s
  isQuantized: true,         // Attivo per Piano
  isVelocitySensitive: true, // Dinamica
  noPitchBend: true,         // Bloccato su tasti fissi
  currentScale: 'CHR'        // Cromatica di default
};

export const INSTRUMENTS: Instrument[] = [
  { id: 'concert-grand', name: 'CONCERT GRAND', category: Category.PIANO },
  { id: 'upright-piano', name: 'UPRIGHT PIANO', category: Category.PIANO },
  { id: 'mellow-piano', name: 'MELLOW PIANO', category: Category.PIANO },
  { id: 'saloon-piano', name: 'SALOON PIANO', category: Category.PIANO },
  // ... altri strumenti
];

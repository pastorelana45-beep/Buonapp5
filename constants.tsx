
import { Instrument, Category } from './types';

export const INSTRUMENTS: Instrument[] = [
  // --- PIANOS ---
  { id: 'concert-grand', name: 'CONCERT GRAND', category: 'PIANO' },
  { id: 'upright-piano', name: 'UPRIGHT PIANO', category: 'PIANO' },
  { id: 'mellow-piano', name: 'MELLOW PIANO', category: 'PIANO' },
  { id: 'saloon-piano', name: 'SALOON PIANO', category: 'PIANO' },
  { id: 'honky-tonk', name: 'HONKY-TONK', category: 'PIANO' },
  
  // --- KEYS ---
  { id: 'rhodes-piano', name: 'RHODES PIANO', category: 'KEYS' },
  { id: 'wurlitzer', name: 'WURLITZER', category: 'KEYS' },
  { id: 'clavinet-d6', name: 'CLAVINET D6', category: 'KEYS' },
  { id: 'harpsichord', name: 'HARPSICHORD', category: 'KEYS' },
  
  // --- STRINGS (REALISTIC) ---
  { id: 'solo-violin', name: 'SOLO VIOLIN', category: 'STRINGS' },
  { id: 'solo-cello', name: 'SOLO CELLO', category: 'STRINGS' },
  { id: 'string-ensemble', name: 'ORCHESTRAL STRINGS', category: 'STRINGS' },
  { id: 'pizzicato-section', name: 'PIZZICATO STRINGS', category: 'STRINGS' },
  { id: 'contrabass-legato', name: 'CONTRABASS', category: 'STRINGS' },
  { id: 'orchestral-harp', name: 'ORCHESTRAL HARP', category: 'STRINGS' },

  // --- BRASS ---
  { id: 'trumpet-solo', name: 'SOLO TRUMPET', category: 'BRASS' },
  { id: 'french-horn-ensemble', name: 'FRENCH HORNS', category: 'BRASS' },
  { id: 'trombone-classical', name: 'TROMBONE', category: 'BRASS' },
  { id: 'tuba-orchestral', name: 'TUBA', category: 'BRASS' },
  
  // --- REED & WOODWINDS ---
  { id: 'oboe-classical', name: 'OBOE', category: 'REED' },
  { id: 'bassoon-classical', name: 'BASSOON', category: 'REED' },
  { id: 'flute-concert', name: 'CONCERT FLUTE', category: 'REED' },
  { id: 'clarinet-classical', name: 'CLARINET', category: 'REED' },
  { id: 'soprano-sax', name: 'SOPRANO SAX', category: 'REED' },

  // --- ORGAN ---
  { id: 'pipe-organ', name: 'PIPE ORGAN', category: 'ORGAN' },
  { id: 'church-organ', name: 'CHURCH ORGAN', category: 'ORGAN' },
  { id: 'rock-organ', name: 'B3 HAMMOND', category: 'ORGAN' },
  
  // --- GUITAR & BASS ---
  { id: 'spanish-guitar', name: 'SPANISH GUITAR', category: 'GUITAR' },
  { id: 'steel-string', name: 'STEEL STRING', category: 'GUITAR' },
  { id: 'double-bass', name: 'DOUBLE BASS', category: 'BASS' },
  { id: 'electric-fretless', name: 'FRETLESS BASS', category: 'BASS' },
  
  // --- SYNTH (FOR DESIGN) ---
  { id: 'warm-pad', name: 'WARM PAD', category: 'SYNTH' },
  { id: 'saw-lead', name: 'SAW LEAD', category: 'SYNTH' },
  { id: 'square-lead', name: 'SQUARE LEAD', category: 'SYNTH' },
  
  // --- PERC & ETHNIC ---
  { id: 'marimba-classical', name: 'MARIMBA', category: 'PERC' },
  { id: 'celesta-pure', name: 'CELESTA', category: 'PERC' },
  { id: 'sitar-traditional', name: 'SITAR', category: 'ETHNIC' },
  { id: 'koto-japanese', name: 'KOTO', category: 'ETHNIC' },
];

export const CATEGORIES = Object.values(Category);

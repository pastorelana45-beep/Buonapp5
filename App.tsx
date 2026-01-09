import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { 
  Music, Activity, Disc, Square, Download, Trash2, 
  Layers, Mic2, Settings, Search, History, Play
} from 'lucide-react';
// Importa le tue utility se sono in file separati, altrimenti usa queste
import { detectPitch, frequencyToMidi, midiToNoteName, calculateRMS } from './services/pitchDetection';

const App: React.FC = () => {
  // --- Manteniamo i tuoi stati originali ---
  const [mode, setMode] = useState<'IDLE' | 'MIDI' | 'DIRECT'>('IDLE');
  const [selectedScale, setSelectedScale] = useState('CHR');
  const [isEpicMode, setIsEpicMode] = useState(true);
  const [currentNote, setCurrentNote] = useState('--');
  const [rmsVolume, setRmsVolume] = useState(0); // Risolto l'errore del build
  const [sessions, setSessions] = useState<any[]>([]);

  // --- Refs per l'Audio Engine ---
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const analyserRef = useRef<Tone.Analyser | null>(null);
  const recorderRef = useRef<Tone.Recorder | null>(null);

  // --- Funzione per inizializzare mantenendo la tua qualità sonora ---
  const initEngine = async () => {
    await Tone.start();
    
    // Effetti per la "corposità" che abbiamo discusso
    const reverb = new Tone.Reverb({ decay: 4, wet: 0.3 }).toDestination();
    const chorus = new Tone.Chorus(4, 2.5, 0.5).connect(reverb).start();
    const distortion = new Tone.Distortion(0.1).connect(chorus); // Calore analogico

    const sampler = new Tone.Sampler({
      urls: { "C4": "https://tonejs.github.io/audio/salamander/C4.mp3" },
      onload: () => console.log("HD Samples Loaded")
    }).connect(distortion);

    const mic = new Tone.UserMedia();
    const analyser = new Tone.Analyser('waveform', 1024);
    const recorder = new Tone.Recorder();

    await mic.open();
    mic.connect(analyser);
    mic.connect(recorder);

    samplerRef.current = sampler;
    analyserRef.current = analyser;
    recorderRef.current = recorder;
    
    requestAnimationFrame(audioLoop);
  };

  const audioLoop = () => {
    if (!analyserRef.current || !samplerRef.current) {
      requestAnimationFrame(audioLoop);
      return;
    }

    const buffer = analyserRef.current.getValue() as Float32Array;
    const rms = calculateRMS(buffer);
    setRmsVolume(rms);

    if (mode === 'MIDI' && rms > 0.02) {
      const freq = detectPitch(buffer, Tone.getContext().sampleRate);
      if (freq) {
        const midi = frequencyToMidi(freq);
        const note = midiToNoteName(midi);
        if (note !== currentNote) {
          samplerRef.current.releaseAll();
          samplerRef.current.triggerAttack(note);
          // Logica EPIC LAYER (Ottava bassa)
          if (isEpicMode) {
            samplerRef.current.triggerAttack(midiToNoteName(midi - 12), undefined, 0.4);
          }
          setCurrentNote(note);
        }
      }
    } else if (rms < 0.01 && currentNote !== '--') {
      samplerRef.current.releaseAll();
      setCurrentNote('--');
    }
    requestAnimationFrame(audioLoop);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans p-4 flex flex-col gap-6">
      {/* HEADER ORIGINALE (Foto 1) */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.3)]">
            <Music className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">VOCALSYNTH<span className="text-purple-500">PRO</span></h1>
            <p className="text-[10px] text-zinc-500 font-medium">STUDIO ENGINE V9.2</p>
          </div>
        </div>
        <div className="flex gap-2">
           <div className="bg-zinc-900/50 border border-white/5 px-4 py-2 rounded-2xl flex items-center gap-3">
              <Clock size={14} className="text-zinc-500" />
              <span className="text-sm font-bold text-white">120</span>
              <span className="text-[8px] text-zinc-500 font-bold">BPM</span>
           </div>
           <button className="w-11 h-11 bg-zinc-900/50 rounded-full flex items-center justify-center border border-white/5">
              <Settings size={20} className="text-zinc-400" />
           </button>
        </div>
      </div>

      {/* SCALE & REAL-TIME NOTE (Foto 1) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#111111] p-4 rounded-[2rem] border border-white/5">
          <p className="text-[9px] font-bold text-zinc-500 uppercase mb-3 px-2">Scale Quantize</p>
          <div className="flex gap-1">
            {['CHR', 'MAJ', 'MIN', 'PEN'].map(s => (
              <button 
                key={s}
                onClick={() => setSelectedScale(s)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${selectedScale === s ? 'bg-purple-600 text-white shadow-lg' : 'bg-zinc-800/50 text-zinc-600'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-[#111111] p-4 rounded-[2rem] border border-white/5 flex flex-col justify-between">
          <p className="text-[9px] font-bold text-zinc-500 uppercase px-2">Real-Time Note</p>
          <div className="flex justify-between items-end px-2">
            <span className="text-2xl font-black text-white italic">{currentNote}</span>
            <div className={`w-3 h-3 rounded-full mb-2 ${currentNote !== '--' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-zinc-800'}`} />
          </div>
        </div>
      </div>

      {/* MAIN MODES (Foto 1) */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 'MIDI', icon: <Activity />, label: 'MIDI LIVE' },
          { id: 'DIRECT', icon: <Mic2 />, label: 'DIRECT' },
          { id: 'REC', icon: <Disc />, label: 'REC MIDI' }
        ].map(m => (
          <button 
            key={m.id}
            onClick={() => { if(!isStarted) initEngine(); setMode(m.id as any); }}
            className={`aspect-square rounded-[2rem] flex flex-col items-center justify-center gap-3 border transition-all ${mode === m.id ? 'bg-zinc-800 border-purple-500/50' : 'bg-[#111111] border-transparent'}`}
          >
            <div className={mode === m.id ? 'text-purple-500' : 'text-zinc-600'}>{m.icon}</div>
            <span className="text-[9px] font-black text-zinc-500 tracking-widest">{m.label}</span>
          </button>
        ))}
      </div>

      {/* BROWSER / VAULT TABS (Foto 1) */}
      <div className="bg-zinc-900/30 p-1.5 rounded-2xl flex gap-1 border border-white/5">
        <button className="flex-1 bg-zinc-800/80 py-3 rounded-xl flex items-center justify-center gap-2 text-white">
          <Search size={16} className="text-purple-500" />
          <span className="text-[10px] font-black uppercase italic">Browser</span>
        </button>
        <button className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-zinc-600">
          <History size={16} />
          <span className="text-[10px] font-black uppercase italic">Vault ({sessions.length})</span>
        </button>
      </div>

      {/* PIANO SECTION (Foto 1) */}
      <div className="bg-[#111111] rounded-[2.5rem] p-6 border border-white/5 flex-1">
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-6">Piano</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="aspect-[4/3] bg-zinc-900/80 rounded-3xl border-2 border-purple-600 p-4 relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-purple-600 text-[7px] font-black px-2 py-0.5 rounded-full text-white">HD SAMPLES</div>
            <Music className="text-purple-500 mb-4" size={24} />
            <p className="text-xs font-black text-white uppercase leading-tight">Concert<br/>Grand</p>
          </div>
          {/* Altri strumenti seguono lo stesso stile... */}
        </div>
      </div>

      {/* FOOTER BAR (Foto 1) */}
      <div className="bg-zinc-900/80 backdrop-blur-lg rounded-[2rem] p-4 border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center">
              <Activity className="text-zinc-500" />
           </div>
           <div>
              <p className="text-[8px] font-black text-zinc-600 uppercase">Real-Time Idle</p>
              <p className="text-sm font-black text-white italic tracking-tight">READY</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Barra del volume dinamica */}
          <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
             <div className="h-full bg-purple-500" style={{ width: `${rmsVolume * 1000}%` }} />
          </div>
          <button className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
             <div className="w-3 h-3 bg-zinc-600 rounded-sm" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;

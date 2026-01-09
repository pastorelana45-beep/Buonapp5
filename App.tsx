import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { 
  Music, Settings, Mic, Play, Square, Volume2, Trash2, 
  Activity, Disc, History, AudioWaveform, Clock, 
  ChevronRight, XCircle, Mic2, Download, Loader2, Zap, MoveUp, MoveDown
} from 'lucide-react';
import { INSTRUMENTS } from './constants';
import { Instrument, WorkstationMode, RecordedNote, StudioSession, ScaleType } from './types';
import { detectPitch, frequencyToMidi, midiToNoteName } from './services/pitchDetection';

const App: React.FC = () => {
  // --- STATI ---
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument>(INSTRUMENTS[0]);
  const [mode, setMode] = useState<WorkstationMode>(WorkstationMode.IDLE);
  const [isStarted, setIsStarted] = useState(false);
  const [currentMidiNote, setCurrentMidiNote] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingBack, setIsPlayingBack] = useState<string | null>(null);
  const [sessions, setSessions] = useState<StudioSession[]>([]);
  const [rmsVolume, setRmsVolume] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [activeTab, setActiveTab] = useState<'BROWSER' | 'VAULT'>('BROWSER');
  
  // --- REFS PER AUDIO ENGINE ---
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const lfoFilterRef = useRef<Tone.AutoFilter | null>(null);
  const micRef = useRef<Tone.UserMedia | null>(null);
  const recorderRef = useRef<Tone.Recorder | null>(null);
  const analyserRef = useRef<Tone.Analyser | null>(null);

  // --- LOGICA DI DOWNLOAD MP3 ---
  const downloadSession = async (session: StudioSession) => {
    const a = document.createElement("a");
    a.href = session.audioUrl;
    a.download = `VocalSynth_${new Date(session.timestamp).getTime()}.mp3`;
    a.click();
  };

  // --- AUDIO ENGINE INIT ---
  const initAudio = async () => {
    await Tone.start();
    const mic = new Tone.UserMedia();
    const analyser = new Tone.Analyser('waveform', 1024);
    const recorder = new Tone.Recorder();
    
    // Effetto Ritmico (Auto-Filter sincronizzato col BPM)
    const rhythmFilter = new Tone.AutoFilter({
      frequency: "4n",
      baseFrequency: 400,
      octaves: 2.5,
      filter: { type: "lowpass" }
    }).toDestination().start();

    const sampler = new Tone.Sampler({
      urls: { "C4": "https://tonejs.github.io/audio/salamander/C4.mp3" }, // Fallback
      onload: () => console.log("Engine Ready")
    }).connect(rhythmFilter);

    await mic.open();
    mic.connect(analyser);
    mic.connect(recorder);

    samplerRef.current = sampler;
    micRef.current = mic;
    analyserRef.current = analyser;
    recorderRef.current = recorder;
    lfoFilterRef.current = rhythmFilter;
    
    setIsStarted(true);
    startProcessing();
  };

  // --- LOOP DI ELABORAZIONE (PIANO SEGUITO DA VOCE) ---
  const startProcessing = () => {
    const process = () => {
      if (!analyserRef.current || !samplerRef.current) return;
      
      const buffer = analyserRef.current.getValue() as Float32Array;
      const rms = calculateRMS(buffer);
      setRmsVolume(rms);

      // Threshold per evitare rumore di fondo
      if (rms > 0.015 && mode === WorkstationMode.MIDI) {
        const freq = detectPitch(buffer, Tone.getContext().sampleRate);
        if (freq) {
          const midi = frequencyToMidi(freq);
          const note = midiToNoteName(midi);
          
          if (note !== currentMidiNote?.toString()) {
            samplerRef.current.releaseAll();
            samplerRef.current.triggerAttack(note);
            setCurrentMidiNote(midi);
          }
        }
      } else {
        if (currentMidiNote) {
          samplerRef.current.releaseAll();
          setCurrentMidiNote(null);
        }
      }
      requestAnimationFrame(process);
    };
    process();
  };

  // --- DIFFERENZIAZIONE STRUMENTI ---
  const changeInstrument = async (inst: Instrument) => {
    setSelectedInstrument(inst);
    if (!samplerRef.current) return;

    // Imposta inviluppi specifici per categoria
    switch (inst.category) {
      case 'PIANO':
        samplerRef.current.set({ attack: 0.005, release: 0.8, curve: "exponential" });
        break;
      case 'STRINGS':
        samplerRef.current.set({ attack: 0.4, release: 2.0, curve: "linear" });
        break;
      case 'BRASS':
        samplerRef.current.set({ attack: 0.08, release: 0.2 });
        break;
      default:
        samplerRef.current.set({ attack: 0.1, release: 1.0 });
    }
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      recorderRef.current?.start();
      setIsRecording(true);
    } else {
      const blob = await recorderRef.current?.stop();
      setIsRecording(false);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const newSession: StudioSession = {
          id: Math.random().toString(),
          timestamp: Date.now(),
          audioUrl: url,
          instrumentId: selectedInstrument.id,
          midiNotes: [],
          bpm, scale: 'CHROMATIC'
        };
        setSessions([newSession, ...sessions]);
        setActiveTab('VAULT');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col font-sans">
      {/* Header */}
      <header className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-950">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-600 rounded-lg"><Music size={20} /></div>
          <h1 className="font-black tracking-tighter uppercase">VocalSynth <span className="text-purple-500">PRO</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-full border border-white/5">
            <Clock size={12} className="text-zinc-500" />
            <input type="number" value={bpm} onChange={e => setBpm(Number(e.target.value))} className="bg-transparent w-8 text-[10px] font-bold outline-none" />
            <span className="text-[10px] text-zinc-500">BPM</span>
          </div>
        </div>
      </header>

      {!isStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10">
          <h2 className="text-6xl font-black italic mb-8">READY?</h2>
          <button onClick={initAudio} className="bg-white text-black px-12 py-6 rounded-full font-black text-xl shadow-2xl hover:scale-105 transition-transform">INITIALIZE ENGINE</button>
        </div>
      ) : (
        <main className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Visualizer */}
          <div className="h-12 flex items-end gap-[2px] mb-6 opacity-50">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="flex-1 bg-purple-500 rounded-t-sm transition-all" style={{ height: `${Math.random() * rmsVolume * 1000}%` }} />
            ))}
          </div>

          {/* Azioni Principali */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button onClick={() => setMode(mode === WorkstationMode.MIDI ? WorkstationMode.IDLE : WorkstationMode.MIDI)} className={`p-6 rounded-3xl flex flex-col items-center gap-2 border-2 transition-all ${mode === WorkstationMode.MIDI ? 'bg-purple-600 border-purple-400 shadow-lg shadow-purple-900/40' : 'bg-zinc-900 border-transparent'}`}>
              <Activity /> <span className="text-[10px] font-black uppercase">Midi Live</span>
            </button>
            <button onClick={toggleRecording} className={`p-6 rounded-3xl flex flex-col items-center gap-2 border-2 transition-all ${isRecording ? 'bg-red-600 border-red-400 animate-pulse' : 'bg-zinc-900 border-transparent'}`}>
              {isRecording ? <Square fill="white" /> : <Disc />} <span className="text-[10px] font-black uppercase">{isRecording ? 'Stop' : 'Record'}</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setActiveTab('BROWSER')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${activeTab === 'BROWSER' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Instruments</button>
            <button onClick={() => setActiveTab('VAULT')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${activeTab === 'VAULT' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Vault ({sessions.length})</button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {activeTab === 'BROWSER' ? (
              <div className="grid grid-cols-2 gap-2">
                {INSTRUMENTS.map(inst => (
                  <button key={inst.id} onClick={() => changeInstrument(inst)} className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedInstrument.id === inst.id ? 'bg-purple-900/40 border-purple-500' : 'bg-zinc-900/50 border-transparent'}`}>
                    <p className="text-[10px] font-black uppercase truncate">{inst.name}</p>
                    <span className="text-[8px] text-zinc-500 uppercase">{inst.category}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map(s => (
                  <div key={s.id} className="p-4 bg-zinc-900 rounded-2xl flex justify-between items-center border border-white/5">
                    <div>
                      <p className="text-[10px] font-black uppercase">Take #{s.id.slice(0, 4)}</p>
                      <p className="text-[8px] text-zinc-500">{new Date(s.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => downloadSession(s)} className="p-2 bg-emerald-600 rounded-lg"><Download size={14} /></button>
                      <button onClick={() => setSessions(prev => prev.filter(x => x.id !== s.id))} className="p-2 bg-zinc-800 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* Dock Inferiore per Note Name */}
      {isStarted && (
        <div className="p-6 bg-zinc-950 border-t border-white/10 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-zinc-500 uppercase">Current Pitch</span>
            <span className="text-3xl font-black text-purple-500 italic">{currentMidiNote ? midiToNoteName(currentMidiNote) : '--'}</span>
          </div>
          <div className="h-10 w-10 rounded-full border-4 border-zinc-800 flex items-center justify-center">
            <div className={`w-4 h-4 rounded-full ${currentMidiNote ? 'bg-purple-500 shadow-[0_0_10px_purple]' : 'bg-zinc-800'}`} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

function calculateRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

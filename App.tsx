import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { 
  Music, Activity, Disc, Square, Download, Trash2, 
  Layers, Volume2, Zap, Loader2 
} from 'lucide-react';

// --- UTILS: PITCH DETECTION & MATH ---
const calculateRMS = (buffer: Float32Array): number => {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
};

const detectPitch = (buffer: Float32Array, sampleRate: number): number | null => {
  const SIZE = buffer.length;
  const maxShift = Math.floor(SIZE / 2);
  let minSum = Infinity;
  let bestTau = -1;
  for (let tau = 50; tau < maxShift; tau++) {
    let sum = 0;
    for (let i = 0; i < maxShift; i++) sum += Math.abs(buffer[i] - buffer[i + tau]);
    if (sum < minSum) { minSum = sum; bestTau = tau; }
  }
  return bestTau > 0 ? sampleRate / bestTau : null;
};

const midiToNoteName = (midi: number): string => {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return notes[midi % 12] + (Math.floor(midi / 12) - 1);
};

// --- CONFIGURAZIONE STRUMENTI ---
const INSTRUMENTS = [
  { id: 'grand-piano', name: 'Grand Piano', category: 'PIANO', url: "https://tonejs.github.io/audio/salamander/A4.mp3" },
  { id: 'strings', name: 'Cinematic Strings', category: 'STRINGS', url: "https://tonejs.github.io/audio/casio/A1.mp3" },
  { id: 'brass', name: 'Epic Brass', category: 'BRASS', url: "https://tonejs.github.io/audio/casio/A2.mp3" },
  { id: 'synth', name: 'Warm Pad', category: 'SYNTH', url: "https://tonejs.github.io/audio/casio/A1.mp3" },
];

const App: React.FC = () => {
  // --- STATI ---
  const [isStarted, setIsStarted] = useState(false);
  const [mode, setMode] = useState<'IDLE' | 'MIDI'>('IDLE');
  const [isRecording, setIsRecording] = useState(false);
  const [isEpicMode, setIsEpicMode] = useState(true);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [selectedInst, setSelectedInst] = useState(INSTRUMENTS[0]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [rmsVolume, setRmsVolume] = useState(0); // <--- AGGIUNTO QUESTO STATO MANCANTE

  // --- REFS AUDIO ---
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const micRef = useRef<Tone.UserMedia | null>(null);
  const analyserRef = useRef<Tone.Analyser | null>(null);
  const recorderRef = useRef<Tone.Recorder | null>(null);

  // --- INIZIALIZZAZIONE ---
  const initEngine = async () => {
    await Tone.start();
    
    const reverb = new Tone.Reverb({ decay: 4, wet: 0.4 }).toDestination();
    const chorus = new Tone.Chorus(4, 2.5, 0.5).connect(reverb).start();
    const distortion = new Tone.Distortion(0.15).connect(chorus);
    
    const sampler = new Tone.Sampler({
      urls: { "A4": selectedInst.url },
      onload: () => setIsLoaded(true)
    }).connect(distortion);

    const mic = new Tone.UserMedia();
    const analyser = new Tone.Analyser('waveform', 1024);
    const recorder = new Tone.Recorder();

    await mic.open();
    mic.connect(analyser);
    mic.connect(recorder);

    samplerRef.current = sampler;
    micRef.current = mic;
    analyserRef.current = analyser;
    recorderRef.current = recorder;

    setIsStarted(true);
    requestAnimationFrame(audioLoop);
  };

  // --- AUDIO LOOP ---
  const audioLoop = () => {
    if (!analyserRef.current || !samplerRef.current) {
      requestAnimationFrame(audioLoop);
      return;
    }

    const buffer = analyserRef.current.getValue() as Float32Array;
    const rms = calculateRMS(buffer);
    setRmsVolume(rms); // Aggiorna la barra del volume

    if (mode === 'MIDI' && rms > 0.02) {
      const freq = detectPitch(buffer, Tone.getContext().sampleRate);
      if (freq) {
        const midi = Math.round(69 + 12 * Math.log2(freq / 440));
        const note = midiToNoteName(midi);

        if (note !== currentNote) {
          samplerRef.current.releaseAll();
          samplerRef.current.triggerAttack(note);
          if (isEpicMode) {
            samplerRef.current.triggerAttack(midiToNoteName(midi - 12), undefined, 0.5);
          }
          setCurrentNote(note);
        }
      }
    } else if (mode !== 'MIDI' || rms <= 0.02) {
      if (currentNote) {
        samplerRef.current.releaseAll();
        setCurrentNote(null);
      }
    }
    requestAnimationFrame(audioLoop);
  };

  const changeInstrument = (inst: any) => {
    setIsLoaded(false);
    setSelectedInst(inst);
    samplerRef.current?.add("A4", inst.url, () => setIsLoaded(true));
    
    const settings = inst.category === 'STRINGS' ? { attack: 0.6, release: 2 } : { attack: 0.01, release: 1 };
    samplerRef.current?.set(settings);
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
        setSessions(prev => [{ id: Date.now(), url, time: new Date().toLocaleTimeString() }, ...prev]);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-white font-sans flex flex-col overflow-hidden">
      <header className="p-4 bg-zinc-950 border-b border-white/10 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center"><Music size={18}/></div>
          <h1 className="font-black uppercase tracking-tighter">VocalSynth<span className="text-purple-500">Ultra</span></h1>
        </div>
        <button 
          onClick={() => setIsEpicMode(!isEpicMode)}
          className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all flex items-center gap-2 ${isEpicMode ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}
        >
          <Layers size={14} /> {isEpicMode ? 'EPIC LAYER' : 'SIMPLE'}
        </button>
      </header>

      {!isStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
          <Zap size={64} className="text-purple-500 mb-6 animate-pulse" />
          <h2 className="text-4xl font-black italic mb-2 tracking-tighter uppercase">Ultra Engine</h2>
          <p className="text-zinc-500 text-[10px] mb-10 uppercase tracking-widest">High Definition Vocal Processing</p>
          <button onClick={initEngine} className="bg-white text-black px-12 py-5 rounded-2xl font-black text-xl shadow-2xl active:scale-95 transition-all">BOOT SYSTEM</button>
        </div>
      ) : (
        <main className="flex-1 flex flex-col p-4 overflow-hidden relative">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button 
              onClick={() => setMode(mode === 'MIDI' ? 'IDLE' : 'MIDI')}
              className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${mode === 'MIDI' ? 'bg-purple-600 border-purple-400 shadow-lg shadow-purple-900/40' : 'bg-zinc-900 border-transparent text-zinc-500'}`}
            >
              <Activity size={24} /> <span className="font-black text-[10px] uppercase tracking-tighter">Midi Live</span>
            </button>
            <button 
              onClick={toggleRecording}
              className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${isRecording ? 'bg-red-600 border-red-400 animate-pulse' : 'bg-zinc-900 border-transparent text-zinc-500'}`}
            >
              {isRecording ? <Square fill="white" size={24} /> : <Disc size={24} />} 
              <span className="font-black text-[10px] uppercase tracking-tighter">{isRecording ? 'Stop Rec' : 'Record'}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pb-24 scrollbar-hide">
            <div className="grid grid-cols-2 gap-2">
              {INSTRUMENTS.map(inst => (
                <button 
                  key={inst.id} 
                  onClick={() => changeInstrument(inst)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedInst.id === inst.id ? 'bg-zinc-800 border-purple-500' : 'bg-zinc-900/50 border-transparent'}`}
                >
                  <p className="font-black text-[10px] uppercase truncate">{inst.name}</p>
                  <p className="text-[8px] text-zinc-600 uppercase">{inst.category}</p>
                </button>
              ))}
            </div>

            {sessions.length > 0 && (
              <div className="space-y-2 mt-6">
                <p className="text-[10px] font-black text-zinc-500 uppercase px-2">Vault (MP3 Export)</p>
                {sessions.map(s => (
                  <div key={s.id} className="p-4 bg-zinc-900 rounded-2xl flex justify-between items-center border border-white/5">
                    <span className="text-[10px] font-black uppercase">Take {s.time}</span>
                    <div className="flex gap-2">
                      <button onClick={() => { const a = document.createElement('a'); a.href = s.url; a.download = `VocalSynth_${s.id}.mp3`; a.click(); }} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"><Download size={14}/></button>
                      <button onClick={() => setSessions(sessions.filter(x => x.id !== s.id))} className="p-2 bg-zinc-800 text-zinc-500 rounded-lg"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {isStarted && (
        <div className="p-6 bg-zinc-950 border-t border-white/10 flex justify-between items-center">
          <div>
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Pitch</span>
            <div className="text-4xl font-black italic text-purple-500 leading-none">{currentNote || '--'}</div>
          </div>
          {!isLoaded && <Loader2 className="animate-spin text-purple-500" />}
          <div className="w-24 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
             <div className="h-full bg-purple-600 transition-all duration-75" style={{ width: `${Math.min(100, rmsVolume * 800)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

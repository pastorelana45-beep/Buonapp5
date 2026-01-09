import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { 
  Music, Activity, Disc, Square, Download, Trash2, 
  Layers, Mic2, Settings, Search, History, Clock, Loader2
} from 'lucide-react';

// --- UTILS PER IL BUILD (PITCH DETECTION) ---
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

const App: React.FC = () => {
  // --- STATI DELLA TUA GRAFICA ORIGINALE ---
  const [isStarted, setIsStarted] = useState(false);
  const [mode, setMode] = useState<'IDLE' | 'MIDI' | 'DIRECT' | 'REC'>('IDLE');
  const [selectedScale, setSelectedScale] = useState('CHR');
  const [isEpicMode, setIsEpicMode] = useState(true);
  const [currentNote, setCurrentNote] = useState('--');
  const [rmsVolume, setRmsVolume] = useState(0); 
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(true);

  // --- REFS ---
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const analyserRef = useRef<Tone.Analyser | null>(null);
  const recorderRef = useRef<Tone.Recorder | null>(null);

  const initEngine = async () => {
    await Tone.start();
    const reverb = new Tone.Reverb({ decay: 4, wet: 0.3 }).toDestination();
    const chorus = new Tone.Chorus(4, 2.5, 0.5).connect(reverb).start();
    const distortion = new Tone.Distortion(0.12).connect(chorus);

    const sampler = new Tone.Sampler({
      urls: { "C4": "https://tonejs.github.io/audio/salamander/C4.mp3" },
      onload: () => setIsLoaded(true)
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
    setIsStarted(true);
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
        const midi = Math.round(69 + 12 * Math.log2(freq / 440));
        const note = midiToNoteName(midi);
        if (note !== currentNote) {
          samplerRef.current.releaseAll();
          samplerRef.current.triggerAttack(note);
          // LOGICA "CORPOSA" (Ottava Bassa)
          if (isEpicMode) {
            samplerRef.current.triggerAttack(midiToNoteName(midi - 12), undefined, 0.4);
          }
          setCurrentNote(note);
        }
      }
    } else if (rms < 0.015 && currentNote !== '--') {
      samplerRef.current.releaseAll();
      setCurrentNote('--');
    }
    requestAnimationFrame(audioLoop);
  };

  const toggleRecording = async () => {
    if (!recorderRef.current) return;
    if (!isRecording) {
      recorderRef.current.start();
      setMode('REC');
    } else {
      const blob = await recorderRef.current.stop();
      const url = URL.createObjectURL(blob);
      setSessions(prev => [{ id: Date.now(), url, time: new Date().toLocaleTimeString() }, ...prev]);
      setMode('IDLE');
    }
  };

  const isRecording = mode === 'REC';

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-zinc-300 font-sans p-4 flex flex-col gap-5 overflow-hidden">
      
      {/* HEADER (Studio Engine V9.2) */}
      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.4)]">
            <Music className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase">VocalSynth<span className="text-purple-500">Pro</span></h1>
            <p className="text-[9px] text-zinc-600 font-bold tracking-widest uppercase">Studio Engine V9.2</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="bg-zinc-900/80 px-4 py-2 rounded-2xl border border-white/5 flex items-center gap-2">
            <Clock size={12} className="text-zinc-500" />
            <span className="text-xs font-bold text-white">120</span>
            <span className="text-[8px] text-zinc-500 font-bold uppercase">Bpm</span>
          </div>
          <button className="w-10 h-10 bg-zinc-900/80 rounded-2xl flex items-center justify-center border border-white/5">
            <Settings size={18} className="text-zinc-400" />
          </button>
        </div>
      </div>

      {!isStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Zap size={60} className="text-purple-500 mb-6 animate-pulse" />
          <button onClick={initEngine} className="bg-white text-black px-12 py-5 rounded-[2rem] font-black text-xl shadow-2xl active:scale-95 transition-all">START ENGINE</button>
        </div>
      ) : (
        <>
          {/* SCALE & NOTE (Sezione superiore) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#121212] p-5 rounded-[2.2rem] border border-white/5">
              <p className="text-[8px] font-black text-zinc-600 uppercase mb-3 tracking-widest">Scale Quantize</p>
              <div className="flex gap-1">
                {['CHR', 'MAJ', 'MIN', 'PEN'].map(s => (
                  <button key={s} onClick={() => setSelectedScale(s)} className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all ${selectedScale === s ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'bg-zinc-800/40 text-zinc-600'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="bg-[#121212] p-5 rounded-[2.2rem] border border-white/5 flex flex-col justify-between relative overflow-hidden">
              <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Real-Time Note</p>
              <div className="flex justify-between items-end">
                 <span className="text-3xl font-black text-white italic tracking-tighter">{currentNote}</span>
                 <div className={`w-3 h-3 rounded-full mb-1.5 ${currentNote !== '--' ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : 'bg-zinc-800'}`} />
              </div>
            </div>
          </div>

          {/* MAIN MODES (I tre tasti centrali) */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'MIDI', icon: <Activity />, label: 'MIDI LIVE' },
              { id: 'DIRECT', icon: <Mic2 />, label: 'DIRECT' },
              { id: 'REC', icon: <Disc />, label: 'REC MIDI' }
            ].map(m => (
              <button 
                key={m.id} 
                onClick={() => m.id === 'REC' ? toggleRecording() : setMode(m.id as any)}
                className={`aspect-square rounded-[2.2rem] flex flex-col items-center justify-center gap-2 border-2 transition-all ${mode === m.id ? 'bg-zinc-800/50 border-purple-500/50' : 'bg-[#121212] border-transparent'}`}
              >
                <div className={mode === m.id ? 'text-purple-500' : 'text-zinc-700'}>{m.icon}</div>
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter">{m.label}</span>
              </button>
            ))}
          </div>

          {/* BROWSER / VAULT */}
          <div className="bg-zinc-900/40 p-1 rounded-2xl flex border border-white/5">
            <button className="flex-1 bg-zinc-800/60 py-3 rounded-xl flex items-center justify-center gap-2 text-white">
              <Search size={14} className="text-purple-500" />
              <span className="text-[9px] font-black uppercase italic tracking-widest">Browser</span>
            </button>
            <button className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-zinc-600">
              <History size={14} />
              <span className="text-[9px] font-black uppercase italic tracking-widest">Vault ({sessions.length})</span>
            </button>
          </div>

          {/* PIANO LIST (Con design HD SAMPLES) */}
          <div className="bg-[#121212] rounded-[2.5rem] p-6 border border-white/5 flex-1 overflow-y-auto scrollbar-hide">
            <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em] mb-5 px-1">Piano</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-[4/3] bg-[#1a1a1a] rounded-3xl border-2 border-purple-600 p-5 relative shadow-2xl">
                <div className="absolute top-3 right-3 bg-purple-600 text-[6px] font-black px-2 py-0.5 rounded-full text-white tracking-tighter">HD SAMPLES</div>
                <Music className="text-purple-500 mb-4" size={24} />
                <p className="text-[11px] font-black text-white uppercase leading-[1.1]">Concert<br/>Grand</p>
              </div>
              <div className="aspect-[4/3] bg-zinc-900/30 rounded-3xl p-5 border border-white/5 relative opacity-40">
                <div className="absolute top-3 right-3 bg-zinc-800 text-[6px] font-black px-2 py-0.5 rounded-full text-zinc-500">HD SAMPLES</div>
                <Music className="text-zinc-800 mb-4" size={24} />
                <p className="text-[11px] font-black text-zinc-700 uppercase leading-[1.1]">Upright<br/>Piano</p>
              </div>
            </div>
            
            {/* Vault MP3 Export se ci sono registrazioni */}
            {sessions.length > 0 && (
              <div className="mt-8 space-y-2">
                <p className="text-[8px] font-black text-zinc-600 uppercase mb-3 px-1">Recent Takes</p>
                {sessions.map(s => (
                  <div key={s.id} className="p-4 bg-zinc-900/50 rounded-2xl flex justify-between items-center border border-white/5">
                    <span className="text-[10px] font-bold text-white tracking-tighter uppercase">Take {s.time}</span>
                    <button onClick={() => { const a = document.createElement('a'); a.href = s.url; a.download = `VocalSynth_${s.id}.mp3`; a.click(); }} className="p-2 bg-emerald-600 text-white rounded-lg"><Download size={14}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FOOTER BAR (Real-Time Idle / Volume) */}
          <div className="bg-zinc-900/90 backdrop-blur-xl rounded-[2.2rem] p-4 mb-2 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4 pl-2">
               <Activity className={mode === 'MIDI' ? 'text-purple-500' : 'text-zinc-700'} size={20} />
               <div>
                  <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Real-Time {mode}</p>
                  <p className="text-sm font-black text-white italic tracking-tighter uppercase">{mode === 'IDLE' ? 'Ready' : 'Active'}</p>
               </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Barra del volume dinamica */}
              <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                 <div className="h-full bg-purple-500 transition-all duration-75" style={{ width: `${Math.min(100, rmsVolume * 900)}%` }} />
              </div>
              <button 
                onClick={() => setIsEpicMode(!isEpicMode)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isEpicMode ? 'bg-orange-500 shadow-lg shadow-orange-900/40' : 'bg-zinc-800'}`}
              >
                 <Layers size={16} className={isEpicMode ? 'text-white' : 'text-zinc-600'} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;

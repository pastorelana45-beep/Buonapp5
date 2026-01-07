
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { 
  Music, Settings, Mic, Play, Square, Volume2, Trash2, 
  Activity, Disc, History, AudioWaveform, Clock, 
  ChevronRight, XCircle, VolumeX, Volume1, Layers, Mic2, Sparkles, ExternalLink, RefreshCw,
  Timer, Download, Zap, Hash, BrainCircuit, ListMusic, Ghost, User, Bot, Stars, ZapOff,
  MoveUp, MoveDown, Loader2
} from 'lucide-react';
import { INSTRUMENTS } from './constants';
import { Instrument, WorkstationMode, RecordedNote, StudioSession, ScaleType } from './types';
import { detectPitch, frequencyToMidi, midiToNoteName } from './services/pitchDetection';

const MIN_NOTE_DURATION = 0.03; 

const SCALES: Record<ScaleType, number[]> = {
  CHROMATIC: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  MAJOR: [0, 2, 4, 5, 7, 9, 11],
  MINOR: [0, 2, 3, 5, 7, 8, 10],
  PENTATONIC: [0, 2, 4, 7, 9]
};

type VoiceEffect = 'NORMAL' | 'ROBOT' | 'CHIPMUNK' | 'GIANT' | 'SPACE' | 'RADIO';

const VOICE_EFFECTS: { id: VoiceEffect; name: string; icon: React.ReactNode }[] = [
  { id: 'NORMAL', name: 'NORMAL', icon: <User size={14} /> },
  { id: 'ROBOT', name: 'ROBOT', icon: <Bot size={14} /> },
  { id: 'CHIPMUNK', name: 'CHIPMUNK', icon: <Zap size={14} /> },
  { id: 'GIANT', name: 'GIANT', icon: <Ghost size={14} /> },
  { id: 'SPACE', name: 'SPACE', icon: <Stars size={14} /> },
  { id: 'RADIO', name: 'RADIO', icon: <Hash size={14} /> },
];

const SAMPLE_MAPS: Record<string, any> = {
  'concert-grand': {
    urls: { 'A0': 'A0.mp3', 'C1': 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', 'A1': 'A1.mp3', 'C2': 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', 'A2': 'A2.mp3', 'C3': 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', 'A3': 'A3.mp3', 'C4': 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', 'A4': 'A4.mp3', 'C5': 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', 'A5': 'A5.mp3', 'C6': 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3', 'A6': 'A6.mp3', 'C7': 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3', 'A7': 'A7.mp3', 'C8': 'C8.mp3' },
    baseUrl: 'https://tonejs.github.io/audio/salamander/'
  },
  'rhodes-piano': {
    urls: { 'A1': 'A1.mp3', 'C2': 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', 'A2': 'A2.mp3', 'C3': 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', 'A3': 'A3.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_piano_1-mp3/'
  },
  'solo-violin': {
    urls: { 'G3': 'G3.mp3', 'A3': 'A3.mp3', 'C4': 'C4.mp3', 'D4': 'D4.mp3', 'E4': 'E4.mp3', 'G4': 'G4.mp3', 'A4': 'A4.mp3', 'C5': 'C5.mp3', 'D5': 'D5.mp3', 'E5': 'E5.mp3', 'G5': 'G5.mp3', 'A5': 'A5.mp3', 'C6': 'C6.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/violin-mp3/'
  },
  'solo-cello': {
    urls: { 'C2': 'C2.mp3', 'D2': 'D2.mp3', 'E2': 'E2.mp3', 'G2': 'G2.mp3', 'A2': 'A2.mp3', 'C3': 'C3.mp3', 'D3': 'D3.mp3', 'E3': 'E3.mp3', 'G3': 'G3.mp3', 'A3': 'A3.mp3', 'C4': 'C4.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/cello-mp3/'
  },
  'string-ensemble': {
    urls: { 'C2': 'C2.mp3', 'E2': 'E2.mp3', 'G2': 'G2.mp3', 'C3': 'C3.mp3', 'E3': 'E3.mp3', 'G3': 'G3.mp3', 'C4': 'C4.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/string_ensemble_1-mp3/'
  },
  'trumpet-solo': {
    urls: { 'E3': 'E3.mp3', 'G3': 'G3.mp3', 'A3': 'A3.mp3', 'C4': 'C4.mp3', 'D4': 'D4.mp3', 'E4': 'E4.mp3', 'G4': 'G4.mp3', 'A4': 'A4.mp3', 'C5': 'C5.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/trumpet-mp3/'
  },
  'flute-concert': {
    urls: { 'C4': 'C4.mp3', 'D4': 'D4.mp3', 'E4': 'E4.mp3', 'G4': 'G4.mp3', 'A4': 'A4.mp3', 'C5': 'C5.mp3', 'D5': 'D5.mp3', 'E5': 'E5.mp3', 'G5': 'G5.mp3', 'A5': 'A5.mp3', 'C6': 'C6.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/flute-mp3/'
  },
  'oboe-classical': {
    urls: { 'C4': 'C4.mp3', 'D4': 'D4.mp3', 'E4': 'E4.mp3', 'G4': 'G4.mp3', 'A4': 'A4.mp3', 'C5': 'C5.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/oboe-mp3/'
  },
  'clarinet-classical': {
    urls: { 'D3': 'D3.mp3', 'F3': 'F3.mp3', 'A3': 'A3.mp3', 'C4': 'C4.mp3', 'E4': 'E4.mp3', 'G4': 'G4.mp3', 'A4': 'A4.mp3', 'C5': 'C5.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/clarinet-mp3/'
  },
  'bassoon-classical': {
    urls: { 'A1': 'A1.mp3', 'C2': 'C2.mp3', 'E2': 'E2.mp3', 'G2': 'G2.mp3', 'A2': 'A2.mp3', 'C3': 'C3.mp3', 'E3': 'E3.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/bassoon-mp3/'
  },
  'soprano-sax': {
    urls: { 'C4': 'C4.mp3', 'E4': 'E4.mp3', 'G4': 'G4.mp3', 'A4': 'A4.mp3', 'C5': 'C5.mp3', 'E5': 'E5.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/soprano_sax-mp3/'
  },
  'french-horn-ensemble': {
    urls: { 'D2': 'D2.mp3', 'F2': 'F2.mp3', 'A2': 'A2.mp3', 'C3': 'C3.mp3', 'E3': 'E3.mp3', 'G3': 'G3.mp3', 'A3': 'A3.mp3', 'C4': 'C4.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/french_horn-mp3/'
  },
  'trombone-classical': {
    urls: { 'C2': 'C2.mp3', 'E2': 'E2.mp3', 'G2': 'G2.mp3', 'C3': 'C3.mp3', 'E3': 'E3.mp3', 'G3': 'G3.mp3', 'C4': 'C4.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/trombone-mp3/'
  },
  'spanish-guitar': {
    urls: { 'E2': 'E2.mp3', 'G2': 'G2.mp3', 'A2': 'A2.mp3', 'C3': 'C3.mp3', 'D3': 'D3.mp3', 'E3': 'E3.mp3', 'G3': 'G3.mp3', 'A3': 'A3.mp3', 'C4': 'C4.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3/'
  },
  'steel-string': {
    urls: { 'E2': 'E2.mp3', 'G2': 'G2.mp3', 'A2': 'A2.mp3', 'C3': 'C3.mp3', 'D3': 'D3.mp3', 'E3': 'E3.mp3', 'G3': 'G3.mp3', 'A3': 'A3.mp3', 'C4': 'C4.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_steel-mp3/'
  },
  'pipe-organ': {
    urls: { 'C2': 'C2.mp3', 'E2': 'E2.mp3', 'G2': 'G2.mp3', 'C3': 'C3.mp3', 'E3': 'E3.mp3', 'G3': 'G3.mp3', 'C4': 'C4.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/church_organ-mp3/'
  },
  'marimba-classical': {
    urls: { 'C2': 'C2.mp3', 'E2': 'E2.mp3', 'G2': 'G2.mp3', 'C3': 'C3.mp3', 'E3': 'E3.mp3', 'G3': 'G3.mp3', 'C4': 'C4.mp3', 'E4': 'E4.mp3', 'G4': 'G4.mp3', 'C5': 'C5.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/marimba-mp3/'
  },
  'celesta-pure': {
    urls: { 'C3': 'C3.mp3', 'E3': 'E3.mp3', 'G3': 'G3.mp3', 'C4': 'C4.mp3', 'E4': 'E4.mp3', 'G4': 'G4.mp3', 'C5': 'C5.mp3', 'E5': 'E5.mp3', 'G5': 'G5.mp3', 'C6': 'C6.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/celesta-mp3/'
  },
  'sitar-traditional': {
    urls: { 'C3': 'C3.mp3', 'E3': 'E3.mp3', 'G3': 'G3.mp3', 'C4': 'C4.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/sitar-mp3/'
  },
  'koto-japanese': {
    urls: { 'C3': 'C3.mp3', 'E3': 'E3.mp3', 'G3': 'G3.mp3', 'C4': 'C4.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/koto-mp3/'
  },
  'warm-pad': {
    urls: { 'C3': 'C3.mp3', 'E3': 'E3.mp3', 'G3': 'G3.mp3', 'C4': 'C4.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/synth_pad_2_warm-mp3/'
  },
  'saw-lead': {
    urls: { 'C3': 'C3.mp3', 'E3': 'E3.mp3', 'G3': 'G3.mp3', 'C4': 'C4.mp3' },
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/lead_2_sawtooth-mp3/'
  }
};

const App: React.FC = () => {
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument>(INSTRUMENTS[0]);
  const [mode, setMode] = useState<WorkstationMode>(WorkstationMode.IDLE);
  const [isStarted, setIsStarted] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [setupStep, setSetupStep] = useState<'PERMISSION' | 'SILENCE' | 'VOICE' | 'COMPLETE'>('PERMISSION');
  const [currentMidiNote, setCurrentMidiNote] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingBack, setIsPlayingBack] = useState<string | null>(null);
  const [sessions, setSessions] = useState<StudioSession[]>([]);
  const [rmsVolume, setRmsVolume] = useState(0);
  const [sensitivity, setSensitivity] = useState(0.012); 
  const [micBoost, setMicBoost] = useState(3.0); 
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'BROWSER' | 'VAULT'>('BROWSER');
  const [isInstrumentLoading, setIsInstrumentLoading] = useState(false);
  const [voiceEffect, setVoiceEffect] = useState<VoiceEffect>('NORMAL');
  const [voicePitchOffset, setVoicePitchOffset] = useState<number>(0);
  
  const [bpm, setBpm] = useState(120);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [currentScale, setCurrentScale] = useState<ScaleType>('CHROMATIC');

  const samplerRef = useRef<Tone.Sampler | null>(null);
  const vibratoRef = useRef<Tone.Vibrato | null>(null);
  const mainFxRef = useRef<{ 
    reverb: Tone.Reverb, 
    delay: Tone.FeedbackDelay, 
    filter: Tone.Filter,
    masterLimiter: Tone.Limiter,
    masterCompressor: Tone.Compressor
  } | null>(null);
  const micRef = useRef<Tone.UserMedia | null>(null);
  const analyserRef = useRef<Tone.Analyser | null>(null);
  const recorderRef = useRef<Tone.Recorder | null>(null);
  const playerRef = useRef<Tone.Player | null>(null);
  const voicePassthroughRef = useRef<Tone.Gain | null>(null);
  const metronomeRef = useRef<Tone.MembraneSynth | null>(null);
  const audioLoopIntervalRef = useRef<number | null>(null);

  const voiceFxRef = useRef<{
    pitchShift: Tone.PitchShift,
    chebyshev: Tone.Chebyshev,
    filter: Tone.Filter,
    reverb: Tone.Freeverb,
    chorus: Tone.Chorus
  } | null>(null);
  
  const stateRef = useRef({ 
    mode: WorkstationMode.IDLE, 
    isRecording: false, 
    isPlayingBack: false, 
    lastMidi: null as number | null,
    sensitivity: 0.012,
    micBoost: 3.0,
    scale: 'CHROMATIC' as ScaleType,
    voiceEffect: 'NORMAL' as VoiceEffect,
    voicePitchOffset: 0
  });
  
  const recordingNotesRef = useRef<RecordedNote[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const activeNoteStartRef = useRef<{ note: string, time: number } | null>(null);

  const groupedInstruments = useMemo(() => {
    return INSTRUMENTS.reduce((acc, inst) => {
      if (!acc[inst.category]) acc[inst.category] = [];
      acc[inst.category].push(inst);
      return acc;
    }, {} as Record<string, Instrument[]>);
  }, []);

  useEffect(() => {
    stateRef.current = { 
      ...stateRef.current,
      mode, isRecording, isPlayingBack: !!isPlayingBack, 
      sensitivity, micBoost,
      scale: currentScale,
      voiceEffect,
      voicePitchOffset
    };
    
    // Logica Volume: lo strumento suona se siamo in Replay MIDI o se siamo in modalità MIDI LIVE.
    // Durante la registrazione (WorkstationMode.RECORD), il volume è silenziato per evitare feedback.
    const isPlaybackMidi = isPlayingBack?.includes('_midi');
    const isLiveMidiFeedback = (mode === WorkstationMode.MIDI); 
    const vol = (isPlaybackMidi || isLiveMidiFeedback) ? 6 : -Infinity;

    if (samplerRef.current) {
      samplerRef.current.volume.rampTo(vol, 0.05);
    }
    
    if (voicePassthroughRef.current) {
      voicePassthroughRef.current.gain.value = (mode === WorkstationMode.VOICE) ? 1 : 0;
    }

    applyVoiceEffect(voiceEffect, voicePitchOffset);
  }, [mode, isRecording, isPlayingBack, sensitivity, micBoost, currentScale, voiceEffect, voicePitchOffset]);

  useEffect(() => {
    return () => {
      if (audioLoopIntervalRef.current) clearInterval(audioLoopIntervalRef.current);
    };
  }, []);

  const applyVoiceEffect = (fx: VoiceEffect, manualPitch: number) => {
    if (!voiceFxRef.current) return;
    const { pitchShift, chebyshev, filter, reverb, chorus } = voiceFxRef.current;
    
    pitchShift.pitch = manualPitch;
    chebyshev.wet.value = 0;
    filter.frequency.value = 20000;
    filter.type = 'lowpass';
    reverb.wet.value = 0;
    chorus.wet.value = 0;

    switch (fx) {
      case 'ROBOT':
        chebyshev.wet.value = 1;
        chebyshev.order = 50;
        chorus.wet.value = 0.5;
        chorus.frequency.value = 5;
        break;
      case 'CHIPMUNK':
        pitchShift.pitch = manualPitch + 12;
        break;
      case 'GIANT':
        pitchShift.pitch = manualPitch - 12;
        break;
      case 'SPACE':
        reverb.wet.value = 0.8;
        reverb.roomSize.value = 0.9;
        pitchShift.pitch = manualPitch - 2;
        break;
      case 'RADIO':
        filter.type = 'bandpass';
        filter.frequency.value = 1500;
        chebyshev.wet.value = 0.2;
        break;
      case 'NORMAL':
      default:
        break;
    }
  };

  const snapToScale = (midi: number, scaleType: ScaleType): number => {
    if (scaleType === 'CHROMATIC') return midi;
    const scale = SCALES[scaleType];
    const noteInOctave = midi % 12;
    const octave = Math.floor(midi / 12);
    const closest = scale.reduce((prev, curr) => Math.abs(curr - noteInOctave) < Math.abs(prev - noteInOctave) ? curr : prev);
    return octave * 12 + closest;
  };

  const applyInstrumentSettings = useCallback((instrumentId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!mainFxRef.current || !vibratoRef.current) {
        resolve();
        return;
      }
      
      setIsInstrumentLoading(true);
      const instrument = INSTRUMENTS.find(i => i.id === instrumentId) || INSTRUMENTS[0];
      const { reverb, delay, filter } = mainFxRef.current;
      
      reverb.wet.value = 0.2;
      delay.wet.value = 0.05;
      filter.frequency.value = 20000;
      vibratoRef.current.depth.value = 0;
      
      const config = SAMPLE_MAPS[instrumentId] || SAMPLE_MAPS['concert-grand'];
      
      if (samplerRef.current) {
        samplerRef.current.releaseAll();
        samplerRef.current.dispose();
      }
      
      const newSampler = new Tone.Sampler({
        urls: config.urls,
        baseUrl: config.baseUrl,
        onload: () => {
          setIsInstrumentLoading(false);
          samplerRef.current = newSampler;
          resolve();
        },
        onerror: (err) => {
          console.error("Sampler loading error:", err);
          setIsInstrumentLoading(false);
          reject(err);
        }
      }).connect(vibratoRef.current);
      
      if (instrument.category === 'STRINGS' || instrument.category === 'REED' || instrument.category === 'BRASS') {
        vibratoRef.current.depth.value = 0.15;
        vibratoRef.current.frequency.value = 5.5;
        reverb.wet.value = 0.4;
      }
    });
  }, []);

  const initAudioCore = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }
    
    if (samplerRef.current) return true;

    try {
      const masterLimiter = new Tone.Limiter(-0.5).toDestination();
      const masterCompressor = new Tone.Compressor({ threshold: -18, ratio: 3 }).connect(masterLimiter);
      const mainReverb = new Tone.Reverb({ decay: 2.5, wet: 0.2 }).connect(masterCompressor);
      const delay = new Tone.FeedbackDelay("8n", 0.1).connect(mainReverb);
      const mainFilter = new Tone.Filter(20000, "lowpass").connect(delay);
      const vibrato = new Tone.Vibrato(0, 0).connect(mainFilter);
      await mainReverb.generate();

      const sampler = new Tone.Sampler({}).connect(vibrato);
      
      const metronome = new Tone.MembraneSynth({ volume: -5 }).toDestination();
      const mic = new Tone.UserMedia();
      const analyser = new Tone.Analyser('waveform', 512); 
      const recorder = new Tone.Recorder();
      const player = new Tone.Player().connect(masterCompressor);
      
      const vChorus = new Tone.Chorus(4, 2.5, 0.5).start().connect(masterCompressor);
      const vReverb = new Tone.Freeverb().connect(vChorus);
      const vFilter = new Tone.Filter(20000, 'lowpass').connect(vReverb);
      const vCheby = new Tone.Chebyshev(50).connect(vFilter);
      const vPitch = new Tone.PitchShift(0).connect(vCheby);
      const voicePassthrough = new Tone.Gain(0).connect(vPitch);
      
      await mic.open();
      mic.connect(analyser);
      mic.connect(recorder);
      mic.connect(voicePassthrough);
      
      samplerRef.current = sampler;
      vibratoRef.current = vibrato;
      metronomeRef.current = metronome;
      mainFxRef.current = { reverb: mainReverb, delay, filter: mainFilter, masterLimiter, masterCompressor };
      micRef.current = mic;
      analyserRef.current = analyser;
      recorderRef.current = recorder;
      playerRef.current = player;
      voicePassthroughRef.current = voicePassthrough;
      voiceFxRef.current = { pitchShift: vPitch, chebyshev: vCheby, filter: vFilter, reverb: vReverb, chorus: vChorus };
      
      await applyInstrumentSettings(selectedInstrument.id);
      
      if (audioLoopIntervalRef.current) clearInterval(audioLoopIntervalRef.current);
      audioLoopIntervalRef.current = window.setInterval(audioLoop, 16); 
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const startSetupWizard = async () => {
    setIsConfiguring(true);
    setSetupStep('PERMISSION');
    const success = await initAudioCore();
    if (!success) {
      alert("Microfono richiesto per il funzionamento dell'app.");
      setIsConfiguring(false);
      return;
    }
    setSetupStep('COMPLETE');
  };

  const audioLoop = () => {
    if (!analyserRef.current || !samplerRef.current) return;
    
    const buffer = analyserRef.current.getValue() as Float32Array;
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      const boostedSample = buffer[i] * stateRef.current.micBoost;
      sum += boostedSample * boostedSample;
    }
    const rms = Math.sqrt(sum / buffer.length);
    setRmsVolume(rms);

    if (stateRef.current.isPlayingBack) return;

    const currentMode = stateRef.current.mode;
    const isMidiActive = currentMode === WorkstationMode.MIDI || currentMode === WorkstationMode.RECORD;

    if (rms > stateRef.current.sensitivity && isMidiActive) {
      const freq = detectPitch(buffer, Tone.getContext().sampleRate);
      let detectedMidi = freq ? frequencyToMidi(freq) : null;

      if (detectedMidi !== null) {
        detectedMidi = snapToScale(detectedMidi, stateRef.current.scale);
        
        if (detectedMidi !== stateRef.current.lastMidi) {
          const noteName = midiToNoteName(detectedMidi);
          if (noteName === "--") return;
          
          samplerRef.current.releaseAll();
          
          if (currentMode === WorkstationMode.RECORD && activeNoteStartRef.current) {
            const duration = Tone.now() - recordingStartTimeRef.current - activeNoteStartRef.current.time;
            if (duration >= MIN_NOTE_DURATION) {
              recordingNotesRef.current.push({ ...activeNoteStartRef.current, duration });
            }
          }
          
          // triggerAttack viene chiamato per aggiornare lo stato interno del campionatore
          // ma il suono non si sente se il volume è stato impostato a -Infinity nel useEffect
          if (samplerRef.current.loaded) {
            samplerRef.current.triggerAttack(noteName);
          }
          
          setCurrentMidiNote(detectedMidi);
          stateRef.current.lastMidi = detectedMidi;
          
          if (currentMode === WorkstationMode.RECORD) {
            activeNoteStartRef.current = { note: noteName, time: Tone.now() - recordingStartTimeRef.current };
          }
        }
      }
    } else if (stateRef.current.lastMidi !== null) {
      samplerRef.current.releaseAll();
      if (currentMode === WorkstationMode.RECORD && activeNoteStartRef.current) {
        const duration = Tone.now() - recordingStartTimeRef.current - activeNoteStartRef.current.time;
        if (duration >= MIN_NOTE_DURATION) {
          recordingNotesRef.current.push({ ...activeNoteStartRef.current, duration });
        }
        activeNoteStartRef.current = null;
      }
      stateRef.current.lastMidi = null;
      setCurrentMidiNote(null);
    }
  };

  const toggleMetronome = () => {
    if (!isMetronomeActive) {
      Tone.getTransport().bpm.value = bpm;
      Tone.getTransport().scheduleRepeat((time) => {
        metronomeRef.current?.triggerAttackRelease("C2", "16n", time);
      }, "4n");
      Tone.getTransport().start();
      setIsMetronomeActive(true);
    } else {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      setIsMetronomeActive(false);
    }
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      stopAllPlayback();
      recordingNotesRef.current = [];
      recordingStartTimeRef.current = Tone.now();
      recorderRef.current?.start();
      setIsRecording(true);
      setMode(WorkstationMode.RECORD);
      setActiveTab('BROWSER');
    } else {
      const audioBlob = await recorderRef.current?.stop();
      setIsRecording(false);
      setMode(WorkstationMode.IDLE);
      samplerRef.current?.releaseAll();
      stateRef.current.lastMidi = null;
      setCurrentMidiNote(null);
      
      if (!audioBlob) return;
      const url = URL.createObjectURL(audioBlob);
      if (activeNoteStartRef.current) {
        const duration = Tone.now() - recordingStartTimeRef.current - activeNoteStartRef.current.time;
        if (duration >= MIN_NOTE_DURATION) {
          recordingNotesRef.current.push({ ...activeNoteStartRef.current, duration });
        }
        activeNoteStartRef.current = null;
      }
      setSessions(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        midiNotes: [...recordingNotesRef.current],
        audioUrl: url,
        instrumentId: selectedInstrument.id,
        bpm: bpm,
        scale: currentScale
      }, ...prev]);
      setActiveTab('VAULT');
    }
  };

  const stopAllPlayback = () => {
    samplerRef.current?.releaseAll();
    playerRef.current?.stop();
    setIsPlayingBack(null);
    setCurrentMidiNote(null);
    stateRef.current.lastMidi = null;
  };

  const playSessionMidi = async (session: StudioSession) => {
    if (isPlayingBack) stopAllPlayback();
    
    setIsPlayingBack(session.id + "_loading");
    try {
      await applyInstrumentSettings(session.instrumentId);
      
      // Assicura che il volume sia alto durante il playback del Vault
      if (samplerRef.current) {
        samplerRef.current.volume.value = 6;
      }

      setIsPlayingBack(session.id + "_midi");
      const now = Tone.now() + 0.1;
      let maxDuration = 0;
      
      session.midiNotes.forEach(n => {
        samplerRef.current?.triggerAttackRelease(n.note, n.duration, now + n.time);
        maxDuration = Math.max(maxDuration, n.time + n.duration);
      });
      
      setTimeout(() => {
        setIsPlayingBack(null);
      }, (maxDuration * 1000) + 1000);
    } catch (e) {
      console.error("Replay failed:", e);
      setIsPlayingBack(null);
    }
  };

  const playSessionAudio = (session: StudioSession) => {
    if (isPlayingBack) stopAllPlayback();
    if (!playerRef.current) return;

    setIsPlayingBack(session.id + "_audio");
    playerRef.current.load(session.audioUrl).then(() => {
      if (playerRef.current) {
        playerRef.current.start();
        const duration = playerRef.current.buffer.duration;
        setTimeout(() => setIsPlayingBack(null), (duration * 1000) + 500);
      }
    });
  };

  const changeSessionInstrument = (sessionId: string, instrumentId: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, instrumentId } : s));
  };

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden font-sans select-none">
      
      <header className="px-6 py-4 flex justify-between items-center bg-zinc-950/80 backdrop-blur-md border-b border-white/5 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/20">
            <Music size={22} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tighter text-white">VocalSynth<span className="text-purple-500">Pro</span></h1>
            <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">Studio Engine v9.2</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           {isStarted && (
            <>
              <div className="flex bg-zinc-900 rounded-full px-3 py-1.5 items-center gap-2 border border-white/5">
                <Timer size={12} className={isMetronomeActive ? 'text-emerald-500 animate-pulse' : 'text-zinc-600'} />
                <input type="number" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="bg-transparent w-8 text-[10px] font-black outline-none text-center" />
                <button onClick={toggleMetronome} className={`text-[8px] font-black ${isMetronomeActive ? 'text-emerald-500' : 'text-zinc-600'}`}>BPM</button>
              </div>
              <button onClick={() => setShowSettings(!showSettings)} className="p-2.5 bg-zinc-900 rounded-full border border-white/5 hover:bg-zinc-800 transition-colors"><Settings size={18} /></button>
            </>
          )}
        </div>
      </header>

      {isStarted && (
        <div className="w-full h-8 bg-zinc-950 relative overflow-hidden border-b border-white/10 flex items-end">
          <div className="flex items-end justify-center w-full gap-[1px] px-1 h-full opacity-30">
             {Array.from({ length: 64 }).map((_, i) => (
                <div 
                  key={i} 
                  className="bg-gradient-to-t from-purple-900 to-purple-400 w-full transition-all duration-75"
                  style={{ height: `${Math.max(10, (rmsVolume * 600))}%` }}
                />
             ))}
          </div>
        </div>
      )}

      {isConfiguring && (
        <div className="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-10 text-center">
          <Zap size={48} className="text-purple-500 animate-pulse mb-6" />
          <h3 className="text-2xl font-black uppercase italic tracking-tighter">{setupStep}</h3>
          {setupStep === 'COMPLETE' && (
            <button onClick={() => { setIsConfiguring(false); setIsStarted(true); }} className="mt-12 w-full max-w-xs bg-white text-black py-6 rounded-3xl font-black uppercase italic shadow-2xl">Start Engine</button>
          )}
        </div>
      )}

      {isStarted && (
        <main className="flex-1 flex flex-col px-5 pb-32 overflow-hidden">
          
          <div className="grid grid-cols-2 gap-3 my-4">
             <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-2 shadow-inner">
                <span className="text-[7px] font-black text-zinc-600 tracking-widest uppercase">Scale Quantize</span>
                <div className="flex gap-1">
                   {(['CHROMATIC', 'MAJOR', 'MINOR', 'PENTATONIC'] as ScaleType[]).map(s => (
                      <button key={s} onClick={() => setCurrentScale(s)} className={`flex-1 py-1.5 rounded-lg text-[7px] font-black transition-all ${currentScale === s ? 'bg-purple-600 text-white shadow-lg' : 'bg-black text-zinc-600'}`}>{s.slice(0, 3)}</button>
                   ))}
                </div>
             </div>
             <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-2 shadow-inner">
                <span className="text-[7px] font-black text-zinc-600 tracking-widest uppercase">Real-Time Note</span>
                <div className="flex items-center justify-between h-full">
                   <span className="text-[13px] font-black text-purple-400 font-mono leading-none tracking-tighter">{currentMidiNote ? midiToNoteName(currentMidiNote) : '--'}</span>
                   <div className={`w-3 h-3 rounded-full transition-all ${rmsVolume > sensitivity ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-800'}`} />
                </div>
             </div>
          </div>

          <section className="grid grid-cols-3 gap-3 mb-5 shrink-0">
            <button onClick={() => setMode(mode === WorkstationMode.MIDI ? WorkstationMode.IDLE : WorkstationMode.MIDI)} className={`py-5 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${mode === WorkstationMode.MIDI ? 'bg-purple-600 border-purple-600 text-white shadow-lg' : 'bg-zinc-900 border-transparent text-zinc-500'}`}><Activity size={20} /><span className="text-[8px] font-black tracking-widest uppercase">MIDI LIVE</span></button>
            <button onClick={() => setMode(mode === WorkstationMode.VOICE ? WorkstationMode.IDLE : WorkstationMode.VOICE)} className={`py-5 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${mode === WorkstationMode.VOICE ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-zinc-900 border-transparent text-zinc-500'}`}><Mic2 size={20} /><span className="text-[8px] font-black tracking-widest uppercase">DIRECT</span></button>
            <button onClick={toggleRecording} className={`py-5 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${isRecording ? 'bg-red-600 border-red-600 text-white animate-pulse shadow-lg shadow-red-900/40' : 'bg-zinc-900 border-transparent text-zinc-500'}`}>{isRecording ? <Square size={20} fill="white" /> : <Disc size={20} />}<span className="text-[8px] font-black tracking-widest uppercase">{isRecording ? 'STOP' : 'REC MIDI'}</span></button>
          </section>

          {mode === WorkstationMode.VOICE && (
            <div className="mb-5 animate-in slide-in-from-top duration-200 p-4 bg-zinc-950/50 rounded-3xl border border-white/10 shadow-lg">
               <div className="flex justify-between items-center mb-4">
                  <span className="text-[9px] font-black text-blue-400 tracking-[0.2em] uppercase pl-1">Voice & Pitch</span>
                  <button onClick={() => setVoicePitchOffset(0)} className="text-[8px] font-black text-zinc-600 hover:text-white uppercase tracking-tighter">Reset</button>
               </div>
               
               <div className="flex items-center gap-4 mb-6 px-2">
                 <button onClick={() => setVoicePitchOffset(v => Math.max(-12, v - 1))} className="p-2 bg-zinc-900 rounded-lg text-zinc-400 hover:text-white active:scale-90"><MoveDown size={14} /></button>
                 <div className="flex-1 space-y-2">
                    <input 
                      type="range" min="-12" max="12" step="1" 
                      value={voicePitchOffset} 
                      onChange={(e) => setVoicePitchOffset(parseInt(e.target.value))} 
                      className="w-full h-1.5 bg-zinc-900 rounded-full appearance-none accent-blue-500 slider-custom" 
                    />
                    <div className="flex justify-center text-[8px] font-black text-blue-400 uppercase tracking-widest">{voicePitchOffset} SEMITONES</div>
                 </div>
                 <button onClick={() => setVoicePitchOffset(v => Math.min(12, v + 1))} className="p-2 bg-zinc-900 rounded-lg text-zinc-400 hover:text-white active:scale-90"><MoveUp size={14} /></button>
               </div>

               <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                 {VOICE_EFFECTS.map(fx => (
                   <button 
                    key={fx.id} onClick={() => setVoiceEffect(fx.id)}
                    className={`flex flex-col items-center justify-center min-w-[70px] py-3 rounded-xl border-2 transition-all gap-1.5 ${voiceEffect === fx.id ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}
                   >
                     {fx.icon}
                     <span className="text-[7px] font-black uppercase">{fx.name}</span>
                   </button>
                 ))}
               </div>
            </div>
          )}

          <div className="flex gap-2 mb-4 bg-zinc-950 p-1.5 rounded-2xl border border-white/5 shadow-inner">
             <button onClick={() => setActiveTab('BROWSER')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'BROWSER' ? 'bg-zinc-900 text-purple-400 font-black border border-white/10 shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}>
                <ListMusic size={16} /><span className="text-[9px] uppercase tracking-widest">Browser</span>
             </button>
             <button onClick={() => setActiveTab('VAULT')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'VAULT' ? 'bg-zinc-900 text-purple-400 font-black border border-white/10 shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}>
                <History size={16} /><span className="text-[9px] uppercase tracking-widest">Vault ({sessions.length})</span>
             </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar rounded-3xl bg-zinc-900/30 border border-white/5 p-4 shadow-inner">
            {activeTab === 'BROWSER' ? (
              <div className="space-y-6 pb-10">
                {(Object.entries(groupedInstruments) as [string, Instrument[]][]).map(([cat, insts]) => (
                  <div key={cat} className="space-y-4">
                    <h4 className="text-[9px] font-black text-zinc-600 tracking-[0.4em] uppercase pl-2">{cat}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {insts.map(inst => (
                        <button key={inst.id} onClick={() => { setSelectedInstrument(inst); applyInstrumentSettings(inst.id); }} className={`p-5 rounded-2xl border-2 transition-all text-left flex flex-col h-24 justify-between relative overflow-hidden ${selectedInstrument.id === inst.id ? 'bg-zinc-900 border-purple-600 shadow-lg' : 'bg-zinc-900/40 border-transparent'}`}>
                          {<div className="absolute top-2 right-2 text-[6px] font-black bg-purple-500 px-1 rounded shadow shadow-purple-900">HD SAMPLES</div>}
                          <Music size={16} className={selectedInstrument.id === inst.id ? 'text-purple-500' : 'text-zinc-800'} />
                          <span className={`text-[10px] font-black uppercase tracking-tighter truncate ${selectedInstrument.id === inst.id ? 'text-white' : 'text-zinc-500'}`}>{inst.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 pb-10">
                {sessions.length === 0 && <div className="py-20 text-center text-zinc-700 text-[10px] font-black uppercase tracking-[0.4em]">Vault Empty</div>}
                {sessions.map((s) => (
                  <div key={s.id} className="p-6 bg-zinc-950 rounded-3xl border border-white/10 shadow-2xl relative group overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                       <div className="flex flex-col gap-1">
                          <select 
                            value={s.instrumentId} 
                            onChange={(e) => changeSessionInstrument(s.id, e.target.value)}
                            className="bg-zinc-900 text-purple-400 text-[10px] font-black uppercase tracking-tighter rounded-lg px-2 py-1 outline-none border border-white/5"
                          >
                            {INSTRUMENTS.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                          </select>
                          <span className="text-[7px] text-zinc-600 uppercase font-bold pl-1">{new Date(s.timestamp).toLocaleTimeString()} • {s.bpm} BPM</span>
                       </div>
                       <div className="flex gap-2">
                         <button onClick={() => setSessions(prev => prev.filter(x => x.id !== s.id))} className="text-zinc-700 hover:text-red-500 transition-colors p-2"><Trash2 size={14} /></button>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => playSessionMidi(s)} 
                        disabled={isPlayingBack === s.id + "_loading"}
                        className={`py-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-3 transition-all ${isPlayingBack === s.id + "_midi" ? 'bg-purple-600 text-white shadow-lg' : isPlayingBack === s.id + "_loading" ? 'bg-zinc-800 text-zinc-400 animate-pulse' : 'bg-black active:bg-zinc-900'}`}
                      >
                        {isPlayingBack === s.id + "_loading" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                        {isPlayingBack === s.id + "_loading" ? "LOADING..." : "MIDI REPLAY"}
                      </button>
                      <button onClick={() => playSessionAudio(s)} className={`py-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-3 transition-all ${isPlayingBack === s.id + "_audio" ? 'bg-blue-600 text-white shadow-lg' : 'bg-black active:bg-zinc-900'}`}><Volume2 size={14} /> SOURCE</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* Controller Dock - Compatto */}
      {isStarted && (
        <div className="fixed bottom-4 left-4 right-4 z-[60]">
          <div className="bg-zinc-950/95 backdrop-blur-3xl border border-white/20 p-3 rounded-[1.8rem] flex items-center justify-between shadow-2xl ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-100 ${isRecording ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : mode === WorkstationMode.VOICE ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-zinc-900 text-zinc-500'}`}>
                {isRecording ? <Disc size={20} className="animate-spin-slow" /> : mode === WorkstationMode.VOICE ? <Mic size={20} /> : <AudioWaveform size={20} />}
              </div>
              <div className="flex flex-col">
                <p className="text-[8px] font-black uppercase text-zinc-500 tracking-[0.1em]">{isRecording ? 'RECORDING' : `REAL-TIME ${mode}`}</p>
                <span className="text-[12px] font-black font-mono text-zinc-200 tracking-tight leading-none mt-1">{currentMidiNote ? midiToNoteName(currentMidiNote) : mode === WorkstationMode.VOICE ? `${voiceEffect}` : 'READY'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 pr-2">
              <button onClick={stopAllPlayback} className="p-2 bg-zinc-900 rounded-xl border border-white/5 text-zinc-600 hover:text-white transition-all active:scale-90 shadow-md"><Square size={16} fill="currentColor" /></button>
              <div className="border-l border-white/10 pl-4 flex items-center h-8">
                 <p className={`text-4xl font-mono font-black italic tracking-tighter transition-all duration-100 leading-none ${currentMidiNote ? 'text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'text-zinc-900'}`}>{currentMidiNote ? String(midiToNoteName(currentMidiNote)).replace(/\d+/g, '') : '--'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="absolute inset-0 z-[150] bg-black/98 flex items-center justify-center p-8" onClick={() => setShowSettings(false)}>
           <div className="w-full max-w-sm bg-zinc-950 p-10 rounded-[3rem] border border-white/10 relative shadow-2xl" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowSettings(false)} className="absolute top-8 right-8 text-zinc-500 p-2"><XCircle size={22} /></button>
              <h3 className="text-2xl font-black uppercase italic mb-10 text-white border-b border-white/5 pb-6 tracking-tighter">Preferences</h3>
              <div className="space-y-10">
                <div className="space-y-4">
                  <div className="flex justify-between text-[11px] font-black uppercase text-zinc-500"><span>Noise Gate (Sensibilità)</span></div>
                  <input type="range" min="0.001" max="0.1" step="0.001" value={sensitivity} onChange={(e) => setSensitivity(parseFloat(e.target.value))} className="w-full h-2 bg-zinc-900 rounded-full appearance-none accent-red-600 slider-custom" />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-[11px] font-black uppercase text-zinc-500"><span>Input Boost (Volume Mic)</span></div>
                  <input type="range" min="1" max="15" step="0.5" value={micBoost} onChange={(e) => setMicBoost(parseFloat(e.target.value))} className="w-full h-2 bg-zinc-900 rounded-full appearance-none accent-purple-500 slider-custom" />
                </div>
              </div>
           </div>
        </div>
      )}

      {!isStarted && !isConfiguring && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center p-10 text-center">
          <div className="w-32 h-32 bg-white text-black rounded-[3rem] flex items-center justify-center mb-14 rotate-12 shadow-2xl shadow-purple-900/40">
            <Music size={55} />
          </div>
          <h2 className="text-8xl font-black mb-4 tracking-tighter uppercase italic leading-[0.75]">Vocal<br/><span className="text-purple-500">Synth</span></h2>
          <p className="text-zinc-700 text-[12px] mt-10 mb-24 uppercase font-bold tracking-[0.5em]">Pure Sample HD Engine</p>
          <button onClick={startSetupWizard} className="w-full max-w-sm bg-white text-black py-9 rounded-[2.5rem] font-black text-2xl active:scale-95 transition-all shadow-2xl group border-4 border-white">
             BOOT SYSTEM <ChevronRight className="inline group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }
        .slider-custom { -webkit-appearance: none; background: #18181b; border-radius: 10px; cursor: pointer; }
        .slider-custom::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; background: #fff; border-radius: 50%; border: 5px solid currentColor; box-shadow: 0 0 15px rgba(0,0,0,0.6); }
      `}</style>
    </div>
  );
};

export default App;

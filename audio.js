const LOOP_BPM = 100;
const LOOP_BARS = 4;
const SFX_LIMIT = 18;
const MUSIC_GAIN = .65;
const SFX_GAIN = .95;
let context = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let musicSource = null;
let musicBuffer = null;
let enabled = true;
let musicRequested = false;
let musicPaused = false;
let musicVolume = 0;
let sfxVolume = 1;
let activeSfx = 0;
const sampleBuffers = new Map();
const lastPlayed = new Map();

function getContext() {
  const AudioContextConstructor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  if (!context) {
    context = new AudioContextConstructor();
    masterGain = context.createGain();
    musicGain = context.createGain();
    sfxGain = context.createGain();
    masterGain.gain.value = enabled ? 1 : 0;
    musicGain.gain.value = musicPaused ? 0 : MUSIC_GAIN * musicVolume;
    sfxGain.gain.value = SFX_GAIN * sfxVolume;
    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(context.destination);
  }
  return context;
}

function resumeContext(audioContext) {
  if (audioContext.state !== 'suspended') return;
  const result = audioContext.resume();
  result?.catch(error => console.warn('Audio playback could not be resumed.', error));
}

function rampGain(gain, value, audioContext) {
  const now = audioContext.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setTargetAtTime(value, now, .08);
}

function addTone(left, right, sampleRate, start, duration, frequency, volume, options = {}) {
  const startIndex = Math.max(0, Math.floor(start * sampleRate));
  const endIndex = Math.min(left.length, Math.ceil((start + duration) * sampleRate));
  const pan = options.pan || 0;
  const decay = options.decay ?? 5;
  const wave = options.wave || 'sine';
  for (let index = startIndex; index < endIndex; index++) {
    const time = (index - startIndex) / sampleRate;
    const progress = time / duration;
    const phase = 2 * Math.PI * frequency * time + (options.vibrato || 0) * Math.sin(2 * Math.PI * 5 * time);
    const cycle = phase / (2 * Math.PI);
    const fundamental = wave === 'triangle' ? 2 / Math.PI * Math.asin(Math.sin(phase))
      : wave === 'saw' ? 2 * (cycle - Math.floor(cycle + .5))
        : wave === 'square' ? Math.sign(Math.sin(phase)) : Math.sin(phase);
    const overtone = Math.sin(phase * 2) * (options.overtone || 0);
    const envelope = Math.min(1, time * 600) * Math.pow(1 - progress, 1.4) * Math.exp(-decay * time);
    const value = (fundamental + overtone) * volume * envelope;
    left[index] += value * (1 - pan) * .5;
    right[index] += value * (1 + pan) * .5;
  }
}

function addSweep(left, right, sampleRate, start, duration, from, to, volume, options = {}) {
  const startIndex = Math.max(0, Math.floor(start * sampleRate));
  const endIndex = Math.min(left.length, Math.ceil((start + duration) * sampleRate));
  const pan = options.pan || 0;
  for (let index = startIndex; index < endIndex; index++) {
    const time = (index - startIndex) / sampleRate;
    const progress = time / duration;
    const phase = 2 * Math.PI * (from * time + (to - from) * time * time / (2 * duration));
    const fundamental = options.wave === 'saw'
      ? 2 * (phase / (2 * Math.PI) - Math.floor(phase / (2 * Math.PI) + .5))
      : Math.sin(phase);
    const envelope = Math.min(1, time * 800) * Math.pow(1 - progress, options.shape || 1.6) * Math.exp(-(options.decay || 2) * time);
    const value = fundamental * volume * envelope;
    left[index] += value * (1 - pan) * .5;
    right[index] += value * (1 + pan) * .5;
  }
}

function addNoise(left, right, sampleRate, start, duration, volume, options = {}) {
  const startIndex = Math.max(0, Math.floor(start * sampleRate));
  const endIndex = Math.min(left.length, Math.ceil((start + duration) * sampleRate));
  const pan = options.pan || 0;
  let seed = options.seed || 193;
  for (let index = startIndex; index < endIndex; index++) {
    seed = (seed * 16807) % 2147483647;
    const time = (index - startIndex) / sampleRate;
    const progress = time / duration;
    const envelope = Math.min(1, time * 1200) * Math.pow(1 - progress, options.shape || 2) * Math.exp(-(options.decay || 8) * time);
    const value = (seed / 1073741823.5 - 1) * volume * envelope;
    left[index] += value * (1 - pan) * .5;
    right[index] += value * (1 + pan) * .5;
  }
}

function makeBuffer(audioContext, duration, build, loop = false) {
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(2, Math.ceil(duration * sampleRate), sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  build(left, right, sampleRate, duration);
  const fadeFrames = Math.floor(sampleRate * (loop ? .035 : .008));
  for (let index = 0; index < left.length; index++) {
    const fade = loop ? Math.min(1, index / fadeFrames, (left.length - index - 1) / fadeFrames) : Math.min(1, (left.length - index) / fadeFrames);
    left[index] = Math.tanh(left[index] * .9) * fade;
    right[index] = Math.tanh(right[index] * .9) * fade;
  }
  return buffer;
}

function makeMusicBuffer(audioContext) {
  const beat = 60 / LOOP_BPM;
  const bar = beat * 4;
  const duration = bar * LOOP_BARS;
  const chords = [
    { bass: 73.42, notes: [293.66, 349.23, 440] },
    { bass: 58.27, notes: [233.08, 293.66, 349.23] },
    { bass: 87.31, notes: [261.63, 349.23, 440] },
    { bass: 65.41, notes: [261.63, 329.63, 392] }
  ];
  const sequence = [0, 1, 2, 1, 0, 2, 1, 2];
  return makeBuffer(audioContext, duration, (left, right, sampleRate) => {
    addTone(left, right, sampleRate, 0, duration, 55, .012, { decay: .02, overtone: .16 });
    for (let barIndex = 0; barIndex < LOOP_BARS; barIndex++) {
      const start = barIndex * bar;
      const chord = chords[barIndex];
      chord.notes.forEach((note, index) => {
        addTone(left, right, sampleRate, start, bar, note, .045, { wave: 'saw', decay: .025, overtone: .1, vibrato: 1.3, pan: (index - 1) * .22 });
        addTone(left, right, sampleRate, start, bar, note * 2, .012, { wave: 'triangle', decay: .04, pan: (index - 1) * .28 });
      });
      for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
        const beatStart = start + beatIndex * beat;
        if (beatIndex % 2 === 0) {
          addTone(left, right, sampleRate, beatStart, .32, chord.bass, .3, { decay: 5, overtone: .2 });
          addTone(left, right, sampleRate, beatStart, .3, chord.bass / 2, .12, { decay: 5, wave: 'triangle' });
          addSweep(left, right, sampleRate, beatStart, .2, 118, 43, .28, { decay: 8, shape: 1.2 });
          addNoise(left, right, sampleRate, beatStart, .055, .045, { decay: 45, seed: barIndex * 23 + beatIndex + 15 });
        } else {
          addNoise(left, right, sampleRate, beatStart, .13, .065, { decay: 18, seed: barIndex * 17 + beatIndex + 31 });
          addTone(left, right, sampleRate, beatStart, .12, 1180, .04, { decay: 20, pan: .35 });
        }
      }
      for (let step = 0; step < sequence.length; step++) {
        const note = chord.notes[sequence[step]];
        const octave = step === 6 ? .5 : 1;
        addTone(left, right, sampleRate, start + step * beat / 2, .24, note * 2 * octave, .13, {
          decay: 8,
          overtone: .38,
          pan: step % 2 ? .18 : -.18,
          wave: 'triangle',
          vibrato: 1.1
        });
      }
    }
  }, true);
}

function makeSample(audioContext, name) {
  const durationByName = {
    shot: .16, fire: .38, frost: .34, turret: .2, hit: .18, hurt: .42,
    melee: .28, tech: .36, skill: .54, ultimate: 1.1, overdrive: .72,
    explosion: .52, evade: .3, kill: .26, level: .78, coin: .22,
    wave: .38, victory: 1.4, defeat: .9, menu: .075
  };
  const duration = durationByName[name];
  if (!duration) return null;
  return makeBuffer(audioContext, duration, (left, right, sampleRate) => {
    if (name === 'shot') {
      addNoise(left, right, sampleRate, 0, .035, .48, { decay: 62, seed: 51, shape: 3 });
      addSweep(left, right, sampleRate, 0, .14, 280, 48, .43, { decay: 11, shape: 1.25 });
      addTone(left, right, sampleRate, .012, .1, 84, .19, { wave: 'triangle', decay: 12, overtone: .35 });
    } else if (name === 'fire') {
      addNoise(left, right, sampleRate, 0, .34, .27, { decay: 5, seed: 301, shape: 1.1 });
      addSweep(left, right, sampleRate, 0, .31, 170, 47, .39, { decay: 4, shape: 1.2 });
      addTone(left, right, sampleRate, .025, .32, 132, .19, { wave: 'saw', decay: 4.5, overtone: .55 });
      addNoise(left, right, sampleRate, .13, .22, .1, { decay: 8, seed: 113, pan: .2 });
    } else if (name === 'frost') {
      addNoise(left, right, sampleRate, 0, .21, .26, { decay: 10, seed: 337, shape: 1.3 });
      addSweep(left, right, sampleRate, 0, .29, 520, 95, .3, { decay: 5, shape: 1.2 });
      addTone(left, right, sampleRate, .012, .29, 1180, .1, { wave: 'triangle', decay: 7, overtone: .4 });
      addTone(left, right, sampleRate, .045, .18, 1760, .07, { decay: 13, pan: .18 });
    } else if (name === 'turret') {
      addNoise(left, right, sampleRate, 0, .035, .42, { decay: 52, seed: 71, shape: 3 });
      addSweep(left, right, sampleRate, 0, .16, 300, 72, .37, { decay: 10 });
      addTone(left, right, sampleRate, .018, .15, 560, .16, { wave: 'saw', decay: 13, overtone: .4, pan: .12 });
      addTone(left, right, sampleRate, .035, .13, 930, .08, { decay: 17, pan: -.16 });
    } else if (name === 'hit') {
      addNoise(left, right, sampleRate, 0, .035, .55, { decay: 55, seed: 101, shape: 3 });
      addSweep(left, right, sampleRate, 0, .16, 190, 52, .47, { decay: 12 });
      addTone(left, right, sampleRate, .008, .14, 92, .23, { wave: 'triangle', decay: 12, overtone: .5 });
      addTone(left, right, sampleRate, .018, .12, 430, .1, { wave: 'saw', decay: 19, pan: .14 });
    } else if (name === 'hurt') {
      addSweep(left, right, sampleRate, 0, .4, 190, 48, .45, { decay: 2, shape: .9 });
      addTone(left, right, sampleRate, .025, .32, 72, .28, { wave: 'triangle', decay: 3, overtone: .55 });
      addNoise(left, right, sampleRate, .015, .3, .22, { decay: 5, seed: 47, shape: 1.15 });
    } else if (name === 'skill') {
      addNoise(left, right, sampleRate, 0, .4, .14, { decay: 3, seed: 81, shape: 1.1 });
      addSweep(left, right, sampleRate, .015, .42, 105, 390, .3, { decay: 2.8, shape: 1.2 });
      addTone(left, right, sampleRate, .04, .42, 208, .23, { wave: 'saw', decay: 2.8, overtone: .55, vibrato: 2.4 });
      addTone(left, right, sampleRate, .08, .36, 311, .12, { wave: 'triangle', decay: 3.8, overtone: .5, pan: -.2 });
      addNoise(left, right, sampleRate, .19, .3, .07, { decay: 8, seed: 127, pan: .2 });
    } else if (name === 'melee') {
      addNoise(left, right, sampleRate, 0, .22, .22, { decay: 8, seed: 263, shape: 1.2 });
      addSweep(left, right, sampleRate, 0, .2, 680, 140, .22, { decay: 6, shape: 1.1 });
      addTone(left, right, sampleRate, .06, .18, 980, .18, { wave: 'saw', decay: 15, overtone: .38, pan: .16 });
      addNoise(left, right, sampleRate, .075, .12, .17, { decay: 22, seed: 59, pan: -.12 });
    } else if (name === 'tech') {
      addTone(left, right, sampleRate, 0, .3, 104, .22, { wave: 'saw', decay: 3, overtone: .42 });
      addSweep(left, right, sampleRate, .015, .27, 105, 255, .24, { decay: 3.2, wave: 'saw' });
      addNoise(left, right, sampleRate, .02, .24, .12, { decay: 10, seed: 157 });
      addTone(left, right, sampleRate, .13, .16, 720, .13, { wave: 'square', decay: 13, pan: .18 });
    } else if (name === 'ultimate') {
      addNoise(left, right, sampleRate, 0, .75, .24, { decay: 2.6, seed: 241, shape: .85 });
      addSweep(left, right, sampleRate, 0, .88, 150, 34, .58, { decay: 1.5, shape: .8 });
      addTone(left, right, sampleRate, .025, .95, 48, .33, { wave: 'triangle', decay: 1.5, overtone: .55 });
      addTone(left, right, sampleRate, .16, .7, 126, .18, { wave: 'saw', decay: 2.1, overtone: .4, pan: .12 });
      addNoise(left, right, sampleRate, .21, .53, .16, { decay: 4, seed: 89, pan: -.14 });
      addTone(left, right, sampleRate, .43, .48, 390, .09, { decay: 3.4, pan: -.2 });
    } else if (name === 'overdrive') {
      addTone(left, right, sampleRate, 0, .66, 72, .25, { wave: 'saw', decay: 1.8, overtone: .55 });
      addSweep(left, right, sampleRate, 0, .56, 90, 460, .34, { decay: 1.7, wave: 'saw', shape: 1.1 });
      addNoise(left, right, sampleRate, .03, .55, .18, { decay: 2.4, seed: 431 });
      addTone(left, right, sampleRate, .18, .38, 860, .1, { wave: 'square', decay: 5, pan: .15 });
    } else if (name === 'explosion') {
      addNoise(left, right, sampleRate, 0, .48, .42, { decay: 3, seed: 251, shape: .9 });
      addSweep(left, right, sampleRate, 0, .46, 160, 32, .56, { decay: 2.5, shape: .9 });
      addTone(left, right, sampleRate, .025, .44, 58, .26, { wave: 'triangle', decay: 2.7, overtone: .45 });
      addNoise(left, right, sampleRate, .12, .31, .17, { decay: 5, seed: 197, pan: .18 });
    } else if (name === 'evade') {
      addNoise(left, right, sampleRate, 0, .27, .33, { decay: 7, seed: 109, shape: 1.4 });
      addSweep(left, right, sampleRate, 0, .24, 420, 72, .2, { decay: 6, shape: 1.2, pan: .12 });
      addTone(left, right, sampleRate, .03, .19, 110, .1, { wave: 'triangle', decay: 6 });
    } else if (name === 'kill') {
      addNoise(left, right, sampleRate, 0, .045, .34, { decay: 42, seed: 187, shape: 2.5 });
      addSweep(left, right, sampleRate, 0, .19, 250, 82, .28, { decay: 10 });
      addTone(left, right, sampleRate, .012, .16, 740, .08, { wave: 'saw', decay: 15, pan: .15 });
    } else if (name === 'level' || name === 'victory') {
      const notes = name === 'level' ? [523.25, 659.25, 783.99, 1046.5] : [392, 493.88, 587.33, 783.99, 987.77];
      notes.forEach((note, index) => addTone(left, right, sampleRate, index * .11, name === 'level' ? .48 : .95, note, .13, {
        decay: name === 'level' ? 5 : 2.4,
        overtone: .2,
        pan: (index % 2 ? 1 : -1) * .18
      }));
      if (name === 'victory') addTone(left, right, sampleRate, .12, 1.1, 196, .16, { wave: 'triangle', decay: 1.4 });
    } else if (name === 'coin' || name === 'menu') {
      const base = name === 'coin' ? 1046.5 : 587.33;
      addTone(left, right, sampleRate, 0, duration * .9, base, .12, { decay: 14 });
      if (name === 'coin') addTone(left, right, sampleRate, .055, .15, 1567.98, .075, { decay: 12, pan: .18 });
    } else if (name === 'wave') {
      addSweep(left, right, sampleRate, 0, .3, 150, 55, .34, { decay: 7 });
      addNoise(left, right, sampleRate, 0, .08, .18, { decay: 25, seed: 181 });
      addTone(left, right, sampleRate, .09, .24, 220, .12, { wave: 'saw', decay: 7, overtone: .3 });
    } else if (name === 'defeat') {
      addTone(left, right, sampleRate, 0, .75, 196, .17, { wave: 'triangle', decay: 2 });
      addTone(left, right, sampleRate, .12, .68, 146.83, .12, { decay: 2.4 });
      addNoise(left, right, sampleRate, 0, .38, .035, { decay: 7, seed: 91 });
    }
  });
}

function sampleFor(audioContext, name) {
  if (!sampleBuffers.has(name)) sampleBuffers.set(name, makeSample(audioContext, name));
  return sampleBuffers.get(name);
}

export function unlockAudio() {
  const audioContext = getContext();
  if (!audioContext) return false;
  resumeContext(audioContext);
  return true;
}

export function startMusic() {
  musicRequested = true;
  if (!enabled) return false;
  const audioContext = getContext();
  if (!audioContext) return false;
  resumeContext(audioContext);
  if (musicSource) return true;
  musicBuffer ||= makeMusicBuffer(audioContext);
  musicSource = audioContext.createBufferSource();
  musicSource.buffer = musicBuffer;
  musicSource.loop = true;
  musicSource.connect(musicGain);
  rampGain(musicGain, musicPaused ? 0 : MUSIC_GAIN * musicVolume, audioContext);
  musicSource.start();
  return true;
}

export function pauseMusic() {
  musicPaused = true;
  if (context && musicGain) rampGain(musicGain, 0, context);
}

export function resumeMusic() {
  musicPaused = false;
  if (musicRequested) startMusic();
}

export function isAudioEnabled() {
  return enabled;
}

function normalizeVolume(value) {
  if (!Number.isFinite(value)) throw new TypeError('Audio volume must be a finite number');
  return Math.max(0, Math.min(1, value));
}

export function getMusicVolume() {
  return musicVolume;
}

export function setMusicVolume(value) {
  musicVolume = normalizeVolume(value);
  if (context && musicGain) rampGain(musicGain, musicPaused ? 0 : MUSIC_GAIN * musicVolume, context);
  return musicVolume;
}

export function getSfxVolume() {
  return sfxVolume;
}

export function setSfxVolume(value) {
  sfxVolume = normalizeVolume(value);
  if (context && sfxGain) rampGain(sfxGain, SFX_GAIN * sfxVolume, context);
  return sfxVolume;
}

export function setAudioEnabled(value) {
  enabled = Boolean(value);
  const audioContext = context;
  if (audioContext && masterGain) rampGain(masterGain, enabled ? 1 : 0, audioContext);
  if (enabled) {
    unlockAudio();
    if (musicRequested) startMusic();
  }
  return enabled;
}

export function playSound(name, options = {}) {
  if (!enabled) return false;
  const audioContext = getContext();
  if (!audioContext) return false;
  const sample = sampleFor(audioContext, name);
  if (!sample) return false;
  const now = audioContext.currentTime;
  const previous = lastPlayed.get(name) ?? -Infinity;
  if (now - previous < (options.minInterval ?? .045) || activeSfx >= SFX_LIMIT) return false;
  lastPlayed.set(name, now);
  resumeContext(audioContext);
  const source = audioContext.createBufferSource();
  source.buffer = sample;
  source.playbackRate.value = options.pitch ?? 1;
  const voiceGain = audioContext.createGain();
  voiceGain.gain.value = options.volume ?? 1;
  source.connect(voiceGain);
  voiceGain.connect(sfxGain);
  activeSfx++;
  source.onended = () => { activeSfx = Math.max(0, activeSfx - 1); };
  source.start(now);
  return true;
}

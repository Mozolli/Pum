import test from 'node:test';
import assert from 'node:assert/strict';

class FakeAudioParam {
  value = 0;
  cancelScheduledValues() {}
  setTargetAtTime(value) { this.value = value; }
}

class FakeAudioNode {
  connections = [];
  connect(node) { this.connections.push(node); }
}

class FakeAudioBuffer {
  constructor(channels, length, sampleRate) {
    this.channels = Array.from({ length: channels }, () => new Float32Array(length));
    this.length = length;
    this.sampleRate = sampleRate;
  }
  getChannelData(channel) { return this.channels[channel]; }
}

class FakeAudioContext {
  static instances = [];
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new FakeAudioNode();
  gains = [];
  sources = [];
  constructor() { FakeAudioContext.instances.push(this); }
  createGain() {
    const node = new FakeAudioNode();
    node.gain = new FakeAudioParam();
    this.gains.push(node);
    return node;
  }
  createBuffer(channels, length, sampleRate) { return new FakeAudioBuffer(channels, length, sampleRate); }
  createBufferSource() {
    const node = new FakeAudioNode();
    node.playbackRate = new FakeAudioParam();
    node.start = () => { node.started = true; };
    this.sources.push(node);
    return node;
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
}

test('music is muted by default while sound effects remain enabled', async () => {
  const savedAudioContext = globalThis.AudioContext;
  globalThis.AudioContext = FakeAudioContext;
  try {
    const audio = await import('./audio.js?muted-default');
    assert.equal(audio.getMusicVolume(), 0);
    assert.equal(audio.getSfxVolume(), 1);
    assert.equal(audio.isAudioEnabled(), true);
    assert.equal(audio.startMusic(), true);
    const context = FakeAudioContext.instances.at(-1);
    assert.equal(context.gains[1].gain.value, 0);
    assert.equal(audio.playSound('shot'), true);
    assert.equal(context.gains[2].gain.value, .95);
  } finally {
    globalThis.AudioContext = savedAudioContext;
  }
});

test('audio degrades gracefully when Web Audio is unavailable', async () => {
  const savedAudioContext = globalThis.AudioContext;
  const savedWebkitAudioContext = globalThis.webkitAudioContext;
  globalThis.AudioContext = undefined;
  globalThis.webkitAudioContext = undefined;
  try {
    const audio = await import('./audio.js?unsupported');
    assert.equal(audio.unlockAudio(), false);
    assert.equal(audio.startMusic(), false);
    assert.equal(audio.playSound('hit'), false);
  } finally {
    globalThis.AudioContext = savedAudioContext;
    globalThis.webkitAudioContext = savedWebkitAudioContext;
  }
});

test('music and effects volumes are independent and mute all preserves their levels', async () => {
  const savedAudioContext = globalThis.AudioContext;
  globalThis.AudioContext = FakeAudioContext;
  try {
    const audio = await import('./audio.js?volume-controls');
    assert.equal(audio.startMusic(), true);
    const context = FakeAudioContext.instances.at(-1);
    assert.equal(audio.setMusicVolume(.4), .4);
    assert.equal(audio.setSfxVolume(.3), .3);
    assert.equal(context.gains[1].gain.value, .65 * .4);
    assert.equal(context.gains[2].gain.value, .95 * .3);

    audio.setAudioEnabled(false);
    assert.equal(context.gains[0].gain.value, 0);
    audio.setMusicVolume(.8);
    assert.equal(context.gains[1].gain.value, .65 * .8);
    assert.equal(context.gains[0].gain.value, 0, 'changing a channel must not unmute master audio');
    audio.setAudioEnabled(true);
    assert.equal(context.gains[0].gain.value, 1);
    assert.equal(audio.getMusicVolume(), .8);
    assert.equal(audio.getSfxVolume(), .3);
    assert.equal(audio.setMusicVolume(2), 1);
    assert.equal(audio.setSfxVolume(-1), 0);
  } finally {
    globalThis.AudioContext = savedAudioContext;
  }
});

test('generated theme loops and sound effects respect mute and rate limits', async () => {
  const savedAudioContext = globalThis.AudioContext;
  globalThis.AudioContext = FakeAudioContext;
  try {
    const audio = await import('./audio.js?fake');
    audio.setMusicVolume(1);
    assert.equal(audio.startMusic(), true);
    const context = FakeAudioContext.instances.at(-1);
    const music = context.sources[0];
    assert.equal(music.loop, true);
    assert.equal(music.started, true);
    assert.ok(music.buffer.length > context.sampleRate * 8);
    const musicSamples = music.buffer.getChannelData(0);
    const musicRms = Math.sqrt(musicSamples.reduce((sum, sample) => sum + sample * sample, 0) / musicSamples.length);
    assert.ok(musicRms > .02, 'the generated music should have a clearly audible mix level');
    assert.ok(context.gains[1].gain.value >= .6, 'the music channel should not be mixed far below effects');

    assert.equal(audio.playSound('shot'), true);
    assert.equal(audio.playSound('shot'), false, 'duplicate rapid shots should be rate-limited');
    const shot = context.sources[1];
    assert.ok(shot.buffer.getChannelData(0).some(sample => sample !== 0));
    assert.equal(audio.playSound('explosion'), true);
    const explosion = context.sources[2].buffer.getChannelData(0);
    assert.ok(Math.max(...explosion) > .12, 'impact samples should have a strong transient');

    assert.equal(audio.setAudioEnabled(false), false);
    assert.equal(context.gains[0].gain.value, 0);
    assert.equal(audio.playSound('hit'), false);
    assert.equal(audio.setAudioEnabled(true), true);
    assert.equal(context.gains[0].gain.value, 1);
  } finally {
    globalThis.AudioContext = savedAudioContext;
  }
});

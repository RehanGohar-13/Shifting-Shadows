// ============================================
// SHIFTING SHADOWS — Sound System
// ============================================

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.ambientNode = null;
    this.heartbeatNode = null;
    this.masterVolume = null;
    this.muted = false;
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterVolume = this.ctx.createGain();
    this.masterVolume.gain.value = 0.5;
    this.masterVolume.connect(this.ctx.destination);
    this.initialized = true;
  }

  // ── FOOTSTEPS ──
  playFootstep() {
    if (!this.initialized) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 200 + Math.random() * 100;

    osc.type = "triangle";
    osc.frequency.value = 60 + Math.random() * 40;

    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // ── RUNNING FOOTSTEPS (louder + faster) ──
  playRunStep() {
    if (!this.initialized) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.value = 80 + Math.random() * 60;

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.masterVolume);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // ── SOUL COLLECT ──
  playSoulCollect() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    // Ethereal chime — two harmonics
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(600 + i * 200, t);
      osc.frequency.exponentialRampToValueAtTime(900 + i * 300, t + 0.3);

      gain.gain.setValueAtTime(0.15, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5 + i * 0.08);

      osc.connect(gain);
      gain.connect(this.masterVolume);

      osc.start(t + i * 0.08);
      osc.stop(t + 0.6 + i * 0.08);
    }
  }

  // ── RIFT OPEN ──
  playRiftOpen() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.8);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(203, t);
    osc2.frequency.exponentialRampToValueAtTime(806, t + 0.8);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterVolume);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + 1.0);
    osc2.stop(t + 1.0);
  }

  // ── CANDLE PLACE ──
  playCandlePlace() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    // Soft flame ignite
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2000;
    filter.Q.value = 2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume);

    noise.start(t);
    noise.stop(t + 0.3);
  }

  // ── ROCK THROW ──
  playRockThrow() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterVolume);

    osc.start(t);
    osc.stop(t + 0.2);

    // Impact sound after delay
    setTimeout(() => {
      const impact = this.ctx.createOscillator();
      const impactGain = this.ctx.createGain();

      impact.type = "triangle";
      impact.frequency.value = 100 + Math.random() * 50;

      impactGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      impactGain.gain.exponentialRampToValueAtTime(
        0.001,
        this.ctx.currentTime + 0.1,
      );

      impact.connect(impactGain);
      impactGain.connect(this.masterVolume);

      impact.start();
      impact.stop(this.ctx.currentTime + 0.1);
    }, 200);
  }

  // ── PHANTOM DRONE (proximity) ──
  startPhantomDrone() {
    if (!this.initialized || this.ambientNode) return;

    this.ambientNode = this.ctx.createOscillator();
    const ambientGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    this.ambientNode.type = "sawtooth";
    this.ambientNode.frequency.value = 40;

    filter.type = "lowpass";
    filter.frequency.value = 100;

    ambientGain.gain.value = 0;
    this.ambientGain = ambientGain;

    this.ambientNode.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(this.masterVolume);

    this.ambientNode.start();
  }

  updatePhantomDrone(distToPhantom) {
    if (!this.ambientGain) return;

    if (distToPhantom < 300) {
      const intensity = (300 - distToPhantom) / 300;
      this.ambientGain.gain.value = intensity * 0.15;
    } else {
      this.ambientGain.gain.value = 0;
    }
  }

  // ── HEARTBEAT ──
  playHeartbeat(speed) {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    // Double thump
    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(50, t + i * 0.12);
      osc.frequency.exponentialRampToValueAtTime(30, t + i * 0.12 + 0.15);

      gain.gain.setValueAtTime(0.2, t + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.2);

      osc.connect(gain);
      gain.connect(this.masterVolume);

      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.2);
    }
  }

  // ── DEATH SOUND ──
  playDeath() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    // Deep descending tone
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 1.5);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(305, t);
    osc2.frequency.exponentialRampToValueAtTime(28, t + 1.5);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterVolume);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + 1.5);
    osc2.stop(t + 1.5);

    // Static noise burst
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    noise.connect(noiseGain);
    noiseGain.connect(this.masterVolume);
    noise.start(t);
    noise.stop(t + 0.5);
  }

  // ── MUTATION REVEAL ──
  playMutationReveal() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    // Deep bass hit
    const bass = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bass.type = "sine";
    bass.frequency.value = 40;
    bassGain.gain.setValueAtTime(0.3, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    bass.connect(bassGain);
    bassGain.connect(this.masterVolume);
    bass.start(t);
    bass.stop(t + 1.0);

    // Eerie rising tone
    const rise = this.ctx.createOscillator();
    const riseGain = this.ctx.createGain();
    rise.type = "sine";
    rise.frequency.setValueAtTime(200, t + 0.3);
    rise.frequency.exponentialRampToValueAtTime(600, t + 1.5);
    riseGain.gain.setValueAtTime(0, t);
    riseGain.gain.linearRampToValueAtTime(0.1, t + 0.5);
    riseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    rise.connect(riseGain);
    riseGain.connect(this.masterVolume);
    rise.start(t + 0.3);
    rise.stop(t + 1.8);

    // Glitch noise
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    for (let i = 0; i < 3; i++) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.08, t + 0.1 + i * 0.15);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2 + i * 0.15);
      noise.connect(nGain);
      nGain.connect(this.masterVolume);
      noise.start(t + 0.1 + i * 0.15);
      noise.stop(t + 0.25 + i * 0.15);
    }
  }

  // ── AMBIENT BACKGROUND ──
  startAmbient() {
    if (!this.initialized) return;

    // Low drone
    const drone = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();
    const droneFilter = this.ctx.createBiquadFilter();

    drone.type = "sine";
    drone.frequency.value = 55;

    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 80;

    droneGain.gain.value = 0.04;

    drone.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(this.masterVolume);

    drone.start();

    // Subtle wind noise
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const wind = this.ctx.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 400;

    const windGain = this.ctx.createGain();
    windGain.gain.value = 0.02;

    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.masterVolume);

    wind.start();
  }

  // ── LEVEL COMPLETE ──
  playLevelComplete() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    const notes = [400, 500, 600, 800];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.12, t + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.4);

      osc.connect(gain);
      gain.connect(this.masterVolume);

      osc.start(t + i * 0.15);
      osc.stop(t + i * 0.15 + 0.4);
    });
  }

  // ── WHISPER ──
  playWhisper() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env * 0.3;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 800 + Math.random() * 400;
    filter.Q.value = 10;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume);

    noise.start(t);
    noise.stop(t + 0.8);
  }

  // ── JUMPSCARE STING ──
  playJumpscare() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    // Sharp dissonant chord
    const freqs = [200, 267, 317, 450];
    freqs.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.masterVolume);

      osc.start(t);
      osc.stop(t + 0.4);
    });

    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.2, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    noise.connect(nGain);
    nGain.connect(this.masterVolume);
    noise.start(t);
    noise.stop(t + 0.2);
  }

  playAmbientScare() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    const type = Math.floor(Math.random() * 3);

    if (type === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(400 + Math.random() * 200, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 1.2);

      filter.type = "lowpass";
      filter.frequency.value = 800;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterVolume);
      osc.start(t);
      osc.stop(t + 1.2);
    } else if (type === 1) {
      const bufferSize = this.ctx.sampleRate * 0.6;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin(i / 200);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 400;
      filter.Q.value = 3;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterVolume);
      noise.start(t);
      noise.stop(t + 0.6);
    } else {
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const env = Math.sin((i / bufferSize) * Math.PI * 3);
        data[i] = (Math.random() * 2 - 1) * Math.abs(env) * 0.4;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 300;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.06;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterVolume);
      noise.start(t);
      noise.stop(t + 1.5);
    }
  }

  stopAll() {
    if (this.ambientNode) {
      this.ambientNode.stop();
      this.ambientNode = null;
      this.ambientGain = null;
    }
  }
}

export const sound = new SoundSystem();

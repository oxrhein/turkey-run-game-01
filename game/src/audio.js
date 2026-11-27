// All sound is synthesized with WebAudio: no audio files ship with the game.
// A gobble, a corn chime that climbs with the combo, a thud, a dash whoosh, a
// caught sting, a freedom fanfare, and a quiet two-bar bass loop under play.
export function createSoundBank() {
  let ctx = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (!ctx) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        ctx = new AudioCtx();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain, when = 0, slideTo = null) {
    const ac = ensure();
    if (!ac || muted) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, gain, when = 0, lowpass = 1200) {
    const ac = ensure();
    if (!ac || muted) return;
    const t0 = ac.currentTime + when;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const amp = ac.createGain();
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(amp).connect(ac.destination);
    src.start(t0);
  }

  /** The turkey's own voice: three quick descending blips. */
  function gobble() {
    tone(520, 0.09, 'square', 0.1, 0, 380);
    tone(460, 0.09, 'square', 0.1, 0.1, 330);
    tone(400, 0.14, 'square', 0.1, 0.2, 260);
  }

  /** Corn pickup: a bright chime that climbs a semitone per combo step. */
  function corn(combo) {
    const base = 660 * Math.pow(2, (Math.min(combo, 5) - 1) / 12);
    tone(base, 0.12, 'sine', 0.16);
    tone(base * 1.5, 0.16, 'sine', 0.12, 0.05);
  }

  function thud() {
    noise(0.18, 0.3, 0, 500);
    tone(140, 0.2, 'sine', 0.22, 0, 60);
  }

  function dash() {
    noise(0.22, 0.14, 0, 3200);
  }

  function jump() {
    tone(300, 0.14, 'sine', 0.08, 0, 560);
  }

  function hide() {
    noise(0.25, 0.1, 0, 900);
    tone(220, 0.2, 'triangle', 0.08, 0.05, 330);
  }

  function powerup() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'triangle', 0.12, i * 0.07));
  }

  function caught() {
    [392, 370, 349, 311].forEach((f, i) => tone(f, 0.28, 'sawtooth', 0.12, i * 0.18));
    noise(0.4, 0.2, 0.1, 400);
  }

  function fanfare() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.11));
    tone(1047, 0.5, 'sine', 0.1, 0.55);
  }

  // A quiet two-bar bass loop: A minor walk, one note per beat at 132 bpm.
  const BASS_LINE = [110, 0, 130.8, 0, 98, 0, 123.5, 0, 110, 0, 130.8, 0, 146.8, 164.8, 196, 0];
  function startMusic() {
    if (musicTimer !== null) return;
    ensure();
    musicTimer = window.setInterval(() => {
      const note = BASS_LINE[musicStep % BASS_LINE.length];
      musicStep += 1;
      if (note > 0) tone(note, 0.2, 'triangle', 0.05);
    }, 227);
  }

  function stopMusic() {
    if (musicTimer !== null) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  return {
    gobble,
    corn,
    thud,
    dash,
    jump,
    hide,
    powerup,
    caught,
    fanfare,
    startMusic,
    stopMusic,
    unlock: ensure,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}

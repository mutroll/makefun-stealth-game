// The Quiet Archive — sound, synthesized with WebAudio and nothing else:
// no audio files, no network. Every cue is a short oscillator phrase, so the
// game stays a handful of static files.
export function createSoundBank() {
  let context = null;
  let muted = false;

  function ensureContext() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  /** A single note: frequency, seconds, shape and loudness. */
  function note(frequency, seconds, type = 'sine', volume = 0.12, when = 0) {
    const ctx = ensureContext();
    if (!ctx || muted) return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      const start = ctx.currentTime + when;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + seconds + 0.05);
    } catch {
      // Audio is decoration: a failure here must never stop the game.
    }
  }

  return {
    unlock() {
      const ctx = ensureContext();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    /** Soft tick under the thief's feet — quieter while sneaking. */
    footstep(sneaking) {
      note(sneaking ? 180 : 140, 0.06, 'sine', sneaking ? 0.015 : 0.035);
    },
    /** A pebble clicks on the stone floor. */
    pebble() {
      note(880, 0.07, 'triangle', 0.1);
      note(1320, 0.05, 'triangle', 0.06, 0.05);
    },
    /** A short UI click for starting or restarting. */
    click() {
      note(520, 0.06, 'triangle', 0.08);
    },
    /** A seal fragment chimes. */
    seal() {
      note(660, 0.14, 'sine', 0.12);
      note(990, 0.2, 'sine', 0.1, 0.09);
    },
    /** A guard grows suspicious: one rising note. */
    suspicious() {
      note(330, 0.18, 'triangle', 0.09);
      note(415, 0.22, 'triangle', 0.09, 0.12);
    },
    /** Full alarm: two harsh blasts. */
    alarm() {
      note(220, 0.22, 'sawtooth', 0.08);
      note(220, 0.22, 'sawtooth', 0.08, 0.24);
    },
    /** Caught: a low fall. */
    caught() {
      note(196, 0.3, 'sawtooth', 0.1);
      note(131, 0.5, 'sawtooth', 0.1, 0.22);
    },
    /** Escaped: a small rising arpeggio. */
    win() {
      note(523, 0.16, 'sine', 0.12);
      note(659, 0.16, 'sine', 0.12, 0.12);
      note(784, 0.3, 'sine', 0.12, 0.24);
    },
  };
}

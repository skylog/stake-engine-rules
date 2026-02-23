/**
 * Audio service using Howler.js.
 *
 * All audio files must be local (Stake Engine constraint: no external resources).
 * Sound files are loaded from /static/audio/ with dual format (webm + mp3).
 *
 * This service is a singleton — import and use directly.
 *
 * TODO: Update SOUNDS map with your game's audio files.
 */

import { Howl } from 'howler';

// ---------------------------------------------------------------------------
// Sound definitions — customize for your game
// ---------------------------------------------------------------------------

interface SoundDef {
  src: string[];
  volume: number;
  loop?: boolean;
}

/**
 * Define your game sounds here.
 * Each key maps to audio files in /static/audio/.
 * Provide webm (Chrome/Firefox) + mp3 (Safari) fallbacks.
 */
const SOUNDS: Record<string, SoundDef> = {
  // Example sounds — replace with your game's audio:
  // spin:      { src: ['./audio/spin.webm', './audio/spin.mp3'],     volume: 0.3 },
  // win:       { src: ['./audio/win.webm', './audio/win.mp3'],       volume: 0.5 },
  // bigWin:    { src: ['./audio/big-win.webm', './audio/big-win.mp3'], volume: 0.6 },
  // loss:      { src: ['./audio/loss.webm', './audio/loss.mp3'],     volume: 0.3 },
  // ambient:   { src: ['./audio/ambient.mp3'],                        volume: 0.08, loop: true },
};

// ---------------------------------------------------------------------------
// Howl instance cache
// ---------------------------------------------------------------------------

const howls = new Map<string, Howl>();

function getHowl(name: string): Howl | null {
  const def = SOUNDS[name];
  if (!def) return null;

  let howl = howls.get(name);
  if (!howl) {
    howl = new Howl({
      src: def.src,
      volume: def.volume,
      loop: def.loop ?? false,
      preload: true,
      onloaderror: () => { /* Audio file not found — expected during dev */ },
    });
    howls.set(name, howl);
  }
  return howl;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let muted = false;
let masterVolume = 1.0;

export const audio = {
  play(name: string): void {
    if (muted) return;
    const howl = getHowl(name);
    if (howl) howl.play();
  },

  stop(name: string): void {
    const howl = howls.get(name);
    if (howl) howl.stop();
  },

  stopAll(): void {
    for (const howl of howls.values()) howl.stop();
  },

  setMuted(value: boolean): void {
    muted = value;
    for (const howl of howls.values()) howl.mute(value);
  },

  isMuted(): boolean {
    return muted;
  },

  setVolume(vol: number): void {
    masterVolume = Math.max(0, Math.min(1, vol));
    for (const [name, howl] of howls.entries()) {
      const def = SOUNDS[name];
      if (def) howl.volume(def.volume * masterVolume);
    }
  },

  getVolume(): number {
    return masterVolume;
  },
};

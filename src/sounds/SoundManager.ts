// === HeatWave PvP — Sound Manager ===
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer, AudioSource } from 'expo-audio';

type SoundName = 'cool' | 'boost' | 'exit' | 'explosion' | 'tick' | 'go' | 'warning';

const soundFiles: Record<SoundName, AudioSource> = {
  cool: require('../../assets/sounds/cool.mp3'),
  boost: require('../../assets/sounds/boost.mp3'),
  exit: require('../../assets/sounds/exit.mp3'),
  explosion: require('../../assets/sounds/explosion.mp3'),
  tick: require('../../assets/sounds/tick.mp3'),
  go: require('../../assets/sounds/go.mp3'),
  warning: require('../../assets/sounds/warning.mp3'),
};

// Pre-loaded sound instances for instant playback
const loadedSounds: Partial<Record<SoundName, AudioPlayer>> = {};
let initialized = false;

/**
 * Pre-load all sounds into memory for zero-latency playback.
 * Call once at app startup.
 */
export async function initSounds(): Promise<void> {
  if (initialized) return;

  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'duckOthers',
  });

  const names = Object.keys(soundFiles) as SoundName[];
  for (const name of names) {
    try {
      loadedSounds[name] = createAudioPlayer(soundFiles[name]);
    } catch (e) {
      console.warn(`Failed to load sound: ${name}`, e);
    }
  }

  initialized = true;
}

/**
 * Play a sound effect by name.
 * Rewinds to start if already played, so it can fire rapidly.
 */
export async function playSound(name: SoundName, volume?: number): Promise<void> {
  const player = loadedSounds[name];
  if (!player) return;

  try {
    await player.seekTo(0);
    if (volume !== undefined) {
      player.volume = volume;
    }
    player.play();
  } catch (e) {
    // Silently fail — don't crash the game over a sound
  }
}

/**
 * Cleanup all loaded sounds. Call on unmount if needed.
 */
export async function unloadSounds(): Promise<void> {
  const names = Object.keys(loadedSounds) as SoundName[];
  for (const name of names) {
    try {
      loadedSounds[name]?.remove();
    } catch (e) {
      // ignore
    }
  }
  initialized = false;
}

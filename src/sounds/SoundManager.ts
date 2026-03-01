// === HeatWave PvP — Sound Manager ===
import { Audio } from 'expo-av';
import type { AVPlaybackSource } from 'expo-av';

type SoundName = 'cool' | 'boost' | 'exit' | 'explosion' | 'tick' | 'go' | 'warning';

const soundFiles: Record<SoundName, AVPlaybackSource> = {
  cool: require('../../assets/sounds/cool.mp3'),
  boost: require('../../assets/sounds/boost.mp3'),
  exit: require('../../assets/sounds/exit.mp3'),
  explosion: require('../../assets/sounds/explosion.mp3'),
  tick: require('../../assets/sounds/tick.mp3'),
  go: require('../../assets/sounds/go.mp3'),
  warning: require('../../assets/sounds/warning.mp3'),
};

// Pre-loaded sound instances for instant playback
const loadedSounds: Partial<Record<SoundName, Audio.Sound>> = {};
let initialized = false;

/**
 * Pre-load all sounds into memory for zero-latency playback.
 * Call once at app startup.
 */
export async function initSounds(): Promise<void> {
  if (initialized) return;

  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });

  const names = Object.keys(soundFiles) as SoundName[];
  await Promise.all(
    names.map(async (name) => {
      try {
        const { sound } = await Audio.Sound.createAsync(soundFiles[name], {
          shouldPlay: false,
          volume: 1.0,
        });
        loadedSounds[name] = sound;
      } catch (e) {
        console.warn(`Failed to load sound: ${name}`, e);
      }
    }),
  );

  initialized = true;
}

/**
 * Play a sound effect by name.
 * Rewinds to start if already played, so it can fire rapidly.
 */
export async function playSound(name: SoundName, volume?: number): Promise<void> {
  const sound = loadedSounds[name];
  if (!sound) return;

  try {
    await sound.setPositionAsync(0);
    if (volume !== undefined) {
      await sound.setVolumeAsync(volume);
    }
    await sound.playAsync();
  } catch (e) {
    // Silently fail — don't crash the game over a sound
  }
}

/**
 * Cleanup all loaded sounds. Call on unmount if needed.
 */
export async function unloadSounds(): Promise<void> {
  const names = Object.keys(loadedSounds) as SoundName[];
  await Promise.all(
    names.map(async (name) => {
      try {
        await loadedSounds[name]?.unloadAsync();
      } catch (e) {
        // ignore
      }
    }),
  );
  initialized = false;
}

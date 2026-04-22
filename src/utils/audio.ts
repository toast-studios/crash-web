/* eslint-disable @typescript-eslint/no-explicit-any */
import { PlayOptions, Sound, sound } from "@pixi/sound";
import gsap from "gsap";
import { PARTNER_SPECIFIC_CONFIG, CURRENT_PARTNER } from "../network/constants";

/**
 * Handles music background, playing only one audio file in loop at time,
 * and fade/stop the music if a new one is requested. Also provide volume
 * control for music background only, leaving other sounds volumes unchanged.
 */
class BGM {
  /** Alias of the current music being played */
  public currentAlias?: string;
  /** Current music instance being played */
  public current?: Sound;
  /** Current volume set */
  private volume = 0;
  /** Whether BGM is enabled for current partner */
  private enabled = true;

  constructor() {
    const audioConfig = PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER]?.audioConfig;
    this.enabled = audioConfig?.enableBGM ?? true;
    const defaultVolume = audioConfig?.defaultBGMVolume ?? 0.3;

    // Priority: webview_data > localStorage > default
    const webviewData = (window as any).webview_data;
    if (webviewData?.bgm_volume !== undefined) {
      this.volume = webviewData.bgm_volume;
    } else {
      const savedVolume = localStorage.getItem("bgmVolume");
      this.volume =
        savedVolume !== null ? parseFloat(savedVolume) : defaultVolume;
    }

    // Listen for volume control messages from the Super App
    this.setupMessageListener();
  }

  /** Setup message listener for Super App volume control events */
  private setupMessageListener() {
    window.addEventListener("message", (event: MessageEvent) => {
      if (
        event.data?.type === "SET_BGM_VOLUME" &&
        event.data?.volume !== undefined
      ) {
        this.setVolume(event.data.volume);
      }
    });
  }

  /** Play a background music, fading out and stopping the previous, if there is one */
  public async play(alias: string, options?: PlayOptions) {
    // If BGM is disabled for this partner, don't play anything
    if (!this.enabled) {
      return;
    }

    if (this.currentAlias === alias) {
      // If already playing, do nothing
      if (!this.current) return;
      if (!this.current?.isPlaying) {
        // Sound was stopped earlier — restart it
        this.current.play({ loop: true, ...options });
        this.current.volume = 0;
        gsap.killTweensOf(this.current);
        gsap.to(this.current, {
          volume: this.volume,
          duration: 1,
          ease: "linear",
        });
      }
      return;
    }

    // Fade out and stop current music
    if (this.current) {
      const current = this.current;
      gsap.killTweensOf(current);
      gsap.to(current, { volume: 0, duration: 1, ease: "linear" }).then(() => {
        current.stop();
      });
    }

    this.current = sound.find(alias);
    this.currentAlias = alias;
    this.current.play({ loop: true, ...options });
    this.current.volume = 0;
    gsap.killTweensOf(this.current);
    gsap.to(this.current, { volume: this.volume, duration: 1, ease: "linear" });
  }

  /** Get background music volume */
  public getVolume() {
    return this.volume;
  }

  /** Set background music volume */
  public setVolume(v: number) {
    this.volume = v;
    localStorage.setItem("bgmVolume", v.toString());
    if (this.current) this.current.volume = this.volume;
  }

  /** Check if BGM is enabled for current partner */
  public isEnabled() {
    return this.enabled;
  }
}

/**
 * Handles short sound special effects, mainly for having its own volume settings.
 * The volume control is only a workaround to make it work only with this type of sound,
 * with a limitation of not controlling volume of currently playing instances - only the new ones will
 * have their volume changed. But because most of sound effects are short sounds, this is generally fine.
 */
class SFX {
  /** Volume scale for new instances */
  private volume = 0;
  /** Whether SFX is enabled for current partner */
  private enabled = true;

  constructor() {
    const audioConfig = PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER]?.audioConfig;
    this.enabled = audioConfig?.enableSFX ?? true;
    const defaultVolume = audioConfig?.defaultSFXVolume ?? 0.5;

    // Priority: webview_data > localStorage > default
    const webviewData = (window as any).webview_data;
    if (webviewData?.sfx_volume !== undefined) {
      this.volume = webviewData.sfx_volume;
    } else {
      const savedVolume = localStorage.getItem("sfxVolume");
      this.volume =
        savedVolume !== null ? parseFloat(savedVolume) : defaultVolume;
    }

    // Listen for volume control messages from the Super App
    this.setupMessageListener();
  }

  /** Setup message listener for Super App volume control events */
  private setupMessageListener() {
    window.addEventListener("message", (event: MessageEvent) => {
      if (
        event.data?.type === "SET_SFX_VOLUME" &&
        event.data?.volume !== undefined
      ) {
        this.setVolume(event.data.volume);
      }
    });
  }

  /** Play an one-shot sound effect */
  public play(alias: string, options?: PlayOptions & { delay?: number }) {
    // If SFX is disabled for this partner, don't play anything
    if (!this.enabled) {
      return;
    }

    const volume = this.volume * (options?.volume ?? 1);
    if (options?.delay) {
      setTimeout(() => {
        sound.play(alias, { ...options, volume });
      }, options.delay * 1000);
    } else {
      sound.play(alias, { ...options, volume });
    }
  }

  /** Stop a specific sound effect alias (including looped instances). */
  public stop(alias: string) {
    const targetSound = sound.find(alias);
    if (!targetSound) return;
    targetSound.stop();
  }

  /** Set sound effects volume */
  public getVolume() {
    return this.volume;
  }

  public stopAllSounds(stopBGM: boolean = false) {
    const currentBGM = bgm.current;
    const alias = bgm.currentAlias;

    // Stop everything
    sound.stopAll();

    // Resume/replay the BGM if it exists
    if (currentBGM && alias && !stopBGM) {
      bgm.play(alias); // replay with fade-in
    }
  }

  /** Set sound effects volume. Does not affect instances that are currently playing */
  public setVolume(v: number) {
    this.volume = v;
    localStorage.setItem("sfxVolume", v.toString());
  }

  /** Check if SFX is enabled for current partner */
  public isEnabled() {
    return this.enabled;
  }
}

/** Get overall sound volume */
export function getMasterVolume() {
  return sound.volumeAll;
}

/** Set the overall sound volume, affecting all music and sound effects */
export function setMasterVolume(v: number) {
  sound.volumeAll = v;
  if (!v) {
    sound.muteAll();
  } else {
    sound.unmuteAll();
  }
}

/** Get current audio configuration for the partner */
export function getAudioConfig() {
  return PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER]?.audioConfig;
}

/** Check if audio is enabled for current partner */
export function isAudioEnabled() {
  const config = getAudioConfig();
  return config?.enableBGM || config?.enableSFX;
}

/** Shared background music controller */
export const bgm = new BGM();

/** Shared sound effects controller */
export const sfx = new SFX();

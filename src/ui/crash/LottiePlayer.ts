import lottie, { AnimationEventName, type AnimationItem } from "lottie-web";

// Extend Performance interface for non-standard memory property (Chrome/Chromium only)
interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

declare global {
  interface Performance {
    memory?: MemoryInfo;
  }
}

export interface LottiePlayerConfig {
  /** URL path to the initial Lottie JSON file (e.g. "/lotties/SpaceshipFlame.json"). */
  initialPath: string;
  /** Width in CSS pixels for the DOM overlay. */
  width: number;
  /** Height in CSS pixels for the DOM overlay. */
  height: number;
  /** Whether the animation should loop. Defaults to true. */
  loop?: boolean;
  /** CSS z-index for the overlay div. Defaults to 500. */
  zIndex?: number;
  /** Whether to autoplay after loading. Defaults to false. */
  autoplay?: boolean;
}

const DEFAULT_Z_INDEX = 500;

/**
 * Self-contained Lottie animation player that manages its own DOM overlay
 * on top of the PixiJS canvas. Supports swapping animations at runtime,
 * playback control, and visibility toggling.
 *
 * Lifecycle: construct -> reposition() on resize -> play/pause/stop/reset -> destroy()
 */
export class LottiePlayer {
  private containerEl: HTMLDivElement | null;
  private animation: AnimationItem | null = null;
  private currentPath: string;
  private isLooping: boolean;
  private isDestroyed = false;

  constructor(private readonly config: LottiePlayerConfig) {
    this.currentPath = config.initialPath;
    this.isLooping = config.loop ?? true;

    this.containerEl = document.createElement("div");
    this.applyBaseStyles(config.zIndex ?? DEFAULT_Z_INDEX);
    document.body.appendChild(this.containerEl);

    this.loadAnimationInternal(
      this.currentPath,
      this.isLooping,
      config.autoplay ?? false,
    );
  }

  /** Start or resume playback from the current frame. */
  play(): void {
    if (this.isDestroyed) return;
    console.log(`[LottiePlayer] ▶️ Playing animation:`, this.currentPath);
    this.animation?.play();
  }

  /** Stop playback and rewind to frame 0. */
  stop(): void {
    if (this.isDestroyed) return;
    this.animation?.stop();
  }

  /** Freeze playback at the current frame. */
  pause(): void {
    if (this.isDestroyed) return;
    this.animation?.pause();
  }

  /** Rewind to frame 0 and immediately start playing. */
  reset(): void {
    if (this.isDestroyed) return;
    this.animation?.goToAndPlay(0, true);
  }

  /**
   * Swap the currently loaded animation for a different Lottie JSON.
   * Destroys the previous AnimationItem and loads the new one into the
   * same DOM container.
   */
  loadAnimation(path: string, loop?: boolean): void {
    if (this.isDestroyed || !this.containerEl) return;

    console.log(`[LottiePlayer] 🎬 Loading animation:`, {
      path,
      loop: loop !== undefined ? loop : this.isLooping,
      previousPath: this.currentPath,
    });

    if (this.animation) {
      this.animation.destroy();
      this.animation = null;
    }

    this.currentPath = path;
    if (loop !== undefined) {
      this.isLooping = loop;
    }

    this.loadAnimationInternal(this.currentPath, this.isLooping, false);
  }

  /** Show or hide the entire Lottie overlay. */
  setVisible(visible: boolean): void {
    if (this.isDestroyed || !this.containerEl) return;
    this.containerEl.style.display = visible ? "block" : "none";
  }

  /** Returns whether the overlay is currently visible. */
  isVisible(): boolean {
    if (this.isDestroyed || !this.containerEl) return false;
    return this.containerEl.style.display !== "none";
  }

  /**
   * Register an event listener on the lottie animation.
   * Common events: 'complete', 'loopComplete', 'enterFrame', 'segmentStart'
   */
  addEventListener(event: AnimationEventName, callback: () => void): void {
    if (this.isDestroyed || !this.animation) return;
    this.animation.addEventListener(event, callback);
  }

  /**
   * Remove an event listener from the lottie animation.
   */
  removeEventListener(event: AnimationEventName, callback: () => void): void {
    if (this.isDestroyed || !this.animation) return;
    this.animation.removeEventListener(event, callback);
  }

  /**
   * Get the underlying DOM container element for direct manipulation.
   * Use with caution - primarily for GSAP animations or advanced transforms.
   */
  getContainerElement(): HTMLDivElement | null {
    return this.containerEl;
  }

  /**
   * Update the position and size of the DOM overlay.
   * Call this from the owning screen's `resize()` method so the overlay
   * stays aligned with the PixiJS canvas.
   *
   * @param x - Left offset in CSS pixels (relative to viewport).
   * @param y - Top offset in CSS pixels (relative to viewport).
   * @param width - Width in CSS pixels.
   * @param height - Height in CSS pixels.
   */
  reposition(x: number, y: number, width: number, height: number): void {
    if (this.isDestroyed || !this.containerEl) return;
    this.containerEl.style.left = `${x}px`;
    this.containerEl.style.top = `${y}px`;
    this.containerEl.style.width = `${width}px`;
    this.containerEl.style.height = `${height}px`;
  }

  /** Clean up the AnimationItem and remove the DOM element. */
  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    if (this.animation) {
      this.animation.destroy();
      this.animation = null;
    }

    if (this.containerEl) {
      this.containerEl.remove();
      this.containerEl = null;
    }
  }

  // ── Private ──────────────────────────────────────────────

  private applyBaseStyles(zIndex: number): void {
    if (!this.containerEl) return;
    const s = this.containerEl.style;
    s.position = "fixed";
    s.pointerEvents = "none";
    s.zIndex = String(zIndex);
    s.overflow = "hidden";
    s.display = "none";
    s.width = `${this.config.width}px`;
    s.height = `${this.config.height}px`;
  }

  private loadAnimationInternal(
    path: string,
    loop: boolean,
    autoplay: boolean,
  ): void {
    if (!this.containerEl) return;

    const fullPath = `${window.location.origin}${path}`;
    console.log(`[LottiePlayer] 📂 Loading animation from:`, {
      path,
      fullPath,
      loop,
      autoplay,
    });

    this.animation = lottie.loadAnimation({
      container: this.containerEl,
      renderer: "canvas",
      loop,
      autoplay,
      path: fullPath,
    });

    if (!autoplay) {
      this.animation.stop();
    }

    console.log(`[LottiePlayer] ✅ Animation loaded successfully:`, path);
  }
}

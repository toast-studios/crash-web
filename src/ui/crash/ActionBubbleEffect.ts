import { Container, Sprite, type DestroyOptions } from "pixi.js";
import gsap from "gsap";
import { CRASH_ASSETS } from "../../constants/crashLayout";

const BUBBLE_CONFIG = {
  COUNT: { min: 6, max: 9 },
  SCALE: { min: 0.3, max: 0.45 },
  SPAWN_SPREAD_X: 120,
  DRIFT_AMOUNT: 30,
  TRAVEL_DISTANCE: { min: 250, max: 350 },
  DURATION: { min: 1.5, max: 2.0 },
  FADE_START: 0.5,
  SPAWN_DELAY: 0.08,
} as const;

interface BubbleData {
  sprite: Sprite;
  tween: gsap.core.Tween;
}

/**
 * ActionBubbleEffect creates floating bubble animations for heat/cool button actions.
 * Multiple icon sprites animate upward from the dashboard with random properties,
 * fading out midway through their journey like bubbles in a cold drink.
 */
export class ActionBubbleEffect extends Container {
  private activeBubbles: Set<BubbleData> = new Set();

  constructor() {
    super();
  }

  /**
   * Trigger a bubble animation burst for the specified action type.
   * @param type - "heat" for heat_icon sprites, "cool" for cool_icon sprites
   */
  public trigger(type: "heat" | "cool"): void {
    if (this.destroyed) return;

    const textureAlias =
      type === "heat" ? CRASH_ASSETS.HEAT_ICON : CRASH_ASSETS.COOL_ICON;
    const count = this.randomInt(
      BUBBLE_CONFIG.COUNT.min,
      BUBBLE_CONFIG.COUNT.max,
    );

    for (let i = 0; i < count; i++) {
      gsap.delayedCall(i * BUBBLE_CONFIG.SPAWN_DELAY, () => {
        if (!this.destroyed) {
          this.createBubble(textureAlias);
        }
      });
    }
  }

  /**
   * Create and animate a single bubble sprite.
   * @param textureAlias - Asset alias for the sprite texture
   */
  private createBubble(textureAlias: string): void {
    const sprite = Sprite.from(textureAlias);
    sprite.anchor.set(0.5);

    const scale = this.randomFloat(
      BUBBLE_CONFIG.SCALE.min,
      BUBBLE_CONFIG.SCALE.max,
    );
    sprite.scale.set(scale);

    const startX = this.randomFloat(
      -BUBBLE_CONFIG.SPAWN_SPREAD_X,
      BUBBLE_CONFIG.SPAWN_SPREAD_X,
    );
    const driftAmount = this.randomFloat(
      -BUBBLE_CONFIG.DRIFT_AMOUNT,
      BUBBLE_CONFIG.DRIFT_AMOUNT,
    );
    const travelDistance = this.randomFloat(
      BUBBLE_CONFIG.TRAVEL_DISTANCE.min,
      BUBBLE_CONFIG.TRAVEL_DISTANCE.max,
    );
    const duration = this.randomFloat(
      BUBBLE_CONFIG.DURATION.min,
      BUBBLE_CONFIG.DURATION.max,
    );

    sprite.x = startX;
    sprite.y = 0;
    sprite.alpha = 0;

    this.addChild(sprite);

    const fadeInDuration = 0.15;
    gsap.to(sprite, { alpha: 1, duration: fadeInDuration, ease: "power1.out" });

    const tween = gsap.to(sprite, {
      y: -travelDistance,
      duration,
      ease: "power1.out",
      onUpdate: function () {
        const progress = this.progress();

        const sineWave = Math.sin(progress * Math.PI * 2) * driftAmount;
        sprite.x = startX + sineWave;

        if (progress >= BUBBLE_CONFIG.FADE_START) {
          const fadeProgress =
            (progress - BUBBLE_CONFIG.FADE_START) /
            (1 - BUBBLE_CONFIG.FADE_START);
          sprite.alpha = 1 - fadeProgress;
        }
      },
      onComplete: () => {
        if (!this.destroyed) {
          this.cleanupBubble(bubbleData);
        }
      },
    });

    const bubbleData: BubbleData = { sprite, tween };
    this.activeBubbles.add(bubbleData);
  }

  /**
   * Clean up a single bubble: remove from active set, destroy sprite and tween.
   */
  private cleanupBubble(bubble: BubbleData): void {
    this.activeBubbles.delete(bubble);
    bubble.tween.kill();

    if (!bubble.sprite.destroyed) {
      bubble.sprite.destroy();
    }
  }

  /**
   * Destroy the effect container and clean up all active bubbles.
   */
  public destroy(options?: DestroyOptions): void {
    for (const bubble of this.activeBubbles) {
      bubble.tween.kill();
      if (!bubble.sprite.destroyed) {
        bubble.sprite.destroy();
      }
    }
    this.activeBubbles.clear();

    gsap.killTweensOf(this);

    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}

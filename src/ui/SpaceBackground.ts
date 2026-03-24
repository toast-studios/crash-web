import {
  Container,
  Graphics,
  TilingSprite,
  FillGradient,
  Texture,
  type DestroyOptions,
} from "pixi.js";
import { CRASH_ASSETS } from "../constants/crashLayout";

const GRADIENT_COLORS = {
  TOP: 0x0d0d2b,
  MIDDLE: 0x1a0a3e,
  BOTTOM: 0x0d0d2b,
} as const;

const DEFAULT_SCROLL_SPEED = 0.5;

/** How quickly the scroll speed converges toward the target (0-1 per frame). */
const SPEED_LERP_FACTOR = 0.08;

/**
 * Scrolling space background: a static purple gradient underneath a
 * vertically-scrolling star-field TilingSprite.
 *
 * Uses the shared `space_stars` texture from the common atlas — no per-instance
 * GPU texture is generated, avoiding WebGL memory exhaustion on repeated screen
 * creation (rematch, rejoin).
 *
 * Call `update(delta)` every frame (via the app ticker) to drive the scroll.
 * Adjust speed dynamically with `setScrollSpeed(speed)`.
 */
export class SpaceBackground extends Container {
  private gradient: Graphics;
  private spaceStars: TilingSprite;
  private scrollSpeed = DEFAULT_SCROLL_SPEED;
  private targetScrollSpeed = DEFAULT_SCROLL_SPEED;

  constructor() {
    super();

    this.gradient = new Graphics();
    this.addChild(this.gradient);

    // Use the shared atlas texture — no GPU allocation; texture is owned by
    // the asset cache and must NOT be destroyed by this instance.
    const starsTexture = Texture.from(CRASH_ASSETS.SPACE_STARS);
    this.spaceStars = new TilingSprite({ texture: starsTexture });
    this.addChild(this.spaceStars);
  }

  /** Advance the star-field scroll by `delta` frames, lerping toward target speed. */
  public update(delta: number): void {
    if (this.destroyed) return;
    this.scrollSpeed +=
      (this.targetScrollSpeed - this.scrollSpeed) * SPEED_LERP_FACTOR;
    this.spaceStars.tilePosition.y += this.scrollSpeed * delta;
  }

  /** Set desired scroll speed. The actual speed lerps toward this value each frame. */
  public setScrollSpeed(speed: number): void {
    this.targetScrollSpeed = speed;
  }

  public getScrollSpeed(): number {
    return this.scrollSpeed;
  }

  public resize(width: number, height: number): void {
    this.drawGradient(width, height);
    this.spaceStars.width = width;
    this.spaceStars.height = height;
  }

  public destroy(options?: DestroyOptions): void {
    // Do NOT destroy the atlas texture — it is shared and owned by the asset cache.
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }

  private drawGradient(width: number, height: number): void {
    this.gradient.clear();

    const gradientFill = new FillGradient(0, 0, 0, height);
    gradientFill.addColorStop(0, GRADIENT_COLORS.TOP);
    gradientFill.addColorStop(0.5, GRADIENT_COLORS.MIDDLE);
    gradientFill.addColorStop(1, GRADIENT_COLORS.BOTTOM);

    this.gradient.rect(0, 0, width, height).fill(gradientFill);
  }
}

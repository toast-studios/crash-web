import {
  Container,
  Graphics,
  TilingSprite,
  FillGradient,
  Rectangle,
  type Texture,
  type DestroyOptions,
} from "pixi.js";
import { app } from "../app";

const GRADIENT_COLORS = {
  TOP: 0x0d0d2b,
  MIDDLE: 0x1a0a3e,
  BOTTOM: 0x0d0d2b,
} as const;

const STAR_FIELD = {
  TEXTURE_WIDTH: 420,
  TEXTURE_HEIGHT: 934,
  STAR_COUNT: 120,
  MIN_RADIUS: 0.5,
  MAX_RADIUS: 2.5,
  MIN_ALPHA: 0.3,
  MAX_ALPHA: 1.0,
} as const;

const DEFAULT_SCROLL_SPEED = 0.5;

/** How quickly the scroll speed converges toward the target (0-1 per frame). */
const SPEED_LERP_FACTOR = 0.08;

/**
 * Scrolling space background: a static purple gradient underneath a
 * vertically-scrolling star-field TilingSprite.
 *
 * Call `update(delta)` every frame (via the app ticker) to drive the scroll.
 * Adjust speed dynamically with `setScrollSpeed(speed)`.
 *
 * The star-field is currently generated procedurally. When the real
 * `space_stars` asset is available in the bundle, replace
 * `generateStarFieldTexture()` with `Texture.from("space_stars")`.
 */
export class SpaceBackground extends Container {
  private gradient: Graphics;
  private spaceStars: TilingSprite;
  private starTexture: Texture;
  private scrollSpeed = DEFAULT_SCROLL_SPEED;
  private targetScrollSpeed = DEFAULT_SCROLL_SPEED;

  constructor() {
    super();

    this.gradient = new Graphics();
    this.addChild(this.gradient);

    this.starTexture = this.generateStarFieldTexture();
    this.spaceStars = new TilingSprite({
      texture: this.starTexture,
      width: STAR_FIELD.TEXTURE_WIDTH,
      height: STAR_FIELD.TEXTURE_HEIGHT,
    });
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
    const textureRef = this.starTexture;
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
    if (textureRef && !textureRef.destroyed) {
      textureRef.destroy(true);
    }
  }

  private drawGradient(width: number, height: number): void {
    this.gradient.clear();

    const gradientFill = new FillGradient(0, 0, 0, height);
    gradientFill.addColorStop(0, GRADIENT_COLORS.TOP);
    gradientFill.addColorStop(0.5, GRADIENT_COLORS.MIDDLE);
    gradientFill.addColorStop(1, GRADIENT_COLORS.BOTTOM);

    this.gradient.rect(0, 0, width, height).fill(gradientFill);
  }

  /**
   * Procedurally generates a star-field texture with random white dots
   * of varying size and opacity. Uses `renderer.generateTexture` with an
   * explicit frame so the output is exactly TEXTURE_WIDTH x TEXTURE_HEIGHT
   * regardless of where stars happen to fall.
   */
  private generateStarFieldTexture(): Texture {
    const {
      TEXTURE_WIDTH,
      TEXTURE_HEIGHT,
      STAR_COUNT,
      MIN_RADIUS,
      MAX_RADIUS,
      MIN_ALPHA,
      MAX_ALPHA,
    } = STAR_FIELD;

    const gfx = new Graphics();

    for (let i = 0; i < STAR_COUNT; i++) {
      const x = Math.random() * TEXTURE_WIDTH;
      const y = Math.random() * TEXTURE_HEIGHT;
      const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
      const alpha = MIN_ALPHA + Math.random() * (MAX_ALPHA - MIN_ALPHA);

      gfx.circle(x, y, radius).fill({ color: 0xffffff, alpha });
    }

    const texture = app.renderer.generateTexture({
      target: gfx,
      frame: new Rectangle(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT),
    });

    gfx.destroy();
    return texture;
  }
}

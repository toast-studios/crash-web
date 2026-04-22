import { Container, Graphics, Sprite } from "pixi.js";

export type RadialProgressTimerOptions = {
  size: number;
  value?: number;
};

/**
 * Creates a Radial Progress Timer using a sprite with a circular mask.
 * Based on PixiJS official docs spinner example.
 */
export class RadialProgressTimer extends Container {
  private _progress: number;
  private baseSprite: Sprite;
  private normalTexture: string = "timer-circle";
  private extraTurnTexture: string = "extra-turn-timer-circle";
  public maskGraphics: Graphics;
  private radius: number;
  private size: number;

  constructor(options: RadialProgressTimerOptions) {
    super();

    this.radius = options.size / 2;
    this.size = options.size;
    this._progress = options.value ?? 100;

    // Create the base sprite (the image that will be masked)
    this.baseSprite = Sprite.from(this.normalTexture);
    this.baseSprite.width = this.size;
    this.baseSprite.height = this.size;
    this.baseSprite.anchor.set(0.5);

    // Create the mask
    this.maskGraphics = new Graphics();
    this.maskGraphics.position.set(0, 0);
    this.baseSprite.mask = this.maskGraphics;

    this.addChild(this.baseSprite);
    this.addChild(this.maskGraphics);

    if (options.value) {
      // Draw initial progress
      this.updateMask();
    }
  }

  private updateMask() {
    const progress = this._progress / 100;

    // Start angle from top (-90 degrees in radians)
    const angleStart = -Math.PI / 2;

    // Calculate end angle based on progress (clockwise)
    const angle = angleStart + progress * Math.PI * 2;

    // Calculate starting point
    const x1 = Math.cos(angleStart) * this.radius;
    const y1 = Math.sin(angleStart) * this.radius;

    // Redraw mask (simple solid fill to reveal the sprite)
    this.maskGraphics
      .clear()
      .moveTo(0, 0)
      .lineTo(x1, y1)
      .arc(0, 0, this.radius, angleStart, angle, false)
      .lineTo(0, 0)
      .fill({ color: 0xffffff });
  }

  /**
   * Set progress value (0-100)
   */
  set progress(value: number) {
    this._progress = Math.max(0, Math.min(100, value));
    if (this._progress > 0) {
      this.updateMask();
    } else {
      this.maskGraphics.clear();
    }
  }

  /**
   * Get current progress value
   */
  get progress(): number {
    return this._progress;
  }

  /**
   * Toggle between normal and extra turn timer textures
   */
  set extraTurnTimer(value: boolean) {
    const textureName = value ? this.extraTurnTexture : this.normalTexture;
    this.baseSprite.texture = Sprite.from(textureName).texture;
    this.baseSprite.width = this.size;
    this.baseSprite.height = this.size;
  }
  /**
   * Update sprite texture
   */
  public updateTexture(texture: string) {
    this.baseSprite.texture = Sprite.from(texture).texture;
  }
}

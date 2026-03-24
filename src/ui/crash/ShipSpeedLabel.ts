import { Container, Text, type DestroyOptions } from "pixi.js";
import { FONT_WEIGHTS, FONTS } from "../../constants/typography";

const DEFAULT_RIGHT_GAP_PX = 8;

export interface ShipSpeedLabelConfig {
  rightGapPx?: number;
}

/**
 * Ship speed label using PixiJS Text for consistency with other crash components.
 * Shows "XXX km/h" next to the spaceship lottie at a fixed offset.
 */
export class ShipSpeedLabel extends Container {
  private speedText: Text;
  private readonly rightGapPx: number;

  constructor(config: ShipSpeedLabelConfig = {}) {
    super();
    this.rightGapPx = config.rightGapPx ?? DEFAULT_RIGHT_GAP_PX;

    this.speedText = new Text({
      text: "0 km/h",
      style: {
        fontFamily: FONTS.PRIMARY,
        fontStyle: "italic",
        fontSize: 24,
        fontWeight: FONT_WEIGHTS.BOLD,
        fill: 0xffffff,
        dropShadow: {
          alpha: 0.6,
          angle: Math.PI / 2,
          blur: 4,
          distance: 1,
        },
      },
    });

    this.speedText.anchor.set(0, 0.5); // Left-middle anchor
    this.addChild(this.speedText);

    this.alpha = 0;
    this.visible = false;
  }

  setSpeed(speedKmh: number): void {
    if (this.destroyed) return;
    const normalizedSpeed = Number.isFinite(speedKmh)
      ? Math.max(0, Math.round(speedKmh))
      : 0;
    this.speedText.text = `${normalizedSpeed} km/h`;
  }

  /**
   * Positions the label to the right-middle of a lottie box.
   * Uses PixiJS coordinates for consistent positioning with other UI elements.
   */
  repositionToLottieBox(
    lottieX: number,
    lottieY: number,
    lottieWidth: number,
    lottieHeight: number,
  ): void {
    if (this.destroyed) return;
    // Convert CSS coordinates to PixiJS coordinates if needed
    // For now, assuming they're already in the same coordinate space
    this.x = lottieX + lottieWidth + this.rightGapPx;
    this.y = lottieY + lottieHeight / 2;
  }

  destroy(options?: DestroyOptions): void {
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }
}

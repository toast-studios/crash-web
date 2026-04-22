import { Container, Text, type DestroyOptions } from "pixi.js";
import gsap from "gsap";
import { FONTS, FONT_WEIGHTS } from "../../constants/typography";

const ANIMATION = {
  FLOAT_DISTANCE: -28,
  FADE_IN_DURATION: 0.05,
  FADE_OUT_DURATION: 0.6,
  TOTAL_DURATION: 0.65,
} as const;

const COLORS = {
  POSITIVE: 0xff4444,
  NEGATIVE: 0x51eeff,
} as const;

/**
 * Floating "+X%" / "-X%" indicator that appears near the heat bar
 * when a cool or boost action fires. Animates upward and fades out.
 */
export class HeatDeltaText extends Container {
  private deltaLabel: Text;
  private timeline: gsap.core.Timeline | null = null;

  constructor() {
    super();

    this.deltaLabel = new Text({
      text: "",
      style: {
        fontFamily: FONTS.SECONDARY,
        fontSize: 18,
        fontWeight: FONT_WEIGHTS.BOLD,
        fill: 0xffffff,
        align: "center",
      },
    });
    this.deltaLabel.anchor.set(0.5);
    this.addChild(this.deltaLabel);

    this.alpha = 0;
  }

  /**
   * Show a new heat delta indicator. Cancels any running animation.
   * @param delta - Positive = heat increase (red), negative = heat decrease (blue).
   */
  public show(delta: number): void {
    this.timeline?.kill();

    const isPositive = delta > 0;
    this.deltaLabel.text = isPositive ? `+${delta}%` : `${delta}%`;
    this.deltaLabel.style.fill = isPositive ? COLORS.POSITIVE : COLORS.NEGATIVE;

    this.alpha = 0;
    this.y = 0;

    this.timeline = gsap.timeline();
    this.timeline.to(this, {
      alpha: 1,
      duration: ANIMATION.FADE_IN_DURATION,
    });
    this.timeline.to(
      this,
      {
        alpha: 0,
        duration: ANIMATION.FADE_OUT_DURATION,
        ease: "power2.out",
      },
      `>`,
    );
    this.timeline.to(
      this,
      {
        y: ANIMATION.FLOAT_DISTANCE,
        duration: ANIMATION.TOTAL_DURATION,
        ease: "power2.out",
      },
      0,
    );
  }

  public destroy(options?: DestroyOptions): void {
    this.timeline?.kill();
    this.timeline = null;
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }
}

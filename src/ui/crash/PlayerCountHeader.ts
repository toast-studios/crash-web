import { Container, Sprite, Text, type DestroyOptions } from "pixi.js";
import { CRASH_ASSETS } from "../../constants/crashLayout";
import { FONTS, FONT_WEIGHTS } from "../../constants/typography";

const HEADER_STYLE = {
  LABEL_FONT_SIZE: 12,
  LABEL_COLOR: 0xffffff,
  COUNT_FONT_SIZE: 11,
  COUNT_COLOR: 0xffffff,
  BADGE_SCALE: 0.5,
  BADGE_OFFSET_Y: 2,
} as const;

/**
 * "Players" label with a count badge underneath, using the
 * no_of_players_bg sprite as the badge background.
 */
export class PlayerCountHeader extends Container {
  private titleText: Text;
  private badge: Sprite;
  private countText: Text;

  constructor() {
    super();

    this.titleText = new Text({
      text: "Players",
      style: {
        fontFamily: FONTS.SECONDARY,
        fontSize: HEADER_STYLE.LABEL_FONT_SIZE,
        fontWeight: FONT_WEIGHTS.SEMIBOLD,
        fill: HEADER_STYLE.LABEL_COLOR,
      },
    });
    this.titleText.anchor.set(0, 0);
    this.addChild(this.titleText);

    this.badge = Sprite.from(CRASH_ASSETS.NO_OF_PLAYERS_BG);
    this.badge.scale.set(HEADER_STYLE.BADGE_SCALE);
    this.badge.anchor.set(0, 0);
    this.badge.y = this.titleText.height + HEADER_STYLE.BADGE_OFFSET_Y;
    this.addChild(this.badge);

    this.countText = new Text({
      text: "0",
      style: {
        fontFamily: FONTS.SECONDARY,
        fontSize: HEADER_STYLE.COUNT_FONT_SIZE,
        fontWeight: FONT_WEIGHTS.BOLD,
        fill: HEADER_STYLE.COUNT_COLOR,
        align: "center",
      },
    });
    this.countText.anchor.set(0.5);
    this.countText.x = this.badge.x + this.badge.width / 2;
    this.countText.y = this.badge.y + this.badge.height / 2;
    this.addChild(this.countText);
  }

  public setCount(count: number): void {
    if (this.destroyed) return;
    this.countText.text = String(count);
  }

  /** Total height of the component (label + badge). */
  public getComponentHeight(): number {
    return this.badge.y + this.badge.height;
  }

  public destroy(options?: DestroyOptions): void {
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }
}

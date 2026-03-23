import { ButtonContainer } from "@pixi/ui";
import { Graphics, Sprite, Text, type DestroyOptions } from "pixi.js";
import gsap from "gsap";
import { CRASH_LAYOUT, CRASH_COLORS } from "../../constants/crashLayout";
import { FONTS, FONT_WEIGHTS } from "../../constants/typography";

export interface CrashActionButtonConfig {
  textureAlias: string;
  onPress: () => void;
  maxUses?: number;
}

/**
 * Hexagonal action button for the crash game (COOL / HEAT / CASHOUT).
 *
 * The label text is baked into the sprite asset. An optional uses-remaining
 * badge (small circle with a number) is shown above the button when
 * `maxUses` is provided in the config.
 */
export class CrashActionButton extends ButtonContainer {
  private buttonSprite: Sprite;
  private badge: Graphics | null = null;
  private badgeText: Text | null = null;
  private pressCallback: () => void;
  private _layoutScale: number;

  constructor(config: CrashActionButtonConfig) {
    const sprite = Sprite.from(config.textureAlias);
    sprite.anchor.set(0.5);
    sprite.scale.set(CRASH_LAYOUT.ASSET_SCALE);
    super(sprite);

    this.buttonSprite = sprite;
    this._layoutScale = CRASH_LAYOUT.ASSET_SCALE;
    this.pressCallback = config.onPress;
    this.cursor = "pointer";

    if (config.maxUses !== undefined) {
      this.initBadge(config.maxUses);
    }

    this.on("pointerdown", this.handlePointerDown);
    this.on("pointerup", this.handlePointerUp);
    this.on("pointerupoutside", this.handlePointerUp);
    this.onPress.connect(this.pressCallback);
  }

  public setUsesRemaining(count: number): void {
    if (!this.badgeText) return;
    this.badgeText.text = String(count);
  }

  public setEnabled(enabled: boolean): void {
    this.eventMode = enabled ? "static" : "none";
    this.buttonSprite.tint = enabled ? 0xffffff : CRASH_COLORS.DISABLED_TINT;
    this.alpha = enabled ? 1 : 0.5;
  }

  public getButtonWidth(): number {
    return this.buttonSprite.width;
  }

  public getButtonHeight(): number {
    return this.buttonSprite.height;
  }

  public setButtonScale(scale: number): void {
    this._layoutScale = CRASH_LAYOUT.ASSET_SCALE * scale;
    this.buttonSprite.scale.set(this._layoutScale);
    this.repositionBadge();
  }

  public destroy(options?: DestroyOptions): void {
    gsap.killTweensOf(this.buttonSprite.scale);
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }

  private initBadge(initialCount: number): void {
    const { BADGE_FONT_SIZE } = CRASH_LAYOUT;

    this.badgeText = new Text({
      text: String(initialCount),
      style: {
        fontFamily: FONTS.SECONDARY,
        fontSize: BADGE_FONT_SIZE,
        fontWeight: FONT_WEIGHTS.BOLD,
        fill: CRASH_COLORS.BADGE_TEXT,
        align: "center",
      },
    });
    this.badgeText.anchor.set(0.5);
    this.badgeText.x = 0;
    this.badgeText.y = -10;
    this.addChild(this.badgeText);
  }

  // private drawBadgeCircle(): void {
  //   if (!this.badge) return;
  //   const { BADGE_RADIUS } = CRASH_LAYOUT;

  //   this.badge.clear();
  //   this.badge
  //     .circle(0, 0, BADGE_RADIUS)
  //     .fill(CRASH_COLORS.BADGE_BG)
  //     .stroke({ color: CRASH_COLORS.BADGE_BORDER, width: 2 });
  // }

  private repositionBadge(): void {
    if (!this.badge) return;
    this.badge.y = 0;
    if (this.badgeText) this.badgeText.y = 0;
  }

  private readonly handlePointerDown = (): void => {
    const pressed = this._layoutScale * CRASH_LAYOUT.BUTTON_PRESS_SCALE_RATIO;
    gsap.to(this.buttonSprite.scale, {
      x: pressed,
      y: pressed,
      duration: CRASH_LAYOUT.BUTTON_PRESS_DURATION,
      ease: "power2.out",
    });
  };

  private readonly handlePointerUp = (): void => {
    gsap.to(this.buttonSprite.scale, {
      x: this._layoutScale,
      y: this._layoutScale,
      duration: CRASH_LAYOUT.BUTTON_RELEASE_DURATION,
      ease: "elastic.out(1.5)",
    });
  };
}

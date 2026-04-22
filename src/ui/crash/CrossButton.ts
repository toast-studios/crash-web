import { ButtonContainer } from "@pixi/ui";
import { Sprite, type DestroyOptions } from "pixi.js";
import gsap from "gsap";
import { CRASH_LAYOUT } from "../../constants/crashLayout";

const CROSS_BUTTON_SCALE = 0.5;

export interface CrossButtonConfig {
  textureAlias: string;
  onPress: () => void;
}

/**
 * Close/cross button with press animation. Uses a single sprite at 0.5 scale.
 * Use for top-left exit/close on CrashGameScreen.
 */
export class CrossButton extends ButtonContainer {
  private buttonSprite: Sprite;
  private readonly layoutScale = CROSS_BUTTON_SCALE;

  constructor(config: CrossButtonConfig) {
    const sprite = Sprite.from(config.textureAlias);
    sprite.anchor.set(0.5);
    sprite.scale.set(CROSS_BUTTON_SCALE);
    super(sprite);

    this.buttonSprite = sprite;
    this.cursor = "pointer";

    this.on("pointerdown", this.handlePointerDown);
    this.on("pointerup", this.handlePointerUp);
    this.on("pointerupoutside", this.handlePointerUp);
    this.onPress.connect(config.onPress);
  }

  /** Scaled width for layout (e.g. positioning logo to the right). */
  public getWidth(): number {
    return this.buttonSprite.width;
  }

  /** Scaled height for layout. */
  public getHeight(): number {
    return this.buttonSprite.height;
  }

  public destroy(options?: DestroyOptions): void {
    gsap.killTweensOf(this.buttonSprite.scale);
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }

  private readonly handlePointerDown = (): void => {
    const pressed = this.layoutScale * CRASH_LAYOUT.BUTTON_PRESS_SCALE_RATIO;
    gsap.to(this.buttonSprite.scale, {
      x: pressed,
      y: pressed,
      duration: CRASH_LAYOUT.BUTTON_PRESS_DURATION,
      ease: "power2.out",
    });
  };

  private readonly handlePointerUp = (): void => {
    gsap.to(this.buttonSprite.scale, {
      x: this.layoutScale,
      y: this.layoutScale,
      duration: CRASH_LAYOUT.BUTTON_RELEASE_DURATION,
      ease: "elastic.out(1.5)",
    });
  };
}

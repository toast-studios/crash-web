import { ButtonContainer } from "@pixi/ui";
import { Sprite, Text } from "pixi.js";
import { sfx } from "../utils/audio";
import gsap from "gsap";

export type EntryFeeButtonType = "plus" | "minus";

export class EntryFeeButton extends ButtonContainer {
  public buttonBackground: Sprite;
  public buttonText: Text;
  private buttonType: EntryFeeButtonType;

  constructor(type: EntryFeeButtonType) {
    super();
    this.buttonType = type;

    const backgroundAsset =
      type === "minus"
        ? "minus-entry-fee-button-background"
        : "plus-entry-fee-button-background";

    this.buttonBackground = Sprite.from(backgroundAsset);
    this.buttonBackground.width = this.buttonBackground.width / 2;
    this.buttonBackground.height = this.buttonBackground.height / 2;
    this.addChild(this.buttonBackground);

    this.buttonText = new Text({
      text: type === "minus" ? "-" : "+",
      style: {
        fontFamily: "Inter",
        fontSize: 32,
        fill: 0xffffff,
        align: "center",
        fontWeight: "400",
      },
    });
    this.addChild(this.buttonText);

    this.setLayout();

    this.onPress.connect(() => {
      sfx.play("common/play_button_click.wav");
      this.animatePress();
    });
  }

  private setLayout() {
    this.buttonText.x =
      this.buttonBackground.width / 2 - this.buttonText.width / 2;
    this.buttonText.y =
      this.buttonBackground.height / 2 - this.buttonText.height / 2 - 3;
  }

  private animatePress() {
    gsap.to(this, {
      y: this.y + 2,
      duration: 0.1,
      ease: "power2.out",
      onComplete: () => {
        gsap.to(this, {
          y: this.y - 2,
          duration: 0.1,
          ease: "power2.out",
        });
      },
    });
  }

  public getType(): EntryFeeButtonType {
    return this.buttonType;
  }
}

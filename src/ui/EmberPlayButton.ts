import { Sprite, Text } from "pixi.js";
import { ButtonContainer } from "@pixi/ui";
import { sfx } from "../utils/audio";
import gsap from "gsap";

export class EmberPlayButton extends ButtonContainer {
  private buttonBackground: Sprite;
  private buttonText: Text;
  private isEnabled: boolean = true;

  constructor() {
    super();

    this.buttonBackground = Sprite.from("golden-button-bg");
    this.buttonBackground.width = 270;
    this.buttonBackground.height = 90;
    this.buttonBackground.anchor.set(0.5);
    this.addChild(this.buttonBackground);

    // Simple "Play" text
    this.buttonText = new Text({
      text: "PLAY",
      style: {
        fontFamily: "Inter",
        fontSize: 32,
        fill: 0xffffff,
        fontWeight: "700",
        align: "center",
      },
    });
    this.buttonText.anchor.set(0.5);
    this.buttonText.y -= 3;
    this.addChild(this.buttonText);

    // Set interactive properties
    this.cursor = "pointer";
    this.setupInteractions();
  }
  private setupInteractions() {
    // Press animation
    this.onPress.connect(() => {
      if (!this.isEnabled) return;

      sfx.play("common/play_button_click.wav");

      // Simple scale down animation
      gsap.to(this.buttonBackground, {
        width: this.buttonBackground.width * 0.95,
        height: this.buttonBackground.height * 0.95,
        duration: 0.1,
        ease: "power2.out",
      });

      gsap.to(this.buttonText, {
        alpha: 0.8,
        duration: 0.1,
        ease: "power2.out",
      });
    });
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    this.interactive = enabled;

    // Visual feedback for disabled state
    if (enabled) {
      this.buttonBackground.tint = 0xffffff;
      this.buttonText.alpha = 1;
    } else {
      this.buttonBackground.tint = 0x666666;
      this.buttonText.alpha = 0.6;
    }
  }

  public updateText(text: string) {
    this.buttonText.text = text;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }
}

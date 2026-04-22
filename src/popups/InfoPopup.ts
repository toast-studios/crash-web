import { Container, Sprite, Texture } from "pixi.js";
import gsap from "gsap";
import { navigation } from "../utils/navigation";
import { Label } from "../ui/Label";
import { sfx } from "../utils/audio";
import { LoadingCardAnimation } from "../ui/LoadingCardAnimation";
import { app } from "../app";
import { FONT_WEIGHTS } from "../constants/typography";

export class InfoPopup extends Container {
  private bg: Sprite;
  private messageLabel: Label;

  private okButton: Sprite | undefined;
  private cancelButton: Sprite | undefined;
  private loader: LoadingCardAnimation | undefined;

  private skipAnimation: boolean = false;

  constructor({
    message,
    showLoader = false,
    showOkButton = true,
    okButtonText,
    onOkPress,
    cancelButtonText,
    onCancelPress,
    showCancelButton = false,
    skipAnimation = false,
    backgroundColor = 0x0a0025,
    textColor = 0x94622a,
  }: {
    message: string;
    showLoader?: boolean;
    showOkButton?: boolean;
    okButtonText?: string;
    onOkPress?: () => void;
    cancelButtonText?: string;
    onCancelPress?: () => void;
    showCancelButton?: boolean;
    skipAnimation?: boolean;
    backgroundColor?: number;
    textColor?: number;
  }) {
    super();
    this.bg = new Sprite(Texture.WHITE);
    this.bg.width = app.screen.width;
    this.bg.height = app.screen.height;
    this.bg.tint = backgroundColor;
    this.bg.alpha = 0.8;
    this.bg.interactive = true;
    this.addChild(this.bg);
    this.skipAnimation = skipAnimation;

    this.messageLabel = new Label(message, {
      fill: 0xffffff,
      fontSize: 30,
      wordWrap: true,
      wordWrapWidth: 350,
      fontWeight: FONT_WEIGHTS.BOLD,
      fontStyle: "italic",
    });
    this.messageLabel.x = app.screen.width / 2;

    if (showLoader) {
      this.loader = new LoadingCardAnimation();
      this.loader.y = app.screen.height * 0.5 - this.loader.height / 3;
      const cardWidth = 96; // TODO: move 96 to a constant
      this.loader.x = app.screen.width / 2 - cardWidth / 2;

      this.messageLabel.y = this.loader.y - this.messageLabel.height - 20;
      // Add loading animation to loader container
      this.addChild(this.loader);
    }
    if (showOkButton) {
      this.messageLabel.y =
        app.screen.height / 2 - this.messageLabel.height / 2;
      this.okButton = Sprite.from("primary_icon_bg");
      this.okButton.interactive = true;
      // this.okButton.cursor = "pointer";
      this.okButton.width = 250;
      this.okButton.height = 250;

      const okButtonLabel = new Label(okButtonText || "OK", {
        fill: textColor,
        fontSize: 50,
        fontWeight: FONT_WEIGHTS.BOLD,
        fontStyle: "italic",
      });
      // okButtonLabel.anchor.set(0.5);
      this.okButton.addChild(okButtonLabel);

      this.okButton.on("pointerdown", () => {
        sfx.play("common/button-click.mp3");
        onOkPress?.();
        navigation.dismissPopup();
      });
      this.addChild(this.okButton);
    }
    if (showCancelButton) {
      this.messageLabel.y =
        app.screen.height / 2 - this.messageLabel.height / 2;
      this.cancelButton = Sprite.from("secondary_icon_bg");
      this.cancelButton.interactive = true;
      // this.okButton.cursor = "pointer";
      this.cancelButton.width = 250;
      this.cancelButton.height = 250;
      const cancelButtonLabel = new Label(cancelButtonText || "Cancel", {
        fill: 0x473681,
        fontSize: 50,
        fontWeight: FONT_WEIGHTS.BOLD,
        fontStyle: "italic",
      });
      // okButtonLabel.anchor.set(0.5);
      this.cancelButton.addChild(cancelButtonLabel);

      this.cancelButton.on("pointerdown", () => {
        sfx.play("common/button-click.mp3");
        onCancelPress?.();
        navigation.dismissPopup();
      });
      this.addChild(this.cancelButton);
    }

    if (
      showCancelButton &&
      showOkButton &&
      this.cancelButton &&
      this.okButton
    ) {
      const buttonSpacing = 150;
      this.cancelButton.anchor.set(0.5);
      this.cancelButton.x = app.screen.width / 2 - buttonSpacing / 2;
      this.cancelButton.y = app.screen.height / 2 + 80;

      this.okButton.anchor.set(0.5);
      this.okButton.x = app.screen.width / 2 + buttonSpacing / 2;
      this.okButton.y = app.screen.height / 2 + 80;
    } else if (showCancelButton && this.cancelButton) {
      this.cancelButton.anchor.set(0.5);
      this.cancelButton.x = app.screen.width / 2;
      this.cancelButton.y = app.screen.height / 2 + 80;
    } else if (showOkButton && this.okButton) {
      this.okButton.anchor.set(0.5);
      this.okButton.x = app.screen.width / 2;
      this.okButton.y = app.screen.height / 2 + 80;
    }

    this.addChild(this.messageLabel);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resize(__width: number, __height: number) {}

  /** Present the popup, animated */
  public async show() {
    if (this.skipAnimation) {
      this.bg.alpha = 0.8;
      return;
    }
    gsap.killTweensOf(this.bg);
    this.bg.alpha = 0;
    gsap.to(this.bg, { alpha: 0.8, duration: 0.2, ease: "linear" });

    if (this.loader) {
      this.loader.show();
    }
    // sfx.play("common/popup-open.mp3");
  }

  /** Dismiss the popup, animated */
  public async hide() {
    if (this.skipAnimation) {
      this.bg.alpha = 0;
      return;
    }
    gsap.killTweensOf(this.bg);
    gsap.to(this.bg, { alpha: 0, duration: 0.2, ease: "linear" });
    // sfx.play("common/popup-close.mp3");
  }
}

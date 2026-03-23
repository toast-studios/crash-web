import { Container, Sprite, Texture } from "pixi.js";
import gsap from "gsap";
import { navigation } from "../utils/navigation";
import { Label } from "../ui/Label";
import { sfx } from "../utils/audio";
import { LoadingCardAnimation } from "../ui/LoadingCardAnimation";
import { app } from "../app";

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
    textColor = 0x000000,
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
      fontSize: 25,
      wordWrap: true,
      wordWrapWidth: 350,
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
      this.okButton = Sprite.from("common-action-button-bg");
      this.okButton.interactive = true;
      // this.okButton.cursor = "pointer";
      this.okButton.width = 126;
      this.okButton.height = 56;

      const okButtonLabel = new Label(okButtonText || "OK", {
        fill: textColor,
        fontSize: 28,
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
      this.cancelButton = Sprite.from("common-action-button-bg");
      this.cancelButton.interactive = true;
      // this.okButton.cursor = "pointer";
      this.cancelButton.width = 126;
      this.cancelButton.height = 56;
      const cancelButtonLabel = new Label(cancelButtonText || "Cancel", {
        fill: textColor,
        fontSize: 28,
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
      this.cancelButton.anchor.set(0.5);
      this.cancelButton.x =
        app.screen.width / 2 - this.cancelButton.width / 2 - 10;
      this.cancelButton.y = app.screen.height / 2 + this.cancelButton.height;

      this.okButton.anchor.set(0.5);
      this.okButton.x = app.screen.width / 2 + this.okButton.width / 2 + 10;
      this.okButton.y = app.screen.height / 2 + this.okButton.height;
    } else if (showCancelButton && this.cancelButton) {
      this.cancelButton.anchor.set(0.5);
      this.cancelButton.x = app.screen.width / 2;
      this.cancelButton.y = app.screen.height / 2 + this.cancelButton.height;
    } else if (showOkButton && this.okButton) {
      this.okButton.anchor.set(0.5);
      this.okButton.x = app.screen.width / 2;
      this.okButton.y = app.screen.height / 2 + this.okButton.height;
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

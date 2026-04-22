import { ButtonContainer } from "@pixi/ui";
import { Graphics, Sprite } from "pixi.js";
import { sfx } from "../utils/audio";

const buttonIconsSVGCode = {
  exit: `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.6993 8.8773L6.7012 9.8755L3.1743 6.3485L6.7012 2.8216L7.6993 3.8197L5.8759 5.6431H12.697V7.0539H5.8759L7.6993 8.8773ZM1.4108 0H11.2862C12.0657 0 12.697 0.631301 12.697 1.4108V4.2324H11.2862V1.4108H1.4108V11.2863H11.2862V8.4647H12.697V11.2863C12.697 12.0657 12.0657 12.697 11.2862 12.697H1.4108C0.631301 12.697 0 12.0657 0 11.2863V1.4108C0 0.631301 0.631301 0 1.4108 0Z" fill="#3B180F"/>
        </svg>
        `,
};

export class RoundedButton extends ButtonContainer {
  private icon: Graphics;

  private pressedBackground: Sprite;
  private unpressedBackground: Sprite;

  constructor({
    iconName,
    height = 45.95,
    width = 45.95,
  }: {
    iconName: keyof typeof buttonIconsSVGCode;
    height?: number;
    width?: number;
  }) {
    super();

    this.icon = new Graphics().svg(buttonIconsSVGCode[iconName]);
    this.icon.height = 12.7;
    this.icon.width = 12.7;
    this.unpressedBackground = Sprite.from("button-bg");
    this.unpressedBackground.width = width;
    this.unpressedBackground.height = height;

    this.pressedBackground = Sprite.from("button-pressed-bg");
    this.pressedBackground.width = width;
    this.pressedBackground.height = height;

    this.icon.x = this.unpressedBackground.width / 2 - this.icon.width / 2;
    this.icon.y = this.unpressedBackground.height / 2 - this.icon.height / 2;

    this.addChild(this.unpressedBackground);
    this.addChild(this.icon);

    // this.onPress.connect(onPress);
    // this.ontouchend = () => this.handleRelease();
    // this.ontouchend = () => this.handlePress();
    this.onpointerdown = () => this.handlePress();
    this.onpointerup = () => this.handleRelease();
  }

  private handlePress() {
    sfx.play("common/button-click.mp3");
    this.icon.y += 2;
    this.removeChildAt(0);
    this.addChildAt(this.pressedBackground, 0);
  }

  private handleRelease() {
    this.icon.y -= 2;
    this.removeChildAt(0);
    this.addChildAt(this.unpressedBackground, 0);
  }

  public setDisabled() {
    this.alpha = 0.35;
    this.interactive = false;
  }

  public setEnabled() {
    this.alpha = 1;
    this.interactive = true;
  }
}

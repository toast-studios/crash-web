import { ButtonContainer } from "@pixi/ui";
// import gsap from "gsap";
import { Sprite, Text, TextStyle } from "pixi.js";

export class LobbyButton extends ButtonContainer {
  private buttonBackground?: Sprite;
  private defaultBackground: Sprite;
  private disabledBackground: Sprite;
  private selectedBackground: Sprite;
  private buttonWidth: number;
  private buttonHeight: number;

  private buttonText?: Text;
  private textConfig?: {
    text: string;
    style: Partial<TextStyle>;
    activeStyle?: Partial<TextStyle>;
  };

  constructor({
    isActive,
    isDisabled,
    defaultImage,
    disabledImage,
    selectedImage,
    textConfig,
  }: {
    isActive: boolean;
    isDisabled: boolean;
    defaultImage: string;
    disabledImage: string;
    selectedImage: string;
    textConfig: {
      text: string;
      style: Partial<TextStyle>;
      activeStyle?: Partial<TextStyle>;
    };
  }) {
    super();
    this.defaultBackground = Sprite.from(defaultImage);
    this.disabledBackground = Sprite.from(disabledImage);
    this.selectedBackground = Sprite.from(selectedImage);

    this.buttonWidth = this.defaultBackground.width / 2;
    this.buttonHeight = this.defaultBackground.height / 2;

    this.initialize(isActive, isDisabled, textConfig);

    // // ! passing this is bug
    // this.on("pointerdown", () => {
    //   this.setPressed(this);
    // });
    // this.on("pointerup", () => {
    //   this.setReleased(this);
    // });
  }

  // private setPressed(target: Container) {
  //   gsap.to(target.position, {
  //     y: target.position.y + 2,
  //     duration: 0.1,
  //     onComplete: () => {
  //       setTimeout(() => {
  //         this.setReleased(target);
  //       }, 200);
  //     },
  //   });
  // }

  private initialize(
    isActive: boolean,
    isDisabled: boolean,
    textConfig: {
      text: string;
      style: Partial<TextStyle>;
      activeStyle?: Partial<TextStyle>;
    },
  ) {
    if (isActive) {
      this.buttonBackground = this.selectedBackground;
    } else if (isDisabled) {
      this.buttonBackground = this.disabledBackground;
      this.interactive = false;
      this.cursor = "default";
    } else {
      this.buttonBackground = this.defaultBackground;
    }

    this.buttonBackground.width = this.buttonWidth;
    this.buttonBackground.height = this.buttonHeight;
    this.addChild(this.buttonBackground);
    this.textConfig = textConfig;

    this.buttonText = new Text({
      ...textConfig,
      style: {
        ...this.textConfig.style,
        fill: !isActive
          ? this.textConfig.style.fill
          : this.textConfig.activeStyle?.fill
            ? this.textConfig.activeStyle.fill
            : 0x000000,
      },
    });
    this.buttonText.alpha = isDisabled ? 0.15 : 1;
    this.buttonText.x =
      this.buttonBackground.width / 2 - this.buttonText.width / 2;
    this.buttonText.y =
      this.buttonBackground.height / 2 - this.buttonText.height / 2 - 2;
    this.addChild(this.buttonText);
  }

  // private setReleased(target: Container) {
  //   gsap.to(target.position, {
  //     y: target.position.y - 2,
  //     duration: 0.1,
  //   });
  // }

  public setDisabled() {
    this.children[1].alpha = 0.35;
    this.interactive = false;
    this.cursor = "default";
  }

  public setEnabled() {
    this.children[1].alpha = 1;
    this.interactive = true;
    this.cursor = "pointer";
  }

  public setActive(interactive = true) {
    this.interactive = interactive;
    this.cursor = "pointer";
    if (this.buttonBackground) {
      this.removeChild(this.buttonBackground);
    }
    if (this.buttonText) {
      this.removeChild(this.buttonText);
    }

    if (this.textConfig) {
      this.initialize(true, false, this.textConfig);
    }
  }

  public setInactive(interactive = false) {
    this.interactive = interactive;
    this.cursor = "default";
    if (this.buttonBackground) {
      this.removeChild(this.buttonBackground);
    }
    if (this.buttonText) {
      this.removeChild(this.buttonText);
    }

    if (this.textConfig) {
      this.initialize(false, false, this.textConfig);
    }
  }

  public setText(newText: string) {
    if (this.buttonText && this.textConfig) {
      this.buttonText.text = newText;
      this.textConfig.text = newText;
      this.centerText();
    }
  }

  public setTextStyle(newStyle: Partial<TextStyle>) {
    if (this.buttonText && this.textConfig) {
      this.textConfig.style = { ...this.textConfig.style, ...newStyle };
      this.buttonText.style = new TextStyle(this.textConfig.style);
      this.centerText();
    }
  }

  private centerText() {
    if (this.buttonText && this.buttonBackground) {
      this.buttonText.x =
        this.buttonBackground.width / 2 - this.buttonText.width / 2;
      this.buttonText.y =
        this.buttonBackground.height / 2 - this.buttonText.height / 2 - 2;
    }
  }
}

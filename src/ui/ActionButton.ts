import { ButtonContainer } from "@pixi/ui";
import gsap from "gsap";
import { Container, Sprite, Text, TextStyle } from "pixi.js";
import { CURRENT_PARTNER, PARTNER_ID } from "../network/constants";

export class ActionButton extends ButtonContainer {
  constructor({
    text,
    image,
    style,
  }: {
    text: string;
    image: string;
    style: Partial<TextStyle>;
  }) {
    // Removed buttonBackground
    const buttonContainer = new Container();
    const buttonImage = Sprite.from(image);
    buttonImage.width /= 2;
    buttonImage.height /= 2;
    buttonContainer.addChild(buttonImage);
    const buttonText = new Text({
      text: text,
      style: {
        fontFamily: "Pridi",
        // fontWeight: "bold",
        ...(CURRENT_PARTNER === PARTNER_ID.em
          ? { fontSize: 20, fontWeight: "300", fill: 0xfefff9 }
          : { fontSize: 24, fontWeight: "500", fill: 0xffffff }),
        ...style,
      },
    });
    // Centering buttonImage and buttonText within buttonContainer
    buttonImage.x = 0;
    // buttonImage.y = 4;
    buttonText.x = buttonContainer.width / 2 - buttonText.width / 2;
    buttonText.y = buttonContainer.height / 2 - buttonText.height / 2;
    // buttonContainer.addChild(buttonText);
    super(buttonContainer); // Pass buttonContainer directly to super
    this.addChild(buttonContainer);

    this.cursor = "pointer";

    this.on("pointerdown", () => {
      this.setPressed(buttonContainer);
    });
    this.on("pointerup", () => {
      this.setReleased(buttonContainer);
    });
  }

  private setPressed(target: Container) {
    gsap.to(target.position, {
      y: target.position.y + 2,
      duration: 0.1,
      onComplete: () => {
        setTimeout(() => {
          this.setReleased(target);
        }, 200);
      },
    });
  }

  private setReleased(target: Container) {
    gsap.to(target.position, {
      y: 0,
      duration: 0.1,
    });
  }

  public setDisabled() {
    this.children[0].alpha = 0.35; // Updated index to 0 since buttonContainer is now the only child
    this.interactive = false;
  }

  public setEnabled() {
    this.children[0].alpha = 1; // Updated index to 0 since buttonContainer is now the only child
    this.interactive = true;
  }
}

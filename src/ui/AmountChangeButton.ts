import { Graphics, Container } from "pixi.js";
import gsap from "gsap";

export class AmountChangeButton extends Container {
  private circle: Graphics;
  private sign: Graphics;
  private isDisabled: boolean = false;

  constructor({
    size = 40,
    circleColor = 0x3f3b3e,
    sign = "+", // "+" or "-"
    onClick,
  }: {
    size?: number;
    circleColor?: number;
    sign?: "+" | "-";
    onClick?: () => void;
  }) {
    super();

    // Create container for the button elements
    const buttonContainer = new Container();

    // Create the circle background
    this.circle = new Graphics().circle(size / 2, size / 2, size / 2);
    this.circle.fill(circleColor);

    // Create the sign (plus or minus) using Graphics
    this.sign = new Graphics();
    const signSize = size * 0.4;
    const signThickness = 3;

    if (sign === "+") {
      // Draw plus sign: horizontal line
      this.sign
        .rect(
          size / 2 - signSize / 2,
          size / 2 - signThickness / 2,
          signSize,
          signThickness,
        )
        .fill(0xffffff);
      // Draw plus sign: vertical line
      this.sign
        .rect(
          size / 2 - signThickness / 2,
          size / 2 - signSize / 2,
          signThickness,
          signSize,
        )
        .fill(0xffffff);
    } else {
      // Draw minus sign: horizontal line only
      this.sign
        .rect(
          size / 2 - signSize / 2,
          size / 2 - signThickness / 2,
          signSize,
          signThickness,
        )
        .fill(0xffffff);
    }

    // Add elements to container
    buttonContainer.addChild(this.circle);
    buttonContainer.addChild(this.sign);

    // Add container to button
    this.addChild(buttonContainer);

    // Set button properties
    this.width = size;
    this.height = size;
    this.cursor = "pointer";
    this.eventMode = "static";

    // Add click handler if provided
    if (onClick) {
      this.on("pointerdown", () => {
        if (!this.isDisabled) {
          this.handlePress(buttonContainer);
        }
      });

      this.on("pointerup", () => {
        if (!this.isDisabled) {
          this.handleRelease(buttonContainer);
          onClick();
        }
      });

      this.on("pointerupoutside", () => {
        if (!this.isDisabled) {
          this.handleRelease(buttonContainer);
        }
      });
    }
  }

  private handlePress(target: Container) {
    gsap.to(target.position, {
      y: target.position.y + 2,
      duration: 0.1,
    });
  }

  private handleRelease(target: Container) {
    gsap.to(target.position, {
      y: 0,
      duration: 0.1,
    });
  }

  public setDisabled(disabled: boolean = true) {
    this.isDisabled = disabled;
    if (disabled) {
      this.alpha = 0.35;
      this.interactive = false;
      this.cursor = "default";
    } else {
      this.alpha = 1;
      this.interactive = true;
      this.cursor = "pointer";
    }
  }

  public setEnabled() {
    this.setDisabled(false);
  }
}

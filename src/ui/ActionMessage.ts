import { Container, Text } from "pixi.js";

export class ActionMessage extends Container {
  private mainText: Text | null = null;
  private topText: Text | null = null;
  private interval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.visible = false;
  }

  public showActionInfo(action: "hit" | "stand", label: string = "OPPONENT") {
    // Clear existing timeout if any
    if (this.interval) {
      clearTimeout(this.interval);
    }

    // Clean up previous text if exists
    if (this.mainText) this.removeChild(this.mainText);
    if (this.topText) this.removeChild(this.topText);

    // Create label text (e.g., "OPPONENT" or "DEALER")
    this.topText = new Text({
      text: label,
      style: {
        fontFamily: "Pridi",
        fontSize: 11,
        fill: 0xe8aa2e,
        fontWeight: "800",
      },
    });

    // Create main action text
    this.mainText = new Text({
      text: `${action.toUpperCase()}S!`,
      style: {
        fontFamily: "Pridi",
        fontSize: 21,
        fill: 0xffffff,
        fontWeight: "800",
      },
    });

    // Position the texts relative to local container origin
    this.topText.anchor.set(0.5);
    this.mainText.anchor.set(0.5);

    // Stack texts vertically centered around local origin
    this.topText.position.set(0, -8);
    this.mainText.position.set(0, 8);

    this.addChild(this.topText, this.mainText);

    const totalHeight =
      Math.abs(this.topText.position.y) + Math.abs(this.mainText.position.y);
    this.pivot.set(0, totalHeight / 2);

    this.visible = true;

    this.interval = setTimeout(() => {
      this.hideActionInfo();
      this.interval = null;
    }, 2500);
  }

  public hideActionInfo() {
    this.visible = false;
  }
}

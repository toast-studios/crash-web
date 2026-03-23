import { Container, Graphics, Sprite, Text } from "pixi.js";
import { app } from "../app";

export class FTUESuggestion extends Container {
  private clickableRing: Sprite;
  private guideArrow: Sprite;
  private guideText: Text;
  private clickableRingRadius: number = 163;
  // private maskCircle: Graphics;
  // private overlayMask: Graphics;

  constructor() {
    super();

    // Create the semi-transparent background
    const bgOverlay = new Graphics();
    bgOverlay.rect(0, 0, app.screen.width, app.screen.height);
    bgOverlay.fill({
      color: "212325",
      alpha: 0.9,
    });
    this.addChild(bgOverlay);

    // Create the clickable ring sprite
    this.clickableRing = Sprite.from("clickable-ring");
    this.clickableRing.width = this.clickableRingRadius;
    this.clickableRing.height = this.clickableRingRadius;
    this.clickableRing.x = app.screen.width / 2 - this.clickableRing.width - 50;
    this.clickableRing.y =
      app.screen.height / 2 + this.clickableRing.height + 30;
    this.addChild(this.clickableRing);

    // Create the guide-arrow sprite
    this.guideArrow = Sprite.from("guide-arrow");
    this.guideArrow.x = this.clickableRing.x + this.clickableRing.width - 100;
    this.guideArrow.y = this.clickableRing.y - this.clickableRing.height - 30;
    this.addChild(this.guideArrow);

    const displayText = " Choose the\n block order\n within 15sec";
    // Create the guide-arrow sprite
    this.guideText = new Text({
      text: displayText,
      style: {
        fontFamily: "Inder",
        fontSize: 23,
        fill: "#ffffff",
        align: "center",
        fontWeight: "500",
      },
    });
    this.guideText.x = this.guideArrow.x + this.guideArrow.width;
    this.guideText.y = this.guideArrow.y - this.guideText.height + 10;
    this.addChild(this.guideText);
  }
}

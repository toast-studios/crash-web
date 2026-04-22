import { Container, Sprite, Text } from "pixi.js";

export class ActionInfo extends Container {
  private background: Sprite;
  private text: Text | null = null;
  private interval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.background = Sprite.from("opponent-action-info-bg");
    this.background.width = 129.45;
    this.background.height = 45.95;
    this.addChild(this.background);
  }

  public showActionInfo(action: "hit" | "stand") {
    if (this.text) {
      if (this.interval) {
        clearTimeout(this.interval);
      }
      this.removeChild(this.text);
    }
    this.text = new Text({
      text: action === "hit" ? "HIT!" : "STAND!",
      style: { fontFamily: "Pridi", fontSize: 24, fill: 0xffffff },
    });
    this.addChild(this.text);
    this.text.x = this.background.width / 2 - this.text.width / 2;
    this.text.y = this.background.height / 2 - this.text.height / 2;

    this.interval = setTimeout(() => {
      if (this.text) {
        this.removeChild(this.text);
      }
      this.interval = null;
    }, 2500);
  }
}

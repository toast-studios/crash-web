import { Container, Sprite, Text } from "pixi.js";

export class PlayButton extends Container {
  public background: Sprite;
  public playButtonText: Text;

  constructor() {
    super();

    this.background = Sprite.from("play-button-container-background");
    this.background.width = this.background.width / 2;
    this.background.height = this.background.height / 2;
    this.addChild(this.background);

    this.playButtonText = new Text({
      text: "PLAY",
      style: {
        fontFamily: "Inter",
        fontSize: 26,
        fill: 0xaf7b00,
        align: "center",
        fontWeight: "800",
      },
    });
    this.addChild(this.playButtonText);

    this.setLayout();
  }

  private setLayout() {
    this.playButtonText.x =
      this.background.width / 2 - this.playButtonText.width / 2;
    this.playButtonText.y =
      this.background.height / 2 - this.playButtonText.height / 2;
  }
}

import { ButtonContainer } from "@pixi/ui";
import { NineSliceSprite, Sprite, Text, Texture } from "pixi.js";

export interface RequeueButtonConfig {
  width: number;
  height: number;
}

export class RequeueButton extends ButtonContainer {
  private background: NineSliceSprite;
  private refreshIcon: Sprite;
  private requeueText: Text;

  constructor(config: RequeueButtonConfig) {
    super();

    const backgroundTexture = Texture.from("play-button-container-background");
    this.background = new NineSliceSprite({
      texture: backgroundTexture,
      leftWidth: backgroundTexture.width / 2,
      topHeight: backgroundTexture.height / 2,
      rightWidth: backgroundTexture.width / 2,
      bottomHeight: backgroundTexture.height / 2,
      height: config.height,
      width: config.width,
    });
    this.addChild(this.background);

    this.refreshIcon = Sprite.from("refresh-icon");
    this.refreshIcon.width = 24;
    this.refreshIcon.height = 24;
    this.addChild(this.refreshIcon);

    this.requeueText = new Text({
      text: "REQUEUE AGAIN",
      style: {
        fontFamily: "Inter",
        fontSize: 26,
        fill: 0xaf7b00,
        align: "left",
        fontWeight: "800",
      },
    });
    this.addChild(this.requeueText);

    this.setLayout(config.width, config.height);
  }

  private setLayout(width: number, height: number) {
    this.background.width = width;

    this.refreshIcon.x = 45;
    this.refreshIcon.y = height / 2 - this.refreshIcon.height / 2;

    this.requeueText.x = this.refreshIcon.x + this.refreshIcon.width + 10;
    this.requeueText.y = height / 2 - this.requeueText.height / 2;
  }

  public updateSize(width: number, height: number) {
    this.setLayout(width, height);
  }
}

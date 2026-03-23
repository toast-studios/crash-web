import { Container, NineSliceSprite, Sprite, Text, Texture } from "pixi.js";

export interface PlayAgainButtonConfig {
  width: number;
  height: number;
  onPress?: () => void;
}

export class PlayAgainButton extends Container {
  private background: NineSliceSprite;
  private refreshIcon: Sprite;
  private playAgainText: Text;

  constructor(config: PlayAgainButtonConfig) {
    super();

    this.eventMode = "static";
    this.cursor = "pointer";

    const playAgainBackgroundTexture = Texture.from(
      "play-button-container-background",
    );
    this.background = new NineSliceSprite({
      texture: playAgainBackgroundTexture,
      leftWidth: playAgainBackgroundTexture.width / 2,
      topHeight: playAgainBackgroundTexture.height / 2,
      rightWidth: playAgainBackgroundTexture.width / 2,
      bottomHeight: playAgainBackgroundTexture.height / 2,
      height: config.height,
      width: config.width,
    });
    this.addChild(this.background);

    this.refreshIcon = Sprite.from("refresh-icon");
    this.refreshIcon.width = 24;
    this.refreshIcon.height = 24;
    this.addChild(this.refreshIcon);

    this.playAgainText = new Text({
      text: "PLAY AGAIN",
      style: {
        fontFamily: "Inter",
        fontSize: 26,
        fill: 0xaf7b00,
        align: "left",
        fontWeight: "800",
      },
    });
    this.addChild(this.playAgainText);

    this.setLayout(config.width, config.height);

    if (config.onPress) {
      this.on("pointerdown", config.onPress);
    }
  }

  private setLayout(width: number, height: number) {
    this.background.width = width;

    // Calculate total content width (icon + gap + text)
    const gap = 10;
    const contentWidth =
      this.refreshIcon.width + gap + this.playAgainText.width;

    // Center the content group horizontally
    const startX = (width - contentWidth) / 2;

    this.refreshIcon.x = startX;
    this.refreshIcon.y = height / 2 - this.refreshIcon.height / 2;

    this.playAgainText.x = startX + this.refreshIcon.width + gap;
    this.playAgainText.y = height / 2 - this.playAgainText.height / 2;
  }

  public updateSize(width: number, height: number) {
    this.setLayout(width, height);
  }
}

import { Container, NineSliceSprite, Sprite, Texture } from "pixi.js";

export interface BackToLobbyButtonConfig {
  width: number;
  height: number;
  onPress?: () => void;
}

export class BackToLobbyButton extends Container {
  private background: NineSliceSprite;
  private homeIcon: Sprite;

  constructor(config: BackToLobbyButtonConfig) {
    super();

    this.eventMode = "static";
    this.cursor = "pointer";

    const backToLobbyBackgroundTexture = Texture.from("home-icon-background");
    this.background = new NineSliceSprite({
      texture: backToLobbyBackgroundTexture,
      leftWidth: backToLobbyBackgroundTexture.width / 2,
      topHeight: backToLobbyBackgroundTexture.height / 2,
      rightWidth: backToLobbyBackgroundTexture.width / 2,
      bottomHeight: backToLobbyBackgroundTexture.height / 2,
      height: config.height,
      width: config.width,
    });
    this.addChild(this.background);

    this.homeIcon = Sprite.from("home-icon");
    this.homeIcon.width = 24;
    this.homeIcon.height = 24;
    this.addChild(this.homeIcon);

    this.setLayout(config.width, config.height);

    if (config.onPress) {
      this.on("pointerdown", config.onPress);
    }
  }

  private setLayout(width: number, height: number) {
    this.background.width = width;

    this.homeIcon.x = width / 2 - this.homeIcon.width / 2;
    this.homeIcon.y = height / 2 - this.homeIcon.height / 2;
  }

  public updateSize(width: number, height: number) {
    this.setLayout(width, height);
  }
}

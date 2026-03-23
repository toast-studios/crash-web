import { Container, NineSliceSprite, Text, Texture } from "pixi.js";
import { TOURNAMENT_STYLES } from "./TournamentStyles";

export class LeaderboardBackground extends Container {
  private background: NineSliceSprite;
  private titleText: Text;

  constructor({
    width,
    height,
    isDraftingPhase = false,
  }: {
    width: number;
    height: number;
    isDraftingPhase?: boolean;
  }) {
    super();

    this.background = new NineSliceSprite({
      texture: Texture.from("leaderboard_container"),
      leftWidth: 60,
      topHeight: 60,
      rightWidth: 60,
      bottomHeight: 60,
      width,
      height,
    });
    this.addChild(this.background);

    this.titleText = new Text({
      text: isDraftingPhase ? "Drafting Phase" : "Live Leaderboard",
      style: TOURNAMENT_STYLES.LEADERBOARD.TITLE,
    });
    // Uncomment if title is needed
    // this.addChild(this.titleText);
  }

  public updateSize(width: number, height: number) {
    this.background.width = width;
    this.background.height = height;

    this.titleText.x = this.background.width / 2 - this.titleText.width / 2;
    this.titleText.y = 15;
  }

  public updateTitle(text: string) {
    this.titleText.text = text;
    this.titleText.x = this.background.width / 2 - this.titleText.width / 2;
  }

  public getBackgroundWidth(): number {
    return this.background.width;
  }

  public getBackgroundHeight(): number {
    return this.background.height;
  }
}

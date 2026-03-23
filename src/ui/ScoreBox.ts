import { Container, Sprite, Text } from "pixi.js";

export interface ScoreBoxOptions {
  score: number;
  width?: number;
  height?: number;
  backgroundSprite?: string;
  scale?: number;
}

export class ScoreBox extends Container {
  private scoreBackground: Sprite;
  private scoreMask: Sprite;
  private scoreTextContainer: Container;
  private scoreText: Text;

  constructor(options: ScoreBoxOptions) {
    super();

    const {
      score,
      width,
      height,
      backgroundSprite = "player_card_column_score_container_active",
    } = options;

    this.scoreBackground = Sprite.from(backgroundSprite);
    this.addChild(this.scoreBackground);

    // Apply custom width/height if provided
    if (width !== undefined) {
      this.scoreBackground.width = width;
    }
    if (height !== undefined) {
      this.scoreBackground.height = height;
    }

    this.scoreMask = Sprite.from("player_card_column_score_container_mask");
    this.scoreMask.width = this.scoreBackground.width;
    this.scoreMask.height = this.scoreBackground.height;
    this.scoreMask.y = 0;
    // this.addChild(this.scoreMask);

    this.scoreTextContainer = new Container();
    this.scoreTextContainer.height = this.scoreBackground.height;
    this.scoreTextContainer.width = this.scoreBackground.width;
    // this.scoreTextContainer.mask = this.scoreMask;
    this.addChild(this.scoreTextContainer);

    this.scoreText = this.createScoreText(score);
    this.scoreTextContainer.addChild(this.scoreText);
  }

  private createScoreText(score: number): Text {
    const text = new Text({
      text: score.toString(),
      style: {
        fontFamily: "Pridi",
        fontSize: 24,
        fill: 0xffffff,
        align: "center",
      },
    });

    text.x = this.scoreBackground.width / 2 - text.width / 2;
    text.y = this.scoreBackground.height / 2 - text.height / 2 - 2;

    return text;
  }

  public updateScore(score: number): void {
    this.scoreText.text = score.toString();
    this.scoreText.x =
      this.scoreBackground.width / 2 - this.scoreText.width / 2;
  }

  public getBackgroundWidth(): number {
    return this.scoreBackground.width;
  }

  public getBackgroundHeight(): number {
    return this.scoreBackground.height;
  }
}

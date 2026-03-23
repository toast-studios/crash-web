import { Container, Sprite, Text } from "pixi.js";
import { CURRENT_PARTNER, PARTNER_SPECIFIC_CONFIG } from "../network/constants";

export class ScoreCircle extends Container {
  private scoreText: Text;
  private background: Sprite;
  private disabled: boolean = false;

  constructor(score: number, isHigh: boolean, disabled: boolean = false) {
    super();
    this.disabled = disabled;

    this.background = Sprite.from(
      disabled
        ? "score-circle-low"
        : isHigh
          ? "score-circle-high"
          : "score-circle-low",
    );
    this.background.scale.set(0.5);
    if (disabled) {
      this.background.alpha = 0.3;
    }
    this.addChild(this.background);

    this.scoreText = new Text({
      text: score.toString(),
      style: {
        fontFamily: "Pridi",
        fontSize: 24,
        fill: isHigh
          ? PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].highScoreColor
          : PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].lowScoreColor,
        fontWeight: "500",
      },
    });
    this.scoreText.anchor.set(0.5, 0.5);
    this.scoreText.position.set(
      this.background.width / 2,
      this.background.height / 2 - 2,
    );
    if (disabled) {
      this.scoreText.alpha = 0.3;
    }
    this.addChild(this.scoreText);
  }

  public updateScore(score: number, isHigh: boolean) {
    this.scoreText.text = score.toString();
    this.background.texture = Sprite.from(
      isHigh ? "score-circle-high" : "score-circle-low",
    ).texture;
    this.scoreText.style.fill = isHigh
      ? PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].highScoreColor
      : PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].lowScoreColor;
  }

  public getScore(): number {
    return Number(this.scoreText.text);
  }

  public setEnabled(enabled: boolean) {
    this.disabled = !enabled;
    this.background.alpha = this.disabled ? 0.3 : 1;
    this.scoreText.alpha = this.disabled ? 0.3 : 1;
  }
}

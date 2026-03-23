import { Container, Text, type DestroyOptions } from "pixi.js";
import { FONTS, FONT_WEIGHTS } from "../../constants/typography";

const TIMER_FONT_SIZE = 38;
const SUBTITLE_FONT_SIZE = 13;
const SUBTITLE_GAP = -5;
const TIMER_COLOR = 0xffffff;
const SUBTITLE_COLOR = 0xaaaacc;
const SUBTITLE_TEXT = "Survive to score";

/**
 * Displays the current elapsed time ("14.50s") and a static
 * "Survive to score" subtitle beneath it. Centered around x=0, y=0.
 *
 * Usage:
 *   surviveTimer.setTime(14.5);  // updates the time label
 */
export class SurviveTimer extends Container {
  private timeLabel: Text;
  private subtitleLabel: Text;

  constructor() {
    super();

    this.timeLabel = new Text({
      text: "0.00s",
      style: {
        fontFamily: FONTS.PRIMARY,
        fontSize: TIMER_FONT_SIZE,
        fontWeight: FONT_WEIGHTS.BOLD,
        fill: TIMER_COLOR,
        align: "center",
      },
    });
    this.timeLabel.anchor.set(0.5, 1);
    this.timeLabel.x = 0;
    this.timeLabel.y = 0;
    this.addChild(this.timeLabel);

    this.subtitleLabel = new Text({
      text: SUBTITLE_TEXT,
      style: {
        fontFamily: FONTS.SECONDARY,
        fontSize: SUBTITLE_FONT_SIZE,
        fontWeight: FONT_WEIGHTS.REGULAR,
        fill: SUBTITLE_COLOR,
        align: "center",
      },
    });
    this.subtitleLabel.anchor.set(0.5, 0);
    this.subtitleLabel.x = 0;
    this.subtitleLabel.y = SUBTITLE_GAP;
    this.addChild(this.subtitleLabel);
  }

  /** Update the displayed time. Pass elapsed seconds (e.g. 14.5 → "14.50s"). */
  public setTime(seconds: number): void {
    this.timeLabel.text = `${seconds.toFixed(2)}s`;
  }

  public destroy(options?: DestroyOptions): void {
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }
}

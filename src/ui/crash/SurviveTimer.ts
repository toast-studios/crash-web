import { Container, Text, type DestroyOptions } from "pixi.js";
import { FONTS, FONT_WEIGHTS } from "../../constants/typography";

const TIMER_FONT_SIZE = 50;
const TIMER_SUFFIX_FONT_SIZE = 30;
const SUBTITLE_FONT_SIZE = 11;
const SUBTITLE_GAP = -8;
const TIMER_COLOR = 0xffffff;
const SUBTITLE_COLOR = 0xffffff;
const SUBTITLE_TEXT = "Survive to score";
const SUBTITLE_FONT_STROKE_COLOR = 0x000000;
const TIMER_FONT_STROKE_COLOR = 0x000000;
const SUFFIX_OFFSET_X = 2;
const SUFFIX_OFFSET_Y = -5;
const SUBTITLE_OFFSET_X = 5;

/**
 * Displays the current elapsed time ("14.50s") and a static
 * "Survive to score" subtitle beneath it. Centered around x=0, y=0.
 *
 * Usage:
 *   surviveTimer.setTime(14.5);  // updates the time label
 */
export class SurviveTimer extends Container {
  private timeLabel: Text;
  private timeSuffixLabel: Text;
  private subtitleLabel: Text;

  constructor() {
    super();

    this.timeLabel = new Text({
      text: "0.00",
      style: {
        fontFamily: FONTS.PRIMARY,
        fontSize: TIMER_FONT_SIZE,
        fontWeight: FONT_WEIGHTS.BOLD,
        fontStyle: "italic",
        fill: TIMER_COLOR,
        align: "center",
        stroke: TIMER_FONT_STROKE_COLOR,
      },
    });
    this.timeLabel.anchor.set(1, 1);
    this.timeLabel.x = 0;
    this.timeLabel.y = 0;
    this.addChild(this.timeLabel);

    this.timeSuffixLabel = new Text({
      text: "s",
      style: {
        fontFamily: FONTS.PRIMARY,
        fontSize: TIMER_SUFFIX_FONT_SIZE,
        fontWeight: FONT_WEIGHTS.BOLD,
        fontStyle: "italic",
        fill: TIMER_COLOR,
        align: "center",
        stroke: TIMER_FONT_STROKE_COLOR,
      },
    });
    this.timeSuffixLabel.anchor.set(0, 1);
    this.timeSuffixLabel.y = SUFFIX_OFFSET_Y;
    this.addChild(this.timeSuffixLabel);

    this.subtitleLabel = new Text({
      text: SUBTITLE_TEXT,
      style: {
        fontFamily: FONTS.THIRD,
        fontSize: SUBTITLE_FONT_SIZE,
        fontWeight: FONT_WEIGHTS.SEMIBOLD,
        fill: SUBTITLE_COLOR,
        align: "center",
        stroke: SUBTITLE_FONT_STROKE_COLOR,
      },
    });
    this.subtitleLabel.anchor.set(0.5, 0);
    this.subtitleLabel.x = SUBTITLE_OFFSET_X;
    this.subtitleLabel.y = SUBTITLE_GAP;
    this.addChild(this.subtitleLabel);

    this.layoutTimeLabels();
  }

  /** Update the displayed time. Pass elapsed seconds (e.g. 14.5 → "14.50" + "s"). */
  public setTime(seconds: number): void {
    this.timeLabel.text = seconds.toFixed(2);
    this.layoutTimeLabels();
  }

  private layoutTimeLabels(): void {
    const totalWidth =
      this.timeLabel.width + SUFFIX_OFFSET_X + this.timeSuffixLabel.width;
    const leftEdge = -totalWidth / 2;

    this.timeLabel.x = leftEdge + this.timeLabel.width;
    this.timeSuffixLabel.x = this.timeLabel.x + SUFFIX_OFFSET_X;
  }

  public destroy(options?: DestroyOptions): void {
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }
}

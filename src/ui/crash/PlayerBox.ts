import { Container, Sprite, Text, type DestroyOptions } from "pixi.js";
import { FONTS, FONT_WEIGHTS } from "../../constants/typography";
import { CRASH_ASSETS } from "../../constants/crashLayout";

const PLAYER_BOX = {
  WIDTH: 90,
  HEIGHT: 20,
  /** Horizontal padding from background edge so text stays inside */
  PADDING_H: 20,
  /** Global horizontal offset for both text groups */
  TEXT_SHIFT_X: -16,
  ALIVE_COLOR: 0x5ee09d,
  DIPPED_COLOR: 0xffcc00,
  TEXT_COLOR: 0xffffff,
} as const;

export interface PlayerBoxOptions {
  aliveNo: number;
  dippedNo: number;
}

/**
 * PlayerBox displays the count of alive and dipped players.
 * Background sprite from player_box.png with two text labels.
 */
export class PlayerBox extends Container {
  private background: Sprite;
  private aliveCountText: Text;
  private aliveLabelText: Text;
  private dippedCountText: Text;
  private dippedLabelText: Text;

  private aliveCount: number;
  private dippedCount: number;

  constructor(options: PlayerBoxOptions) {
    super();

    this.aliveCount = options.aliveNo;
    this.dippedCount = options.dippedNo;

    this.background = Sprite.from(CRASH_ASSETS.PLAYER_BOX);
    this.background.anchor.set(0.5);
    this.background.width = PLAYER_BOX.WIDTH;
    this.background.height = PLAYER_BOX.HEIGHT;
    this.addChild(this.background);

    const halfW = PLAYER_BOX.WIDTH / 2;

    this.aliveCountText = new Text({
      text: String(this.aliveCount),
      style: {
        fontFamily: FONTS.THIRD,
        fontSize: 8,
        fontWeight: FONT_WEIGHTS.MEDIUM,
        fill: PLAYER_BOX.ALIVE_COLOR,
        align: "left",
      },
    });
    this.aliveCountText.anchor.set(0, 0.5);
    this.aliveCountText.x =
      -halfW + PLAYER_BOX.PADDING_H + PLAYER_BOX.TEXT_SHIFT_X;
    this.aliveCountText.y = 0;
    this.addChild(this.aliveCountText);

    this.aliveLabelText = new Text({
      text: " Alive",
      style: {
        fontFamily: FONTS.THIRD,
        fontSize: 8,
        fontWeight: FONT_WEIGHTS.MEDIUM,
        fill: PLAYER_BOX.TEXT_COLOR,
        align: "left",
      },
    });
    this.aliveLabelText.anchor.set(0, 0.5);
    this.aliveLabelText.x = this.aliveCountText.x + this.aliveCountText.width;
    this.aliveLabelText.y = 0;
    this.addChild(this.aliveLabelText);

    this.dippedCountText = new Text({
      text: String(this.dippedCount),
      style: {
        fontFamily: FONTS.THIRD,
        fontSize: 8,
        fontWeight: FONT_WEIGHTS.MEDIUM,
        fill: PLAYER_BOX.DIPPED_COLOR,
        align: "left",
      },
    });
    this.dippedCountText.anchor.set(1, 0.5);
    this.dippedCountText.x =
      halfW - PLAYER_BOX.PADDING_H + PLAYER_BOX.TEXT_SHIFT_X;
    this.dippedCountText.y = 0;
    this.addChild(this.dippedCountText);

    this.dippedLabelText = new Text({
      text: " Dipped",
      style: {
        fontFamily: FONTS.THIRD,
        fontSize: 8,
        fontWeight: FONT_WEIGHTS.MEDIUM,
        fill: PLAYER_BOX.TEXT_COLOR,
        align: "left",
      },
    });
    this.dippedLabelText.anchor.set(0, 0.5);
    this.dippedLabelText.x = this.dippedCountText.x;
    this.dippedLabelText.y = 0;
    this.addChild(this.dippedLabelText);
  }

  /**
   * Update the alive player count and refresh display
   */
  public setAliveCount(count: number): void {
    if (this.destroyed) return;
    this.aliveCount = count;
    this.aliveCountText.text = String(count);
    this.aliveLabelText.x = this.aliveCountText.x + this.aliveCountText.width;
  }

  /**
   * Update the dipped player count and refresh display
   */
  public setDippedCount(count: number): void {
    if (this.destroyed) return;
    this.dippedCount = count;
    this.dippedCountText.text = String(count);
  }

  /**
   * Update both counts at once
   */
  public updateCounts(aliveNo: number, dippedNo: number): void {
    this.setAliveCount(aliveNo);
    this.setDippedCount(dippedNo);
  }

  /**
   * Get current alive count
   */
  public getAliveCount(): number {
    return this.aliveCount;
  }

  /**
   * Get current dipped count
   */
  public getDippedCount(): number {
    return this.dippedCount;
  }

  public destroy(options?: DestroyOptions): void {
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }
}

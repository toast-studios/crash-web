import { Container, Sprite, Text, type DestroyOptions } from "pixi.js";
import { FONTS, FONT_WEIGHTS } from "../../constants/typography";
import { CRASH_ASSETS } from "../../constants/crashLayout";

const PLAYER_BOX = {
  WIDTH: 100,
  HEIGHT: 20,
  /** Horizontal padding from background edge so text stays inside */
  PADDING_H: 28,
  ALIVE_COLOR: 0x00ff88,
  DIPPED_COLOR: 0xffaa00,
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
  private aliveText: Text;
  private dippedText: Text;

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

    this.aliveText = new Text({
      text: this.formatAliveText(this.aliveCount),
      style: {
        fontFamily: FONTS.SECONDARY,
        fontSize: 8,
        fontWeight: FONT_WEIGHTS.MEDIUM,
        fill: PLAYER_BOX.TEXT_COLOR,
        align: "left",
      },
    });
    this.aliveText.anchor.set(0.5);
    this.aliveText.x = -halfW + PLAYER_BOX.PADDING_H;
    this.aliveText.y = 0;
    this.addChild(this.aliveText);

    this.dippedText = new Text({
      text: this.formatDippedText(this.dippedCount),
      style: {
        fontFamily: FONTS.SECONDARY,
        fontSize: 8,
        fontWeight: FONT_WEIGHTS.MEDIUM,
        fill: PLAYER_BOX.TEXT_COLOR,
        align: "left",
      },
    });
    this.dippedText.anchor.set(0.5);
    this.dippedText.x = halfW - PLAYER_BOX.PADDING_H;
    this.dippedText.y = 0;
    this.addChild(this.dippedText);
  }

  /**
   * Update the alive player count and refresh display
   */
  public setAliveCount(count: number): void {
    if (this.destroyed) return;
    this.aliveCount = count;
    this.aliveText.text = this.formatAliveText(count);
  }

  /**
   * Update the dipped player count and refresh display
   */
  public setDippedCount(count: number): void {
    if (this.destroyed) return;
    this.dippedCount = count;
    this.dippedText.text = this.formatDippedText(count);
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

  private formatAliveText(count: number): string {
    return `${count} Alive`;
  }

  private formatDippedText(count: number): string {
    return `${count} Dipped`;
  }

  public destroy(options?: DestroyOptions): void {
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }
}

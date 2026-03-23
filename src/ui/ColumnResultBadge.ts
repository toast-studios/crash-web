import { Container, Graphics, Text } from "pixi.js";
import { ColumnResultUi, ColumnResultUiType } from "../constants/columnResult";

/** @deprecated Use ColumnResultUiType instead */
export type ColumnResultType = ColumnResultUiType;

interface ResultStyle {
  backgroundColor: number;
  textColor: number;
  borderColor: number;
  borderAlpha: number;
  /** Lighter shade for top highlight (subtle 3D) */
  highlightColor: number;
  highlightAlpha: number;
}

export class ColumnResultBadge extends Container {
  private background: Graphics;
  private resultText: Text;
  private badgeWidth: number = 24;
  private badgeHeight: number = 18;
  private cornerRadius: number = 5;

  constructor(result: ColumnResultUiType) {
    super();

    const style = this.getStyleForResult(result);

    this.background = new Graphics();

    // Base fill
    this.background.roundRect(
      0,
      0,
      this.badgeWidth,
      this.badgeHeight,
      this.cornerRadius,
    );
    this.background.fill({ color: style.backgroundColor });

    // Subtle top highlight for depth (soft inner glow)
    const highlightHeight = 6;
    this.background.roundRect(
      1,
      1,
      this.badgeWidth - 2,
      highlightHeight,
      this.cornerRadius - 1,
    );
    this.background.fill({
      color: style.highlightColor,
      alpha: style.highlightAlpha,
    });

    // Crisp border
    this.background.roundRect(
      0,
      0,
      this.badgeWidth,
      this.badgeHeight,
      this.cornerRadius,
    );
    this.background.stroke({
      color: style.borderColor,
      width: 1,
      alpha: style.borderAlpha,
    });

    this.addChild(this.background);

    this.resultText = new Text({
      text: result,
      style: {
        fontFamily: "Pridi",
        fontSize: 11,
        fontWeight: "600",
        fill: style.textColor,
        align: "center",
        dropShadow: {
          color: 0x000000,
          blur: 0,
          distance: 1,
          alpha: 0.25,
        },
      },
    });

    this.resultText.anchor.set(0.5);
    this.resultText.x = this.badgeWidth / 2;
    this.resultText.y = this.badgeHeight / 2 + 0.5;

    this.addChild(this.resultText);
  }

  private getStyleForResult(result: ColumnResultUiType): ResultStyle {
    switch (result) {
      case ColumnResultUi.W:
        return {
          backgroundColor: 0x4ade80,
          textColor: 0x000000,
          borderColor: 0x22c55e,
          borderAlpha: 0.9,
          highlightColor: 0xffffff,
          highlightAlpha: 0.35,
        };
      case ColumnResultUi.TWENTY_ONE:
        return {
          backgroundColor: 0xfbbf24,
          textColor: 0x000000,
          borderColor: 0xf59e0b,
          borderAlpha: 0.9,
          highlightColor: 0xffffff,
          highlightAlpha: 0.4,
        };
      case ColumnResultUi.L:
        return {
          backgroundColor: 0xb85450,
          textColor: 0xffffff,
          borderColor: 0x8f3a35,
          borderAlpha: 0.85,
          highlightColor: 0xffffff,
          highlightAlpha: 0.15,
        };
      case ColumnResultUi.DASH:
        return {
          backgroundColor: 0x3f3f46,
          textColor: 0x666666,
          borderColor: 0x52525b,
          borderAlpha: 0.7,
          highlightColor: 0xffffff,
          highlightAlpha: 0.08,
        };
      case ColumnResultUi.P:
        return {
          backgroundColor: 0x71717a,
          textColor: 0xffffff,
          borderColor: 0x52525b,
          borderAlpha: 0.8,
          highlightColor: 0xa1a1aa,
          highlightAlpha: 0.25,
        };
      default:
        return {
          backgroundColor: 0x4a4a4a,
          textColor: 0xffffff,
          borderColor: 0x404040,
          borderAlpha: 0.8,
          highlightColor: 0xffffff,
          highlightAlpha: 0.1,
        };
    }
  }

  public getBadgeWidth(): number {
    return this.badgeWidth;
  }

  public getBadgeHeight(): number {
    return this.badgeHeight;
  }
}

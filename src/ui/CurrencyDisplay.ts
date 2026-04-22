import { Container, Sprite, Text } from "pixi.js";
import { Logger } from "../utils/logger";

export interface CurrencyDisplayConfig {
  icon?: string;
  symbol?: string;
  size?: number;
  textStyle?: {
    fontSize?: number;
    fontWeight?: "normal" | "bold" | "bolder" | "lighter" | number;
    fill?: number;
    fontFamily?: string;
  };
  showBackground?: boolean;
}

export class CurrencyDisplay extends Container {
  private currentDisplay?: Sprite | Text;
  private backgroundSprite?: Sprite;
  private config: CurrencyDisplayConfig;

  constructor(config: CurrencyDisplayConfig) {
    super();
    this.config = {
      size: 40,
      textStyle: {
        fontSize: 24,
        fontWeight: "bold",
        fill: 0xffffff,
        fontFamily: "Arial",
      },
      showBackground: false,
      ...config,
    };

    this.render();
  }

  public updateCurrency(config: Partial<CurrencyDisplayConfig>): void {
    this.config = { ...this.config, ...config };
    this.render();
  }

  public getDisplayWidth(): number {
    return this.currentDisplay?.width || 0;
  }

  public getDisplayHeight(): number {
    return this.currentDisplay?.height || 0;
  }

  public getDisplayType(): "icon" | "symbol" | "none" {
    if (!this.currentDisplay) return "none";
    return this.currentDisplay instanceof Sprite ? "icon" : "symbol";
  }

  private render(): void {
    // Clear existing display and background
    if (this.currentDisplay) {
      this.removeChild(this.currentDisplay);
      this.currentDisplay.destroy();
      this.currentDisplay = undefined;
    }

    if (this.backgroundSprite) {
      this.removeChild(this.backgroundSprite);
      this.backgroundSprite.destroy();
      this.backgroundSprite = undefined;
    }

    // Priority 1: Icon (Sprite)
    if (this.config.icon) {
      try {
        const sprite = Sprite.from(this.config.icon);
        sprite.width = this.config.size!;
        sprite.height = this.config.size!;
        this.addChild(sprite);
        this.currentDisplay = sprite;
        return;
      } catch (error) {
        Logger.warn(`Failed to load currency icon: ${this.config.icon}`, error);
      }
    }

    // Priority 2: Symbol (Text) with background
    if (this.config.symbol) {
      if (this.config.showBackground) {
        this.backgroundSprite = Sprite.from("currency-bg");
        this.backgroundSprite.width = this.config.size!;
        this.backgroundSprite.height = this.config.size!;
        this.addChild(this.backgroundSprite);
      }
      const text = new Text({
        text: this.config.symbol,
        style: {
          fontSize: this.config.textStyle!.fontSize,
          fill: this.config.textStyle!.fill,
          fontFamily: this.config.textStyle!.fontFamily,
        },
      });

      // Center the text within the size bounds
      text.anchor.set(0.5, 0.5);
      text.x = this.config.size! / 2;
      text.y = this.config.size! / 2;

      this.addChild(text);
      this.currentDisplay = text;
      return;
    }
  }

  public setDisplayPosition(x: number, y: number): void {
    // Position background sprite if it exists
    if (this.backgroundSprite) {
      this.backgroundSprite.x = x;
      this.backgroundSprite.y = y;
    }

    if (this.currentDisplay) {
      if (this.currentDisplay instanceof Text) {
        // Text is already centered, adjust position accordingly
        this.currentDisplay.x = x + this.config.size! / 2;
        this.currentDisplay.y = y + this.config.size! / 2;
      } else {
        // Sprite positioning
        this.currentDisplay.x = x;
        this.currentDisplay.y = y;
      }
    }
  }

  public getCurrentDisplay(): Sprite | Text | undefined {
    return this.currentDisplay;
  }

  public destroy(): void {
    if (this.currentDisplay) {
      this.currentDisplay.destroy();
    }
    if (this.backgroundSprite) {
      this.backgroundSprite.destroy();
    }
    super.destroy();
  }
}

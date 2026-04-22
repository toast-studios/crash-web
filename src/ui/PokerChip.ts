import { Sprite, Text, Container, FillGradient } from "pixi.js";
import gsap from "gsap";
import { CURRENT_PARTNER, PARTNER_SPECIFIC_CONFIG } from "../network/constants";
import { formatCurrency } from "../utils/currency";
import { CurrencyDisplay } from "./CurrencyDisplay";
import { CURRENCY_CODES, CURRENCY_UI_MAPPING } from "../types";
import { app } from "../app";

interface PokerChipConfig {
  currencySymbol: string;
  currencyCode: CURRENCY_CODES;
  isActive: boolean;
  value: number;
  displayValue?: string;
}

export class PokerChip extends Container {
  private readonly chip: Sprite;
  private readonly valueText: Text;
  private readonly currencyDisplay?: CurrencyDisplay;
  private readonly currencyCode: CURRENCY_CODES;
  private readonly CURRENCY_ICON_SIZE = 25;

  private createTextGradient(isActive: boolean) {
    // Check if PIXI app is initialized and ready
    if (!app.renderer || !app.renderer.canvas) {
      console.warn("PIXI app not ready, using solid color fallback");
      return isActive ? 0xffffff : 0xa1a0a0;
    }

    try {
      return isActive
        ? (() => {
            const primaryGradient = new FillGradient(0, 0, 0, 42);
            const colorStops =
              PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].pokerChipTextColor;
            colorStops.forEach(({ color, colorStop }) => {
              primaryGradient.addColorStop(colorStop, color);
            });
            return primaryGradient;
          })()
        : (() => {
            const primaryGradient = new FillGradient(0, 0, 0, 42);
            primaryGradient.addColorStop(0, 0xa1a0a0);
            primaryGradient.addColorStop(1, 0x3b3b3b);
            return primaryGradient;
          })();
    } catch (error) {
      console.warn(
        "Failed to create gradient, using solid color fallback:",
        error,
      );
      return isActive ? 0xffffff : 0xa1a0a0;
    }
  }

  constructor(config: PokerChipConfig) {
    super();

    // Create chip sprite based on active state
    const textureKey = config.isActive
      ? "poker-chip-active"
      : "poker-chip-inactive";
    this.chip = Sprite.from(textureKey);

    // Center the sprite anchor
    this.chip.anchor.set(0.5);
    this.chip.scale.set(0.45);

    // Create centered text
    const textFill = this.createTextGradient(config.isActive);

    const currencyMapping = CURRENCY_UI_MAPPING[config.currencyCode];
    this.currencyCode = config.currencyCode;
    // Build display text - exclude currency symbol if showing currency display
    const displayText = formatCurrency(
      config.value,
      config.currencyCode,
      config.currencySymbol,
      currencyMapping?.icon ? false : true,
      "Free",
    );

    this.valueText = new Text({
      text: displayText,
      style: {
        fontFamily: "Pridi",
        fontSize: 27,
        fill: textFill,
        align: "center",
        fontWeight: "800",
      },
    });

    // Center the text anchor
    this.valueText.anchor.set(0.5);

    // Add sprite and text to container
    this.addChild(this.chip);
    this.addChild(this.valueText);

    // Add currency display if needed
    if (currencyMapping?.icon) {
      this.currencyDisplay = new CurrencyDisplay({
        icon: currencyMapping?.icon,
        size: this.CURRENCY_ICON_SIZE,
      });

      this.addChild(this.currencyDisplay);
    }
    // Adjust text size to fit within chip width
    this.adjustTextSize();
  }

  public setActive(isActive: boolean): void {
    const textureKey = isActive ? "poker-chip-active" : "poker-chip-inactive";
    this.chip.texture = Sprite.from(textureKey).texture;
    this.updateTextGradient(isActive);
  }

  public setValue(value: string | number, displayValue?: string): void {
    this.valueText.text = displayValue || value.toString();
    this.adjustTextSize();
  }

  private adjustTextSize(): void {
    let maxWidth = 0;
    const currencyMapping = CURRENCY_UI_MAPPING[this.currencyCode];
    const currencySymbolPosition =
      PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].currencySymbolPosition;
    if (currencyMapping.icon && this.currencyDisplay) {
      if (currencySymbolPosition === "top") {
        maxWidth = this.chip.width * 0.73;
      } else {
        maxWidth = this.chip.width * 0.73 - this.currencyDisplay.width;
      }
    } else {
      maxWidth = this.chip.width * 0.7;
    }
    let fontSize = 27; // Start with default font size

    this.valueText.style.fontSize = fontSize;

    // Reduce font size until text fits within maxWidth
    while (this.valueText.width > maxWidth && fontSize > 10) {
      fontSize -= 1;
      this.valueText.style.fontSize = fontSize;
    }

    // Reposition currency display if it exists
    if (this.currencyDisplay) {
      this.positionCurrencyDisplay();
    }
  }

  private positionCurrencyDisplay(): void {
    if (!this.currencyDisplay) return;

    const gap = 5;
    const currencyPosition =
      PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].currencySymbolPosition;

    if (currencyPosition === "top") {
      // Vertical layout: currency display on top, text below
      this.currencyDisplay.position.set(
        -this.currencyDisplay.getDisplayWidth() / 2,
        -gap - this.currencyDisplay.getDisplayHeight(),
      );
      this.valueText.position.set(0, this.CURRENCY_ICON_SIZE / 2 - 5);
    } else {
      // Horizontal layout: currency display on left, text on right
      const totalWidth = this.chip.width * 0.73;

      this.currencyDisplay.position.set(
        -totalWidth * 0.55,
        -this.currencyDisplay.getDisplayHeight() / 2,
      );
      this.valueText.position.set(
        this.currencyDisplay.x + this.currencyDisplay.width * 1.45 + gap,
        0,
      );
    }
  }

  public updateTextGradient(isActive: boolean): void {
    const textFill = this.createTextGradient(isActive);
    this.valueText.style.fill = textFill;
  }

  public hide(): void {
    gsap.to(this, {
      alpha: 0,
      duration: 0.2,
      ease: "power1.in",
      onComplete: () => {
        this.visible = false;
      },
    });
  }
}

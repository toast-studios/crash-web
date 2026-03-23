import { Container, Sprite, Text, NineSliceSprite, Graphics } from "pixi.js";
import { sfx } from "../utils/audio";
import gsap from "gsap";
import { Currency } from "../types/playable";
import { CURRENT_PARTNER, PARTNER_SPECIFIC_CONFIG } from "../network/constants";
import { CurrencyDisplay } from "./CurrencyDisplay";
import { CURRENCY_UI_MAPPING, CurrencyUIMapping } from "../types";
import { CURRENCY_CODES } from "../types";
import { formatCurrency } from "../utils/currency";

export class CurrencySwitch extends Container {
  private background!: NineSliceSprite;
  private currencyContainers: Map<string, Container> = new Map();
  private currencyTexts: Map<string, Text> = new Map();
  private toggleSwitch?: NineSliceSprite;

  private activeCurrency: CURRENCY_CODES =
    PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].defaultCurrency;
  private availableCurrencies: CURRENCY_CODES[];
  private onCurrencyChange: (currency: CURRENCY_CODES) => void;
  private currencyBalances: Currency[];

  private ICON_SIZE = 40;
  private CURRENCY_SPACING = 20;
  private PADDING = 10;
  private TEXT_STYLE = {
    fontSize: 18,
    fontWeight: "bold" as const,
    fill: 0xffffff,
  };

  constructor(
    onCurrencyChange: (currency: CURRENCY_CODES) => void,
    preLoadedBalances: Currency[],
  ) {
    super();

    this.onCurrencyChange = onCurrencyChange;
    this.currencyBalances = preLoadedBalances;
    this.availableCurrencies = this.sortCurrenciesByPreference(
      preLoadedBalances.map((c) => c.currencyCode as CURRENCY_CODES),
    );

    const totalWidth = this.calculateTotalWidth();
    const backgroundHeight = this.createBackground(totalWidth);
    this.createCurrencies(backgroundHeight);

    if (this.availableCurrencies.length > 1) {
      this.createToggleSwitch(backgroundHeight);
      this.updateTogglePosition();
    }

    this.updateActiveState();
    this.visible = true;
  }

  private calculateTotalWidth(): number {
    let totalWidth = 0;

    this.availableCurrencies.forEach((currencyCode) => {
      const mapping = this.getCurrencyMapping(currencyCode);
      const balance =
        this.currencyBalances.find((c) => c.currencyCode === currencyCode)
          ?.balance || 0;

      const formattedText = formatCurrency(
        balance,
        currencyCode,
        mapping.symbol || "",
        false,
      );

      const tempText = new Text({
        text: formattedText,
        style: this.TEXT_STYLE,
      });

      totalWidth += this.ICON_SIZE + tempText.width + 10;
      tempText.destroy();
    });

    totalWidth += this.CURRENCY_SPACING * (this.availableCurrencies.length - 1);
    totalWidth += this.PADDING * 2;

    const minWidth = 140 * this.availableCurrencies.length;

    return Math.max(totalWidth, minWidth);
  }

  private createBackground(width: number): number {
    const backgroundTexture = Sprite.from(
      "currency-selector-container-background",
    ).texture;
    const height = backgroundTexture.height / 2 + 5;

    this.background = new NineSliceSprite({
      texture: backgroundTexture,
      leftWidth: backgroundTexture.height / 2,
      topHeight: backgroundTexture.height / 2,
      rightWidth: backgroundTexture.height / 2,
      bottomHeight: backgroundTexture.height / 2,
      width,
      height,
    });
    this.addChild(this.background);

    return height;
  }

  private createCurrencies(backgroundHeight: number): void {
    const currenciesContainer = new Container();
    currenciesContainer.x = this.PADDING;
    currenciesContainer.y = backgroundHeight / 2;
    this.addChild(currenciesContainer);

    let currentX = 0;

    this.availableCurrencies.forEach((currencyCode) => {
      const mapping = this.getCurrencyMapping(currencyCode);
      const balance =
        this.currencyBalances.find((c) => c.currencyCode === currencyCode)
          ?.balance || 0;

      const container = new Container();
      const spacer = new Graphics();
      spacer.rect(0, 0, 120, 2);
      spacer.fill({ color: 0xffffff, alpha: 0 });
      container.addChild(spacer);
      container.width = 120;
      container.x = currentX;

      const display = new CurrencyDisplay({
        icon: mapping.icon,
        symbol: mapping.symbol,
        size: this.ICON_SIZE,
        showBackground: true,
      });

      if (display.getCurrentDisplay()) {
        display.x = 0;
        display.y = -this.ICON_SIZE / 2 - 3;
        container.addChild(display);

        const text = new Text({
          text: formatCurrency(
            balance,
            currencyCode,
            mapping.symbol || "",
            false,
          ),
          style: this.TEXT_STYLE,
        });

        text.x = this.ICON_SIZE + 10;
        text.y = -text.height / 2 - 3;
        container.addChild(text);
        this.currencyTexts.set(currencyCode, text);

        if (this.availableCurrencies.length > 1) {
          container.interactive = true;
          container.cursor = "pointer";
          container.on("pointerdown", () => {
            if (this.activeCurrency !== currencyCode) {
              this.handleCurrencySwitch(currencyCode);
            }
          });
        }

        currenciesContainer.addChild(container);
        this.currencyContainers.set(currencyCode, container);

        currentX += container.width + this.CURRENCY_SPACING;
      }
    });
  }

  private createToggleSwitch(backgroundHeight: number): void {
    const backgroundTexture = Sprite.from(
      "active-currency-container-background",
    ).texture;
    this.toggleSwitch = new NineSliceSprite({
      texture: backgroundTexture,
      leftWidth: backgroundTexture.height / 2,
      topHeight: backgroundTexture.height / 2,
      rightWidth: backgroundTexture.height / 2,
      bottomHeight: backgroundTexture.height / 2,
      width: 120,
      height: backgroundTexture.height / 2 + 5,
    });
    this.toggleSwitch.y =
      backgroundHeight / 2 - this.toggleSwitch.height / 2 - 3;
    this.addChildAt(this.toggleSwitch, 1);
  }

  private sortCurrenciesByPreference(
    currencies: CURRENCY_CODES[],
  ): CURRENCY_CODES[] {
    const defaultCurrency =
      PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].defaultCurrency;
    const sorted = [...currencies];

    const defaultIndex = sorted.indexOf(defaultCurrency);
    if (defaultIndex > 0) {
      sorted.splice(defaultIndex, 1);
      sorted.unshift(defaultCurrency);
    }

    return sorted;
  }

  private getCurrencyMapping(currencyCode: CURRENCY_CODES): CurrencyUIMapping {
    return (
      CURRENCY_UI_MAPPING[currencyCode] || {
        symbol: currencyCode,
      }
    );
  }

  public updateCurrencyBalance(
    currencyCode: CURRENCY_CODES,
    balance: number,
  ): void {
    const text = this.currencyTexts.get(currencyCode);
    const mapping = this.getCurrencyMapping(currencyCode);

    if (text) {
      text.text = formatCurrency(
        balance,
        currencyCode,
        mapping.symbol || "",
        false,
      );

      if (currencyCode === this.activeCurrency && this.toggleSwitch) {
        this.updateTogglePosition();
      }
    }
  }

  private handleCurrencySwitch(newCurrency: CURRENCY_CODES): void {
    if (this.availableCurrencies.length === 1) return;

    sfx.play("common/button-click.mp3");
    this.activeCurrency = newCurrency;
    this.updateTogglePosition();
    this.updateActiveState();
    this.onCurrencyChange(this.activeCurrency);
  }

  private updateTogglePosition(): void {
    if (!this.toggleSwitch) return;

    const activeContainer = this.currencyContainers.get(this.activeCurrency);

    if (!activeContainer) return;

    const toggleWidth = activeContainer.width + 10;
    this.toggleSwitch.width = Math.max(toggleWidth, 120);

    const targetX = this.PADDING + activeContainer.x - 5;

    gsap.to(this.toggleSwitch, {
      x: targetX,
      duration: 0.3,
      ease: "power2.inOut",
    });
  }

  private updateActiveState(): void {
    if (this.availableCurrencies.length === 1) return;

    this.currencyContainers.forEach((container, currencyCode) => {
      const isActive = currencyCode === this.activeCurrency;
      gsap.to(container, {
        alpha: isActive ? 1 : 0.7,
        duration: 0.3,
      });
    });
  }

  public updateLayout(): void {
    if (this.toggleSwitch) {
      this.updateTogglePosition();
    }
  }

  public setActiveCurrency(currency: CURRENCY_CODES): void {
    if (
      this.activeCurrency !== currency &&
      this.availableCurrencies.includes(currency)
    ) {
      this.handleCurrencySwitch(currency);
    }
  }

  public getActiveCurrency(): CURRENCY_CODES {
    return this.activeCurrency;
  }

  public getAvailableCurrencies(): CURRENCY_CODES[] {
    return [...this.availableCurrencies];
  }

  public static addCurrencyMapping(
    currencyCode: string,
    mapping: CurrencyUIMapping,
  ): void {
    CURRENCY_UI_MAPPING[currencyCode] = mapping;
  }
}

import { Container, Sprite, Text } from "pixi.js";
import { app } from "../app";
import { AmountChangeButton } from "./AmountChangeButton";
import gsap from "gsap";
import { getActiveLobbyIndex } from "../utils/lobby";
import { Lobby } from "../store/storeTypes";
import { Currency } from "../types/playable";
import { CURRENCY_UI_MAPPING } from "../types";
import { formatCurrency } from "../utils/currency";
interface CoinData {
  value: Lobby;
  scale: number;
  isActive: boolean;
}

export class LobbySelector extends Container {
  private coins: CoinData[] = [];
  private activeIndex: number = 0;
  private background: Sprite;
  private decreaseButton: AmountChangeButton;
  private increaseButton: AmountChangeButton;
  private amountContainer: Container | null = null;
  private amountText: Text;
  //private bottomBorder:Graphics;
  private winText: Text;
  private bottomSeparatorLine: Sprite;
  constructor(values: Lobby[], currencyBalances: Currency) {
    super();
    this.width = app.screen.width * 0.8;
    this.height = 80;
    this.pivot.set(0.5);
    // Use utility function to determine active index with balance info available
    const activeIndex = getActiveLobbyIndex(values, currencyBalances);

    this.coins = values.map((value, index) => ({
      value: value,
      scale: 1,
      isActive: index === activeIndex,
    }));

    this.activeIndex = activeIndex;
    this.background = Sprite.from("game_action_button_holdsser");
    this.background.width = app.screen.width * 0.8;
    this.background.height = 80;
    this.background.anchor.set(0.5);
    this.addChild(this.background);
    this.decreaseButton = new AmountChangeButton({
      size: 50,
      circleColor: 0x3f3b3e,
      sign: "-",
      onClick: () => this.goToPreviousIndex(),
    });
    this.addChild(this.decreaseButton);
    this.decreaseButton.pivot.set(
      this.decreaseButton.width / 2,
      this.decreaseButton.height / 2,
    );
    this.decreaseButton.x = -this.background.width / 3;
    this.decreaseButton.y = 0;
    this.amountContainer = new Container();
    this.amountContainer.pivot.set(
      this.amountContainer.width / 2,
      this.amountContainer.height / 2,
    );
    this.amountContainer.x = 0;
    this.amountContainer.y = 0;
    this.amountText = new Text({
      text:
        values.length > 0
          ? formatCurrency(
              values[activeIndex]?.winAmount ?? 0,
              values[activeIndex].currencyCode,
              CURRENCY_UI_MAPPING[values[activeIndex].currencyCode].symbol ||
                "",
              false,
            )
          : "0",
      style: {
        fontSize: 60,
        fill: 0xffffff,
        wordWrap: true,
        wordWrapWidth: 350,
        align: "center",
        fontWeight: "800",
      },
    });
    this.winText = new Text({
      text: "WIN",
      style: {
        fontSize: 26,
        fill: 0xffffff,
        align: "center",
        fontWeight: "300",
      },
    });
    this.amountText.anchor.set(0.5);
    this.winText.anchor.set(0.5, 0.5);
    this.winText.y = -this.amountText.y - this.amountText.height / 2 - 30;
    this.amountContainer.addChild(this.amountText);
    this.amountContainer.addChild(this.winText);
    this.addChild(this.amountContainer);

    // Add bottom separator line for amountContainer
    this.bottomSeparatorLine = Sprite.from("separator-line");
    this.bottomSeparatorLine.width = 100;
    this.bottomSeparatorLine.height = 5;
    this.bottomSeparatorLine.anchor.set(0.5);
    this.bottomSeparatorLine.scale.set(0.5);
    this.bottomSeparatorLine.x = this.amountContainer.x;
    this.bottomSeparatorLine.y =
      this.amountContainer.y + this.amountContainer.height / 2 - 12;
    this.bottomSeparatorLine.zIndex = 1000;
    this.addChild(this.bottomSeparatorLine);

    // Position the decrease button on the left side, centered vertically
    this.increaseButton = new AmountChangeButton({
      size: 50,
      circleColor: 0x3f3b3e,
      sign: "+",
      onClick: () => this.goToNextIndex(),
    });
    this.addChild(this.increaseButton);
    this.increaseButton.pivot.set(
      this.increaseButton.width / 2,
      this.increaseButton.height / 2,
    );
    this.increaseButton.x = this.background.width / 3;
    this.increaseButton.y = 0;

    this.setActiveIndex(activeIndex);
    this.setupInteraction();
    this.updateAmountDisplay();
    this.updateButtonStates();
  }

  private setupInteraction(): void {
    this.eventMode = "static";
    this.cursor = "pointer";
  }
  public getCurrentValue(): Lobby | null {
    if (this.coins.length === 0) {
      return null;
    }
    return this.coins[this.activeIndex].value;
  }

  public hasValidData(): boolean {
    return this.coins.length > 0;
  }
  public resize(): void {
    this.background.width = app.screen.width * 0.8;
    this.background.height = 80;
    this.background.anchor.set(0.5);
  }
  public destroy(): void {
    super.destroy();
  }

  public updateValues(values: Lobby[], currencyBalances: Currency): void {
    // Use utility function to determine active index
    const activeIndex = getActiveLobbyIndex(values, currencyBalances);

    this.coins = values.map((value, index) => ({
      value: value,
      scale: 1,
      isActive: index === activeIndex,
    }));

    this.activeIndex = activeIndex;
    this.setActiveIndex(activeIndex);
    this.updateButtonStates();
    this.updateAmountDisplay();
  }

  private goToNextIndex(): void {
    if (this.coins.length === 0) return;

    if (this.activeIndex < this.coins.length - 1) {
      this.showAnimation(true);
      const nextIndex = this.activeIndex + 1;
      this.setActiveIndex(nextIndex);
    }
  }

  private goToPreviousIndex(): void {
    if (this.coins.length === 0) return;

    // Only proceed if there's a previous lobby available
    if (this.activeIndex > 0) {
      this.showAnimation(false);
      const prevIndex = this.activeIndex - 1;
      this.setActiveIndex(prevIndex);
    }
  }

  private updateButtonStates(): void {
    // Disable/enable decrease button based on whether there's a previous lobby
    if (this.decreaseButton) {
      this.decreaseButton.eventMode = this.activeIndex > 0 ? "static" : "none";
      this.decreaseButton.alpha = this.activeIndex > 0 ? 1 : 0.5;
    }

    // Disable/enable increase button based on whether there's a next lobby
    if (this.increaseButton) {
      this.increaseButton.eventMode =
        this.activeIndex < this.coins.length - 1 ? "static" : "none";
      this.increaseButton.alpha =
        this.activeIndex < this.coins.length - 1 ? 1 : 0.5;
    }
  }

  private setActiveIndex(newIndex: number): void {
    if (newIndex < 0 || newIndex >= this.coins.length) return;

    this.activeIndex = newIndex;
    //this.updateAmountDisplay();

    // Update button states after changing active index
    this.updateButtonStates();

    // Emit selection-changed event
    this.emit("selection-changed", this.coins[newIndex].value);
  }

  private updateAmountDisplay(): void {
    if (this.amountText && this.coins.length > 0) {
      const currentCoin = this.coins[this.activeIndex];
      this.amountText.text = formatCurrency(
        currentCoin?.value?.winAmount ?? 0,
        currentCoin.value.currencyCode,
        CURRENCY_UI_MAPPING[currentCoin.value.currencyCode].symbol || "",
        false,
      );
    }
  }

  private showAnimation(isNext: boolean): void {
    const x = isNext
      ? this.decreaseButton.x + this.amountText.width / 2
      : this.increaseButton.x - this.amountText.width / 2;
    gsap.to(this.amountText, {
      duration: 0.05,
      x: x,
      alpha: 0,
      ease: "power2.inOut",
      onStart: () => {
        this.decreaseButton.eventMode = "none";
        this.increaseButton.eventMode = "none";
        gsap.to(this.amountText.scale, {
          duration: 0.05,
          x: 0.8,
          y: 0.8,
          ease: "power2.inOut",
        });
      },
      onComplete: () => {
        this.updateAmountDisplay();
        gsap.set(this.amountText, {
          x: isNext
            ? this.increaseButton.x - this.amountText.width / 2
            : this.decreaseButton.x + this.amountText.width / 2,
        });
        gsap.to(this.amountText, {
          duration: 0.05,
          x: this.background.x,
          alpha: 1,
          ease: "power2.inOut",
          onStart: () => {
            gsap.to(this.amountText.scale, {
              duration: 0.05,
              x: 1,
              y: 1,
              ease: "power2.inOut",
            });
          },
          onComplete: () => {
            this.decreaseButton.eventMode = "static";
            this.increaseButton.eventMode = "static";
            this.updateAmountDisplay();
          },
        });
      },
    });
  }
}

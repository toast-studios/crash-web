import { Container, Graphics, Text } from "pixi.js";
import { WinAmountDisplay } from "./WinAmountDisplay.js";
import { EntryFeeButton } from "./EntryFeeButton.js";
import { CurrencyDisplay } from "../ui/CurrencyDisplay.js";

export class LobbyWinAmountView extends Container {
  public currencySymbol: Graphics;
  public currencyDisplay?: CurrencyDisplay;
  public winAmountDisplay: WinAmountDisplay;
  public minusEntryFeeButton: EntryFeeButton;
  public plusEntryFeeButton: EntryFeeButton;
  private currentAmount: string = "";
  private containerWidth: number;

  constructor(initialAmount: string = "$100", width: number = 300) {
    super();

    this.containerWidth = width;
    this.currentAmount = initialAmount;

    this.currencySymbol = new Graphics();
    this.currencySymbol.rect(0, 0, width, 20);
    this.currencySymbol.fill({ color: 0xffffff, alpha: 0 });
    this.addChild(this.currencySymbol);

    this.winAmountDisplay = new WinAmountDisplay(initialAmount);
    this.addChild(this.winAmountDisplay);

    this.minusEntryFeeButton = new EntryFeeButton("minus");
    this.addChild(this.minusEntryFeeButton);

    this.plusEntryFeeButton = new EntryFeeButton("plus");
    this.addChild(this.plusEntryFeeButton);

    this.setLayout();
  }

  private setLayout() {
    const iconSpacing = 8;
    const iconWidth = this.currencyDisplay?.visible
      ? this.currencyDisplay.getDisplayWidth() + iconSpacing
      : 0;

    // Position currency icon (if exists) and win amount display together
    const totalContentWidth = iconWidth + this.winAmountDisplay.width;
    const startX = this.width / 2 - totalContentWidth / 2;

    if (this.currencyDisplay && this.currencyDisplay.visible) {
      this.currencyDisplay.x = startX;
      this.currencyDisplay.y =
        this.height / 2 - this.currencyDisplay.getDisplayHeight() / 2;
      this.winAmountDisplay.x = startX + iconWidth;
    } else {
      this.winAmountDisplay.x =
        this.width / 2 - this.winAmountDisplay.width / 2;
    }

    this.winAmountDisplay.y =
      this.height / 2 - this.winAmountDisplay.height / 2;

    this.minusEntryFeeButton.x = 0;
    this.minusEntryFeeButton.y =
      this.height / 2 - this.minusEntryFeeButton.height / 2;

    this.plusEntryFeeButton.x = this.width - this.plusEntryFeeButton.width;
    this.plusEntryFeeButton.y =
      this.height / 2 - this.plusEntryFeeButton.height / 2;
  }

  private recenterWinAmountDisplay() {
    const iconSpacing = 8;
    const iconWidth = this.currencyDisplay?.visible
      ? this.currencyDisplay.getDisplayWidth() + iconSpacing
      : 0;

    const totalContentWidth = iconWidth + this.winAmountDisplay.width;
    const startX = this.width / 2 - totalContentWidth / 2;

    if (this.currencyDisplay && this.currencyDisplay.visible) {
      this.currencyDisplay.x = startX;
      this.currencyDisplay.y =
        this.height / 2 - this.currencyDisplay.getDisplayHeight() / 2;
      this.winAmountDisplay.x = startX + iconWidth;
    } else {
      this.winAmountDisplay.x =
        this.width / 2 - this.winAmountDisplay.width / 2;
    }

    this.winAmountDisplay.y =
      this.height / 2 - this.winAmountDisplay.height / 2;
  }

  private parseAmount(amount: string): number {
    // Extract numeric value from formatted string (e.g., "$1,000" -> 1000)
    const numericString = amount.replace(/[^0-9.-]/g, "");
    return parseFloat(numericString) || 0;
  }

  private animateAmountChange(oldAmount: string, newAmount: string) {
    const oldValue = this.parseAmount(oldAmount);
    const newValue = this.parseAmount(newAmount);

    if (oldValue === newValue) {
      this.winAmountDisplay.updateAmount(newAmount);
      this.recenterWinAmountDisplay();
      return;
    }

    // Create a container for the animation
    const animationContainer = new Container();
    const scrollContainer = new Container();
    animationContainer.addChild(scrollContainer);

    // Hide the original display during animation
    this.winAmountDisplay.visible = false;
    this.addChild(animationContainer);

    const step = 34;
    const minVal = Math.min(oldValue, newValue) - 1;
    const maxVal = Math.max(oldValue, newValue) + 1;

    // Extract currency symbol and formatting from the amounts
    const currencySymbol = oldAmount.replace(/[0-9.,\s]/g, "");

    for (let i = minVal; i <= maxVal; i++) {
      const formattedValue = this.formatWithCurrency(
        i,
        currencySymbol,
        newAmount,
      );
      const text = new Text({
        text: formattedValue,
        style: {
          fontFamily: "Inter",
          fontSize: 45,
          fill: 0xffffff,
          align: "center",
          fontWeight: "400",
        },
      });
      text.anchor.set(0.5);
      text.x = 0;
      text.y = (i - oldValue) * step;
      text.alpha = 1;

      scrollContainer.addChild(text);
    }

    // Position animation container at the center of the container
    animationContainer.x = this.containerWidth / 2;
    animationContainer.y = this.height / 2;

    // const targetY = -(newValue - oldValue) * step;

    // gsap.to(scrollContainer, {
    //     y: targetY,
    //     duration: 0.3,
    //     ease: "power2.out",
    //     onUpdate: () => {
    //         scrollContainer.children.forEach((child) => {
    //             const text = child as Text;
    //             const currentY = text.y + scrollContainer.y;
    //             const dist = Math.abs(currentY);

    //             const maxDist = step;

    //             const scale = Math.max(0.75, 1 - (dist / maxDist) * 0.25);
    //             text.scale.set(scale);

    //             const alpha = Math.max(0.3, 1 - (dist / maxDist) * 0.7);
    //             text.alpha = alpha;
    //         });
    //     },
    // onComplete: () => {
    // Clean up animation container
    this.removeChild(animationContainer);
    animationContainer.destroy({ children: true });

    // Show and update the original display
    this.winAmountDisplay.visible = true;
    this.winAmountDisplay.updateAmount(newAmount);
    this.recenterWinAmountDisplay();
    // },
    // });
  }

  private formatWithCurrency(
    value: number,
    currencySymbol: string,
    referenceAmount: string,
  ): string {
    // Check if reference amount has commas for thousand separators
    const hasCommas = referenceAmount.includes(",");

    let formattedNumber = Math.abs(value).toString();

    if (hasCommas) {
      // Add thousand separators
      formattedNumber = formattedNumber.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    return `${currencySymbol}${formattedNumber}`;
  }

  public updateAmount(amount: string) {
    const oldAmount = this.currentAmount;
    this.currentAmount = amount;

    // Only animate if both old and new amounts are valid
    if (oldAmount && amount && oldAmount !== amount) {
      this.animateAmountChange(oldAmount, amount);
    } else {
      this.winAmountDisplay.updateAmount(amount);
      this.recenterWinAmountDisplay();
    }
  }

  public updateCurrency(icon?: string, symbol?: string) {
    if (!this.currencyDisplay && (icon || symbol)) {
      this.currencyDisplay = new CurrencyDisplay({
        icon,
        symbol,
        size: 35,
      });
      this.addChild(this.currencyDisplay);
    } else if (this.currencyDisplay) {
      this.currencyDisplay.updateCurrency({ icon, symbol });
    }

    if (this.currencyDisplay) {
      this.currencyDisplay.visible = !!(icon || symbol);
    }

    this.recenterWinAmountDisplay();
  }
}

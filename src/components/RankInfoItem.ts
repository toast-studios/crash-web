import { Container, Graphics, Text } from "pixi.js";
import { CurrencyDisplay } from "../ui/CurrencyDisplay.js";

export interface RankInfo {
  place: string;
  amount: string;
  currencyIcon?: string;
  currencySymbol?: string;
}

export class RankInfoItem extends Container {
  public placeText: Text;
  public amountText: Text;
  public currencyDisplay?: CurrencyDisplay;
  private spacer: Graphics;
  private itemWidth: number;

  constructor(rankInfo: RankInfo, width: number = 300) {
    super();
    this.itemWidth = width;

    this.placeText = new Text({
      text: rankInfo.place,
      style: {
        fontFamily: "Inter",
        fontSize: 14,
        fill: 0xffffff,
        align: "left",
        fontWeight: "900",
      },
    });
    this.addChild(this.placeText);

    // Add currency display if icon or symbol is provided
    if (rankInfo.currencyIcon || rankInfo.currencySymbol) {
      this.currencyDisplay = new CurrencyDisplay({
        icon: rankInfo.currencyIcon,
        symbol: rankInfo.currencySymbol,
        size: 18,
      });
      this.addChild(this.currencyDisplay);
    }

    this.amountText = new Text({
      text: rankInfo.amount,
      style: {
        fontFamily: "Inter",
        fontSize: 14,
        fill: 0xffde83,
        align: "right",
        fontWeight: "900",
      },
    });
    this.addChild(this.amountText);

    this.spacer = new Graphics();
    this.addChild(this.spacer);

    this.setLayout();
  }

  private setLayout() {
    this.placeText.x = 0;
    this.placeText.y = 0;

    const iconSpacing = 4;
    const iconWidth = this.currencyDisplay
      ? this.currencyDisplay.getDisplayWidth() + iconSpacing
      : 0;

    // Position amount and currency icon from the right
    this.amountText.x = this.itemWidth - this.amountText.width;
    this.amountText.y = 0;

    if (this.currencyDisplay) {
      this.currencyDisplay.x = this.amountText.x - iconWidth;
      this.currencyDisplay.y =
        (this.placeText.height - this.currencyDisplay.getDisplayHeight()) / 2;
    }

    // Update spacer width based on currency icon
    const rightContentWidth = iconWidth + this.amountText.width;
    const splitterWidth =
      this.itemWidth - this.placeText.width - rightContentWidth - 10;

    this.spacer.clear();
    this.spacer.rect(0, 0, splitterWidth, 0.5);
    this.spacer.fill({ color: 0xffffff, alpha: 0.2 });

    this.spacer.x = this.placeText.width + 5;
    this.spacer.y = this.placeText.height - 5;
  }

  public updateRankInfo(rankInfo: RankInfo) {
    this.placeText.text = rankInfo.place;
    this.amountText.text = rankInfo.amount;

    // Update or create currency display
    if (rankInfo.currencyIcon || rankInfo.currencySymbol) {
      if (!this.currencyDisplay) {
        this.currencyDisplay = new CurrencyDisplay({
          icon: rankInfo.currencyIcon,
          symbol: rankInfo.currencySymbol,
          size: 18,
        });
        this.addChild(this.currencyDisplay);
      } else {
        this.currencyDisplay.updateCurrency({
          icon: rankInfo.currencyIcon,
          symbol: rankInfo.currencySymbol,
        });
      }
    }

    this.setLayout();
  }
}

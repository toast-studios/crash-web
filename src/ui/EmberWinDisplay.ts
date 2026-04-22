import { Container, Text } from "pixi.js";
import { Lobby } from "../store/storeTypes";
import { formatCurrency } from "../utils/currency";
import { CURRENCY_UI_MAPPING } from "../types";
import { CurrencyDisplay } from "./CurrencyDisplay";

export class EmberWinDisplay extends Container {
  private entryFeeAmountText: Text;
  private currencyIcon: CurrencyDisplay;
  private entryFeeText: Text;

  constructor(lobby?: Lobby) {
    super();

    // Win amount text
    this.entryFeeAmountText = new Text({
      text: "",
      style: {
        fontFamily: "Inter",
        fontSize: 22,
        fill: 0xffffff,
        fontWeight: "900",
        align: "center",
      },
    });
    this.addChild(this.entryFeeAmountText);

    // Title text
    this.entryFeeText = new Text({
      text: "",
      style: {
        fontFamily: "Inter",
        fontSize: 22,
        fill: 0xa3a3a3,
        fontWeight: "100",
        align: "center",
      },
    });
    this.addChild(this.entryFeeText);

    this.currencyIcon = new CurrencyDisplay({
      icon: lobby?.currencyCode
        ? CURRENCY_UI_MAPPING[lobby.currencyCode].icon
        : undefined,
      size: 24,
    });
    this.addChild(this.currencyIcon);

    if (lobby) {
      this.updateDisplay(lobby);
    }
  }

  public updateDisplay(lobby: Lobby) {
    this.entryFeeAmountText.text = lobby
      ? formatCurrency(
          lobby.entryFee,
          lobby.currencyCode,
          lobby.currencySymbol,
          false,
        )
      : "";
    this.entryFeeText.text = lobby ? "Entry Fee" : "";
    const currencyMapping = CURRENCY_UI_MAPPING[lobby.currencyCode];
    this.currencyIcon.updateCurrency({
      icon: currencyMapping.icon,
    });
    if (currencyMapping && currencyMapping.icon) {
      this.currencyIcon.visible = true;
    } else {
      this.currencyIcon.visible = false;
      this.entryFeeAmountText.x = 0; // Center the text if no icon
    }

    this.adjustLayout();
  }

  private adjustLayout() {
    this.currencyIcon.x = 0;
    this.currencyIcon.y = 2;
    this.entryFeeAmountText.x = this.currencyIcon.getDisplayWidth() + 3;
    this.entryFeeText.x =
      this.entryFeeAmountText.x + this.entryFeeAmountText.width + 10;
  }

  public show() {
    this.visible = true;
  }

  public hide() {
    this.visible = false;
  }
}

import { Container, Text } from "pixi.js";

export class WinAmountDisplay extends Container {
  public winAmount: Text;
  public currencySymbol: Container;
  public currencyGroup: Container;

  constructor(amount: string = "$100") {
    super();

    this.winAmount = new Text({
      text: amount,
      style: {
        fontFamily: "Inter",
        fontSize: 45,
        fill: 0xffffff,
        align: "left",
        fontWeight: "400",
      },
    });
    this.addChild(this.winAmount);

    this.currencySymbol = new Container();
    this.addChild(this.currencySymbol);

    this.currencyGroup = new Container();
    this.currencySymbol.addChild(this.currencyGroup);
  }

  public updateAmount(amount: string) {
    this.winAmount.text = amount;
  }
}

import { Container, Sprite, Text } from "pixi.js";

export class CurrencySelector extends Container {
  public background: Sprite;
  public activeCurrencyContainer: Container;
  public activeCurrencyBackground: Sprite;
  public activeCurrencySymbol: Container;
  public activeCurrencyGroup: Container;
  public activeCurrencyValue: Text;
  public inactiveCurrencyContainer: Container;
  public inactiveCurrencySymbol: Container;
  public inactiveCurrencyGroup: Container;
  public inactiveCurrencyValue: Text;

  constructor() {
    super();

    this.background = Sprite.from("currency-selector-container-background");
    this.background.width = this.background.width / 2;
    this.background.height = this.background.height / 2;
    this.addChild(this.background);

    this.activeCurrencyContainer = new Container();
    this.addChild(this.activeCurrencyContainer);

    this.activeCurrencyBackground = Sprite.from(
      "active-currency-container-background",
    );
    this.activeCurrencyBackground.width =
      this.activeCurrencyBackground.width / 2;
    this.activeCurrencyBackground.height =
      this.activeCurrencyBackground.height / 2;
    this.activeCurrencyContainer.addChild(this.activeCurrencyBackground);

    this.activeCurrencySymbol = new Container();
    this.activeCurrencyContainer.addChild(this.activeCurrencySymbol);

    this.activeCurrencyGroup = new Container();
    this.activeCurrencySymbol.addChild(this.activeCurrencyGroup);

    this.activeCurrencyValue = new Text({
      text: "$",
      style: {
        fontFamily: "Inter",
        fontSize: 16,
        fill: 0xffffff,
        align: "left",
        fontWeight: "400",
      },
    });
    this.activeCurrencyContainer.addChild(this.activeCurrencyValue);

    this.inactiveCurrencyContainer = new Container();
    this.addChild(this.inactiveCurrencyContainer);

    this.inactiveCurrencySymbol = new Container();
    this.inactiveCurrencyContainer.addChild(this.inactiveCurrencySymbol);

    this.inactiveCurrencyGroup = new Container();
    this.inactiveCurrencySymbol.addChild(this.inactiveCurrencyGroup);

    this.inactiveCurrencyValue = new Text({
      text: "₹",
      style: {
        fontFamily: "Inter",
        fontSize: 16,
        fill: 0xffffff,
        align: "left",
        fontWeight: "400",
      },
    });
    this.inactiveCurrencyValue.alpha = 0.25;
    this.inactiveCurrencyContainer.addChild(this.inactiveCurrencyValue);

    this.setLayout();
  }

  private setLayout() {
    // Position active currency container
    this.activeCurrencyContainer.x = 20;
    this.activeCurrencyContainer.y = 10;
    this.activeCurrencyValue.x = 30;
    this.activeCurrencyValue.y = 5;

    // Position inactive currency container
    this.inactiveCurrencyContainer.x = 120;
    this.inactiveCurrencyContainer.y = 10;
    this.inactiveCurrencyValue.x = 30;
    this.inactiveCurrencyValue.y = 5;
  }
}

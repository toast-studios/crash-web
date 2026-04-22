import { Container, NineSliceSprite, Text, Texture } from "pixi.js";

export class PriceBox extends Container {
  private background: NineSliceSprite;
  // private overlay: Sprite;
  private labelText: Text;
  private valueText: Text;

  constructor({
    entryFee,
    currencySymbol,
  }: {
    entryFee: number;
    currencySymbol: string;
  }) {
    super();

    // Create background using 9-slice sprite
    this.background = new NineSliceSprite({
      texture: Texture.from("price_box_bg"),
      leftWidth: 35, // Adjusted for typical 9-slice
      topHeight: 10,
      rightWidth: 35,
      bottomHeight: 10,
    });

    this.addChild(this.background);

    // Create overlay
    // this.overlay = Sprite.from("price_box_left_overlay");
    // this.addChild(this.overlay);

    // Create "Prize" label
    this.labelText = new Text({
      text: "Prize",
      style: {
        fontFamily: "Inter", // Using Inter as per general design guidelines
        fontSize: 16,
        fill: 0xffffff,
        fontWeight: "bold",
      },
    });
    this.labelText.anchor.set(0, 0.5);
    this.addChild(this.labelText);

    // Create Value text
    this.valueText = new Text({
      text: `${currencySymbol}${entryFee}`,
      style: {
        fontFamily: "Inter",
        fontSize: 16,
        fill: 0xffffff,
        fontWeight: "bold",
      },
    });
    this.valueText.anchor.set(0, 0.5);
    this.addChild(this.valueText);

    this.layout();
  }

  private layout() {
    const padding = 15;
    const spacing = 10;
    const minWidth = 120; // Minimum width for the box

    // Calculate total width of content
    const contentWidth =
      this.labelText.width + spacing + this.valueText.width + padding * 2;
    const boxWidth = Math.max(minWidth, contentWidth);
    const boxHeight = 40; // Fixed height or dynamic based on content

    // Update background size
    this.background.width = boxWidth;
    this.background.height = boxHeight;

    // Center background
    this.background.x = -boxWidth / 2;
    this.background.y = -boxHeight / 2;

    // Position overlay - align with left side of background
    // this.overlay.height = boxHeight; // Match height
    // this.overlay.x = this.background.x;
    // this.overlay.y = this.background.y;

    // Position text
    // "Prize" on the left, on top of overlay
    this.labelText.x = this.background.x + padding;
    this.labelText.y = 0; // Centered vertically since container is 0,0

    // Value on the right
    this.valueText.x =
      this.background.x + boxWidth - padding - this.valueText.width;
    this.valueText.y = 0;
  }

  public updateValue(entryFee: number, currencySymbol: string) {
    this.valueText.text = `${currencySymbol}${entryFee}`;
    this.layout();
  }
}

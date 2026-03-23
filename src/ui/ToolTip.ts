import { Container, Text, NineSliceSprite, Texture } from "pixi.js";
import { app } from "../app";

export class Tooltip extends Container {
  private text: Text;
  private hideTimeout: NodeJS.Timeout | null = null;

  constructor(options: {
    maxWidth?: number;
    textColor?: number;
    fontSize?: number;
  }) {
    super();

    const { maxWidth = 200, textColor = 0xffffff, fontSize = 21 } = options;

    // Create text
    this.text = new Text({
      text: "",
      style: {
        fontFamily: "Pridi",
        fontSize: fontSize,
        fill: textColor,
        wordWrap: true,
        wordWrapWidth: maxWidth,
        align: "center",
      },
    });
    this.text.resolution = 5;

    // Add to container
    this.addChild(this.text);

    // Set alpha to 0 initially for fade-in effect
    // this.alpha = 0;
  }

  public show({
    text,
    position,
    autoHideDelay = 0,
  }: {
    text: string;
    position: { x: number; y: number };
    autoHideDelay?: number;
  }) {
    this.visible = true;
    this.text.text = text;

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Create background
    const bgTexture = Texture.from("tool_tip_background");
    const bg = new NineSliceSprite({
      texture: bgTexture,
      width: this.text.width + 40,
      height: this.text.height + 30,
      leftWidth: bgTexture.height / 2,
      topHeight: bgTexture.height / 2,
      rightWidth: bgTexture.height / 2,
      bottomHeight: bgTexture.height / 2,
    });

    // * remove previous bg
    if (this.children.length >= 2) {
      this.removeChildAt(0);
    }
    this.addChildAt(bg, 0);

    this.text.position.set(
      bg.width / 2 - this.text.width / 2,
      bg.height / 2 - this.text.height / 2 - 5,
    );
    this.alpha = 0;
    app.ticker.add(this.fadeIn, this);

    this.position.set(
      app.screen.width / 2 - bg.width / 2 + position.x,
      app.screen.height / 2 - bg.height / 2 + position.y,
    );
    // Auto-hide functionality
    if (autoHideDelay > 0) {
      this.hideTimeout = setTimeout(() => {
        this.hide();
      }, autoHideDelay);
    }
  }

  public hide() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    app.ticker.add(this.fadeOut, this);
  }

  private fadeIn() {
    this.alpha += 0.1;
    if (this.alpha >= 1) {
      this.alpha = 1;
      app.ticker.remove(this.fadeIn, this);
    }
  }

  private fadeOut() {
    this.alpha -= 0.1;
    if (this.alpha <= 0) {
      this.alpha = 0;
      app.ticker.remove(this.fadeOut, this);
    }
  }
}

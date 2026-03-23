import { Container, FillGradient, Sprite, Text } from "pixi.js";
import { getWinButtonText, type Lobby } from "../utils/winButtonText";
import gsap from "gsap";

export class WinShowBox extends Container {
  private WinShowBoxContainer: Container | null = null;
  private WinShowBackground: Sprite;
  private WinPrimaryText: Text;
  private WinSecondaryText: Text;

  constructor({ lobby }: { lobby: Lobby | undefined }) {
    super();

    this.WinShowBoxContainer = new Container();
    this.WinShowBackground = Sprite.from("wallet-bn-bg");
    this.WinShowBackground.scale.set(0.5);
    this.addChild(this.WinShowBoxContainer);

    // Create gradient for primary text
    const primaryGradient = new FillGradient(0, 0, 0, 50);
    const gradientColors = [
      { color: 0xeedf93, colorStop: 0 },
      { color: 0xfef5cf, colorStop: 0.5 },
      { color: 0xf8df71, colorStop: 1 },
    ];
    gradientColors.forEach(({ color, colorStop }) => {
      primaryGradient.addColorStop(colorStop, color);
    });

    // Get text from utility function
    const { primaryText, secondaryText } = getWinButtonText(lobby);

    this.WinPrimaryText = new Text({
      text: primaryText,
      style: {
        fontFamily: "Inter",
        fontSize: 22,
        fill: primaryGradient,
        fontWeight: "300",
        align: "center",
      },
    });

    this.WinSecondaryText = new Text({
      text: " " + secondaryText,
      style: {
        fontFamily: "Inter",
        fontSize: 22,
        fill: primaryGradient,
        fontWeight: "900",
        align: "center",
      },
    });

    // Set text anchors for proper centering
    this.WinPrimaryText.anchor.set(0.5, 0.5);
    this.WinSecondaryText.anchor.set(0.5, 0.5);

    // Position texts relative to each other
    this.WinPrimaryText.x = -this.WinSecondaryText.width / 2;
    this.WinSecondaryText.x = this.WinPrimaryText.width / 2;

    this.WinShowBoxContainer.addChild(this.WinShowBackground);
    this.WinShowBoxContainer.addChild(this.WinPrimaryText);
    this.WinShowBoxContainer.addChild(this.WinSecondaryText);
    this.initialize();
  }

  private initialize() {
    if (this.WinShowBackground) {
      this.WinShowBackground.x = -this.WinShowBackground.width / 2;
    }
    if (this.WinPrimaryText) {
      this.WinPrimaryText.y = this.WinShowBackground.height / 2;
    }
    if (this.WinSecondaryText) {
      this.WinSecondaryText.y = this.WinShowBackground.height / 2;
    }
  }

  public setText(lobby: Lobby): void {
    const { primaryText, secondaryText } = getWinButtonText(lobby);

    this.WinPrimaryText.text = primaryText;
    this.WinSecondaryText.text = " " + secondaryText;

    // Recenter text when it changes
    this.WinPrimaryText.x = -this.WinSecondaryText.width / 2;
    this.WinSecondaryText.x = this.WinPrimaryText.width / 2;
  }

  public async show(animated: boolean, targetY: number) {
    this.visible = true;
    if (animated) {
      gsap.killTweensOf(this);
      this.y = -this.height;
      await gsap.to(this, {
        y: targetY,
        duration: 2,
        ease: "back.out(1.7)",
      });
    } else {
      this.y = targetY;
    }
  }

  public async hide() {
    this.visible = false;
  }
}

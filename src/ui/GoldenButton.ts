import { ButtonContainer } from "@pixi/ui";
import { Sprite, Text, Container, FillGradient } from "pixi.js";
import { app } from "../app";
import { sfx } from "../utils/audio";
import gsap from "gsap";
import { PARTNER_ID, PARTNER_SPECIFIC_CONFIG } from "../network/constants";
import { CURRENT_PARTNER } from "../network/constants";
import { VIEW_MODE } from "../constants";
import { getPlayButtonText, type Lobby } from "../utils/winButtonText";

export class GoldenButton extends ButtonContainer {
  private buttonBackground: Sprite;
  private textContainer: Container;
  private primaryText: Text;
  private secondaryText: Text;
  public customWidth?: number;
  public customHeight?: number;

  private viewMode = import.meta.env.VITE_VIEW_MODE;

  constructor(
    lobby: Lobby | undefined,
    options?: {
      width?: number;
      height?: number;
      secondaryTextFontSize?: number;
    },
  ) {
    super();

    this.customWidth = options?.width;
    this.customHeight = options?.height;

    // Get text from utility function
    const { primaryText, secondaryText } = getPlayButtonText(lobby);

    // Create and setup background
    this.buttonBackground = Sprite.from("golden-button-bg");
    this.buttonBackground.anchor.set(0.5);

    if (this.customWidth && this.customHeight) {
      this.buttonBackground.width = this.customWidth;
      this.buttonBackground.height = this.customHeight;
    } else {
      // Calculate initial scale based on screen width
      const scale = this.calculateScale();
      this.buttonBackground.scale.set(scale);
    }

    this.buttonBackground.position.set(0, 0);
    this.addChild(this.buttonBackground);

    // Create container for text elements
    this.textContainer = new Container();
    this.addChild(this.textContainer);

    // Create gradient for primary text
    const primaryGradient = new FillGradient(0, 0, 0, 50);
    const gradientColors =
      PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].winButtonTextColor;
    gradientColors.forEach(({ color, colorStop }) => {
      primaryGradient.addColorStop(colorStop, color);
    });

    // Create gradient for secondary text
    const secondaryGradient = new FillGradient(0, 0, 0, 50);
    gradientColors.forEach(({ color, colorStop }) => {
      secondaryGradient.addColorStop(colorStop, color);
    });

    // Create primary text (light)
    this.primaryText = new Text({
      text: primaryText,
      style: {
        fontFamily: "Inter",
        fontSize:
          (CURRENT_PARTNER == PARTNER_ID.bh ||
            CURRENT_PARTNER == PARTNER_ID.gs) &&
          this.viewMode == VIEW_MODE.WEB_VIEW
            ? 60
            : 42,
        fill:
          CURRENT_PARTNER == PARTNER_ID.bh
            ? secondaryGradient
            : primaryGradient,
        fontWeight:
          CURRENT_PARTNER == PARTNER_ID.bh || CURRENT_PARTNER == PARTNER_ID.gs
            ? "900"
            : "300",
        align: "center",
        dropShadow: {
          color: "#E7C361",
          blur: 2.49,
          distance: 4,
        },
      },
    });

    // Create secondary text (bold)
    this.secondaryText = new Text({
      text: "" + secondaryText,
      style: {
        fontFamily: "Inter",
        fontSize:
          CURRENT_PARTNER == PARTNER_ID.bh &&
          this.viewMode == VIEW_MODE.WEB_VIEW
            ? 60
            : 42,
        fill: secondaryGradient,
        fontWeight: "900",
        align: "center",
        dropShadow: {
          color: "#E7C361",
          blur: 2.49,
          distance: 4,
        },
      },
    });

    // Set text anchors for proper centering
    this.primaryText.anchor.set(0.5, 0.5);
    this.secondaryText.anchor.set(0.5, 0.5);

    // Position texts relative to each other
    this.primaryText.x = -this.secondaryText.width / 2;
    this.secondaryText.x = this.primaryText.width / 2;

    // Add texts to container
    this.textContainer.addChild(this.primaryText);
    this.textContainer.addChild(this.secondaryText);

    // Center the text container relative to the button
    this.textContainer.x = 0;
    this.textContainer.y = -5;

    // Set interactive properties
    this.cursor = "pointer";

    // Add press animation
    this.onPress.connect(() => {
      sfx.play("common/play_button_click.wav");
      if (this.customWidth && this.customHeight) {
        gsap.to(this.buttonBackground, {
          width: this.customWidth * 0.95,
          height: this.customHeight * 0.95,
          duration: 0.1,
          ease: "power2.out",
        });
      } else {
        const scale = this.calculateScale();
        gsap.to(this.buttonBackground.scale, {
          x: scale * 0.95,
          y: scale * 0.95,
          duration: 0.1,
          ease: "power2.out",
        });
      }
    });

    this.onpointerup = () => {
      if (this.customWidth && this.customHeight) {
        gsap.to(this.buttonBackground, {
          width: this.customWidth,
          height: this.customHeight,
          duration: 0.2,
          ease: "elastic.out(1.5)",
        });
      } else {
        const scale = this.calculateScale();
        gsap.to(this.buttonBackground.scale, {
          x: scale,
          y: scale,
          duration: 0.2,
          ease: "elastic.out(1.5)",
        });
      }
    };

    this.onpointerupoutside = () => {
      if (this.customWidth && this.customHeight) {
        gsap.to(this.buttonBackground, {
          width: this.customWidth,
          height: this.customHeight,
          duration: 0.2,
          ease: "elastic.out(1.5)",
        });
      } else {
        const scale = this.calculateScale();
        gsap.to(this.buttonBackground.scale, {
          x: scale,
          y: scale,
          duration: 0.2,
          ease: "elastic.out(1.5)",
        });
      }
    };
  }

  private calculateScale(): number {
    // Button will be 30% of screen width, with min/max constraints
    const targetWidth = Math.min(Math.max(app.screen.width * 0.8, 200), 600); // min 200px, max 600px
    return targetWidth / this.buttonBackground.texture.width;
  }

  public onResize(): void {
    if (this.customWidth && this.customHeight) {
      this.buttonBackground.width = this.customWidth;
      this.buttonBackground.height = this.customHeight;
    } else {
      const scale = this.calculateScale();
      this.buttonBackground.scale.set(scale);
    }

    // Recenter text after resize
    this.primaryText.x = -this.secondaryText.width / 2;
    this.secondaryText.x = this.primaryText.width / 2;
  }

  public setText(lobby: Lobby): void {
    const { primaryText, secondaryText } = getPlayButtonText(lobby);

    this.primaryText.text = primaryText;
    this.secondaryText.text = " " + secondaryText;

    // Recenter text when it changes
    this.primaryText.x = -this.secondaryText.width / 2;
    this.secondaryText.x = this.primaryText.width / 2;
  }

  public updateTextLayout(): void {
    // Recenter text
    this.primaryText.x = -this.secondaryText.width / 2;
    this.secondaryText.x = this.primaryText.width / 2;
  }

  public centerOnPlayerBar(playerBarY: number): void {
    this.x = app.screen.width / 2;
    this.y = playerBarY + 55; // Center vertically relative to PlayerProfileBar
  }

  public setOnPress(callback: () => void): void {
    this.onPress.connect(callback);
  }

  public show(): void {
    this.visible = true;
    gsap.fromTo(
      this,
      { y: app.screen.height + 100 }, // Start from below screen
      {
        y: this.y,
        duration: 0.5,
        ease: "back.out(1.2)",
      },
    );
  }

  public hide(): void {
    gsap.to(this, {
      y: app.screen.height + 100, // Move below screen
      duration: 0.4,
      ease: "back.in(1.2)",
      onComplete: () => {
        this.visible = false;
      },
    });
  }

  public setEnabled(enabled: boolean): void {
    this.interactive = enabled;
    this.buttonBackground.tint = enabled ? 0xffffff : 0x666666;
  }
  public setDisabled(disabled: boolean): void {
    this.interactive = disabled;
    this.buttonBackground.tint = disabled ? 0x666666 : 0xffffff;
  }
}

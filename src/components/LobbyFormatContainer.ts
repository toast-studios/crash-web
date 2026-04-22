import { Container, Sprite, Text } from "pixi.js";
import gsap from "gsap";

export interface LobbyFormatConfig {
  text: string;
  isActive?: boolean;
  isNew?: boolean;
  isComingSoon?: boolean;
  x?: number;
  y?: number;
}

export class LobbyFormatContainer extends Container {
  public background: Sprite;
  public formatText: Text;
  public comingSoonText?: Text;
  public spriteTag?: Container;
  private _isActive: boolean;
  private _isComingSoon: boolean;

  constructor(config: LobbyFormatConfig) {
    super();

    this._isActive = config.isActive || false;
    this._isComingSoon = config.isComingSoon || false;

    // Create background based on active state
    const backgroundAsset = this._isActive
      ? "inactive-lobby-format-container-background"
      : "active-lobby-format-container-background";

    this.background = Sprite.from(backgroundAsset);
    this.background.width = this.background.width / 2;
    this.background.height = this.background.height / 2;
    this.addChild(this.background);

    // Create format text
    this.formatText = new Text({
      text: config.text,
      style: {
        fontFamily: "Inter",
        fontSize: this._isComingSoon ? 14 : 16,
        fill: 0xffffff,
        align: this._isActive ? "center" : "left",
        fontWeight: this._isActive ? "700" : "200",
      },
    });

    if (this._isComingSoon) {
      // For coming soon, position text higher to make room for subtitle
      this.formatText.alpha = 0.3;
      this.formatText.x = this.background.width / 2 - this.formatText.width / 2;
      this.formatText.y =
        this.background.height / 2 - this.formatText.height / 2 - 10;
      this.addChild(this.formatText);

      // Add "Coming Soon" subtitle
      this.comingSoonText = new Text({
        text: "(Coming Soon)",
        style: {
          fontFamily: "Inter",
          fontSize: 10,
          fill: 0xffffff,
          align: "center",
          fontWeight: "400",
        },
      });
      this.comingSoonText.alpha = 0.3;
      this.comingSoonText.x =
        this.background.width / 2 - this.comingSoonText.width / 2;
      this.comingSoonText.y = this.formatText.y + this.formatText.height + 2;
      this.addChild(this.comingSoonText);
    } else {
      this.formatText.alpha = this._isActive ? 1 : 0.3;
      this.formatText.x = this.background.width / 2 - this.formatText.width / 2;
      this.formatText.y =
        this.background.height / 2 - this.formatText.height / 2 - 3;
      this.addChild(this.formatText);
    }

    // Add "Sprite" tag for 10 Players format (not for coming soon)
    if (config.isNew && !this._isComingSoon) {
      this.spriteTag = new Container();
      // Create a simple colored rectangle for tag background
      const tagBg = Sprite.from("new-tag");
      tagBg.width /= 2;
      tagBg.height /= 2;
      this.spriteTag.addChild(tagBg);
      // tagBg.rotation = -Math.PI / 4;

      this.addChild(this.spriteTag);
      this.spriteTag.x = this.background.width - 35;
      gsap.to(this.spriteTag, {
        x: this.background.width - 20,
        repeat: -1,
        yoyo: true,
        duration: 1,
        ease: "back.out(1)",
      });
    }

    // Set position if provided
    if (config.x !== undefined) {
      this.x = config.x;
    }
    if (config.y !== undefined) {
      this.y = config.y;
    }

    // Make interactive only if not coming soon
    if (this._isComingSoon) {
      this.eventMode = "none";
      this.cursor = "default";
    } else {
      this.eventMode = "static";
      this.cursor = "pointer";
    }
  }

  public get isComingSoon(): boolean {
    return this._isComingSoon;
  }

  public setActive(active: boolean) {
    if (this._isActive === active) return;

    this._isActive = active;

    if (active) {
      this.zIndex = 1;
    } else {
      this.zIndex = 0;
    }

    // Update background
    const backgroundAsset = this._isActive
      ? "inactive-lobby-format-container-background"
      : "active-lobby-format-container-background";

    this.background.texture = Sprite.from(backgroundAsset).texture;

    // Update text alignment
    this.formatText.style.align = this._isActive ? "center" : "left";
    this.formatText.style.fontWeight = this._isActive ? "700" : "200";
    this.formatText.alpha = this._isActive ? 1 : 0.3;
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public updateText(text: string) {
    this.formatText.text = text;
  }
}

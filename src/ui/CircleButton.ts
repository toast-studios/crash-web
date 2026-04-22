import { FancyButton } from "@pixi/ui";
import { Sprite } from "pixi.js";
import gsap from "gsap";
import { sfx } from "../utils/audio";

type CircleButtonProps = {
  iconName?: string;
};

export class CircleButton extends FancyButton {
  private icon: Sprite | null = null;

  constructor({ iconName }: CircleButtonProps = {}) {
    const defaultView = Sprite.from("circle-button-bg");
    defaultView.width /= 2;
    defaultView.height /= 2;
    super({
      defaultView,
    });

    this.cursor = "pointer";

    if (iconName) {
      this.icon = Sprite.from(iconName);
      this.icon.width /= 2;
      this.icon.height /= 2;
      this.icon.x = defaultView.width / 2 - this.icon.width / 2;
      this.icon.y = defaultView.height / 2 - this.icon.height / 2;
      this.addChild(this.icon);
    }

    this.onHover.connect(this.handleHover.bind(this));
    this.onOut.connect(this.handleOut.bind(this));
    this.onDown.connect(this.handleDown.bind(this));
    this.onUp.connect(this.handleUp.bind(this));
    this.on("pointerupoutside", this.handleUp.bind(this));
  }

  private handleHover() {
    // sfx.play("common/sfx-hover.wav");
    this.blendMode = "add";
  }

  private handleOut() {
    this.blendMode = "normal";
  }

  private handleDown() {
    sfx.play("common/sfx-press.wav");
    gsap.to(this, {
      y: this.y + 2,
      duration: 0.1,
    });
  }
  private handleUp() {
    gsap.to(this, {
      y: this.y - 2,
      duration: 0.1,
    });
  }

  public async show(animated = true) {
    gsap.killTweensOf(this.scale);
    this.visible = true;
    if (animated) {
      this.scale.set(0.25);
      await gsap.to(this.scale, {
        x: 0.5,
        y: 0.5,
        duration: 0.3,
        ease: "back.out",
      });
    } else {
      this.scale.set(0.5);
    }
  }

  public async hide(animated = true) {
    gsap.killTweensOf(this.scale);
    if (animated) {
      await gsap.to(this.scale, {
        x: 0.25,
        y: 0.25,
        duration: 0.3,
        ease: "back.in",
      });
    } else {
      this.scale.set(0);
    }
    this.visible = false;
  }

  public setDisabled() {
    this.alpha = 0.35;
    this.eventMode = "none";
    this.cursor = "default";
  }

  public setEnabled() {
    this.alpha = 1;
    this.eventMode = "dynamic";
    this.cursor = "pointer";
  }
}

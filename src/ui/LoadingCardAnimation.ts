import { Container, Sprite } from "pixi.js";
import gsap from "gsap";

export class LoadingCardAnimation extends Container {
  private readonly logo: Sprite;

  private static readonly LOGO_ALIAS = "crash_wars_logo";
  private static readonly BASE_SCALE = 0.25;
  private static readonly PULSE_SCALE = 0.35;
  private static readonly PULSE_DURATION_SEC = 0.9;
  private static readonly PULSE_ALPHA = 0.85;

  constructor() {
    super();
    this.logo = Sprite.from(LoadingCardAnimation.LOGO_ALIAS);
    this.logo.anchor.set(0.5);
    this.logo.scale.set(LoadingCardAnimation.BASE_SCALE);
    this.addChild(this.logo);

    this.logo.x = this.logo.width / 2 - 40;
    this.logo.y = this.logo.height;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resize(__width: number, __height: number) {
    // Component stays centered by parent layout; no responsive logic needed.
    this.logo.x = this.logo.width / 2 - 40;
    this.logo.y = this.logo.height;
  }

  /** Show the component */
  public async show() {
    gsap.killTweensOf(this.logo);
    this.visible = true;
    this.logo.alpha = 1;
    this.logo.scale.set(LoadingCardAnimation.BASE_SCALE);

    gsap.to(this.logo.scale, {
      x: LoadingCardAnimation.PULSE_SCALE,
      y: LoadingCardAnimation.PULSE_SCALE,
      duration: LoadingCardAnimation.PULSE_DURATION_SEC,
      ease: "power1.inOut",
      yoyo: true,
      repeat: -1,
    });

    gsap.to(this.logo, {
      alpha: LoadingCardAnimation.PULSE_ALPHA,
      duration: LoadingCardAnimation.PULSE_DURATION_SEC,
      ease: "power1.inOut",
      yoyo: true,
      repeat: -1,
    });
  }

  /** Hide the component */
  public async hide() {
    gsap.killTweensOf(this.logo);
    gsap.killTweensOf(this.logo.scale);
    this.visible = false;
  }
}

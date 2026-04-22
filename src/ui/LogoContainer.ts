import { Container, Sprite } from "pixi.js";
import { app } from "../app";
import { VIEW_MODE } from "../constants";
import { CURRENT_PARTNER, PARTNER_ID } from "../network/constants";

export class LogoContainer extends Container {
  private logo: Sprite | null = null;
  private cardMachine: Sprite | null = null;
  private aceAndJack: Sprite | null = null;
  private viewMode = import.meta.env.VITE_VIEW_MODE;
  private gameTableWidth: number;

  constructor(gameTableWidth: number = 0) {
    super();
    this.gameTableWidth = gameTableWidth;
    this.setupElements();
    this.positionElements();
  }

  private setupElements() {
    // Setup logo
    this.logo = Sprite.from("logo");
    this.logo.scale.set(0.5);
    this.logo.anchor.set(0.5);
    this.addChild(this.logo);

    // Setup card machine
    this.cardMachine =
      this.viewMode == VIEW_MODE.WEB_VIEW
        ? Sprite.from("card-machine-web")
        : Sprite.from("card-machine");
    this.cardMachine.width = 140;
    this.cardMachine.height = 180;

    if (this.viewMode !== VIEW_MODE.WEB_VIEW) {
      this.cardMachine.angle = 230;
    }
    this.cardMachine.anchor.set(0.5);
    this.addChild(this.cardMachine);

    // Setup ace and jack
    this.aceAndJack = Sprite.from("ace-and-jack");
    if (CURRENT_PARTNER !== PARTNER_ID.bh) {
      this.aceAndJack.scale.set(0.5);
    }
    this.addChild(this.aceAndJack);
  }

  private positionElements() {
    if (!this.logo || !this.cardMachine || !this.aceAndJack) return;

    // Position logo at center
    this.logo.x = app.screen.width / 2;
    this.logo.y = app.screen.height / 2 - this.logo.height / 2 - 170;

    // Position card machine
    this.cardMachine.x =
      this.viewMode == VIEW_MODE.WEB_VIEW
        ? app.screen.width / 2 + this.gameTableWidth / 2
        : app.screen.width;
    this.cardMachine.y = this.logo.y - 20;

    // Position ace and jack
    this.aceAndJack.x =
      this.viewMode == VIEW_MODE.WEB_VIEW
        ? app.screen.width / 2 - this.gameTableWidth / 2 + 5
        : -5;
    this.aceAndJack.y = this.logo.y - this.aceAndJack.height / 2 - 20;
  }

  public resize(width: number, height: number, gameTableWidth?: number) {
    if (gameTableWidth !== undefined) {
      this.gameTableWidth = gameTableWidth;
    }

    if (!this.logo || !this.cardMachine || !this.aceAndJack) return;

    // Update logo position
    this.logo.x = width / 2;
    this.logo.y = height / 2 - this.logo.height / 2 - 170;

    // Update card machine position
    this.cardMachine.x =
      this.viewMode == VIEW_MODE.WEB_VIEW
        ? width / 2 + this.gameTableWidth / 2 - 75
        : width;
    this.cardMachine.y = this.logo.y - 20;

    // Update ace and jack position
    this.aceAndJack.x =
      this.viewMode == VIEW_MODE.WEB_VIEW
        ? width / 2 - this.gameTableWidth / 2 + 5
        : -5;
    this.aceAndJack.y = this.logo.y - this.aceAndJack.height / 2 - 20;
  }

  public getLogoY(): number {
    return this.logo?.y || 0;
  }

  public getLogoHeight(): number {
    return this.logo?.height || 0;
  }
}

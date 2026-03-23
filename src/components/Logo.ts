import { Container, Sprite } from "pixi.js";

export class Logo extends Container {
  public hustleLogo: Sprite;
  public partnerLogo?: Sprite;

  constructor(showPartnerLogo: boolean = false) {
    super();

    this.hustleLogo = Sprite.from("21-royale-logo");
    this.hustleLogo.scale.set(0.15);
    this.addChild(this.hustleLogo);

    if (showPartnerLogo) {
      this.partnerLogo = Sprite.from("partner_logo");
      this.partnerLogo.width /= 2;
      this.partnerLogo.height /= 2;
      this.partnerLogo.anchor.set(0.5, 0);
      this.partnerLogo.x = this.hustleLogo.width / 2;
      this.partnerLogo.y = this.hustleLogo.height + 20;
      this.addChild(this.partnerLogo);
    }
  }
}

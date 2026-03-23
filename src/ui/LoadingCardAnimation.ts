import { Container, Sprite } from "pixi.js";
import gsap from "gsap";

export class LoadingCardAnimation extends Container {
  private cards: Sprite[];

  constructor() {
    super();

    this.cards = [
      Sprite.from("card-back"),
      Sprite.from("card-back"),
      Sprite.from("card-back"),
      Sprite.from("card-back"),
      Sprite.from("card-back"),
    ];

    this.cards.forEach((card) => {
      card.width = 96;
      card.height = 136;
      this.addChild(card);
    });
    this.initialize();
  }

  private initialize() {
    this.cards[0].angle = -19;
    this.cards[0].x = -70;
    this.cards[0].y = 40;
    this.cards[0].zIndex = 0;

    this.cards[1].angle = 19;
    this.cards[1].x = 75;
    this.cards[1].y = 2;
    this.cards[1].zIndex = 0;

    this.cards[2].angle = 11;
    this.cards[2].x = 40;
    this.cards[2].y = -2;
    this.cards[2].zIndex = 1;

    this.cards[3].angle = -11;
    this.cards[3].x = -40;
    this.cards[3].y = 17;
    this.cards[3].zIndex = 1;

    this.cards[4].zIndex = 2;
    this.cards[4].y = -5;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resize(__width: number, __height: number) {
    // this.cards.forEach((card) => {
    //   card.width = width;
    //   card.height = height;
    // });
  }
  /** Show the component */
  public async show() {
    this.cards.forEach((card) => {
      gsap.killTweensOf(card);
    });
    this.visible = true;
    this.cards.forEach((card) => {
      gsap.to(card, {
        x: 0,
        y: 0,
        angle: 0,
        duration: 1,
        ease: "power2.inOut",
        yoyo: true,
        repeat: -1,
      });
    });
  }
  /** Hide the component */
  public async hide() {
    this.cards.forEach((card) => {
      gsap.killTweensOf(card);
    });
    this.visible = false;
  }
}

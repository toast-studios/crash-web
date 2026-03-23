import { Container, Sprite } from "pixi.js";

export class AceAndJack extends Container {
  private aceCard: Sprite;
  private jackCard: Sprite;

  // Constants for container dimensions
  private static readonly CONTAINER_WIDTH = 150;
  private static readonly CONTAINER_HEIGHT = 200;
  private static readonly CARD_WIDTH = 82;
  private static readonly CARD_HEIGHT = 128;

  constructor() {
    super();

    // Create jack card sprite
    this.jackCard = Sprite.from("jack-card");
    this.jackCard.width = AceAndJack.CARD_WIDTH;
    this.jackCard.height = AceAndJack.CARD_HEIGHT;
    this.jackCard.angle = 150; // Rotated counterclockwise
    this.jackCard.anchor.set(0, 1); // Set pivot to bottom right
    this.addChild(this.jackCard);

    // Create ace card sprite
    this.aceCard = Sprite.from("ace-card");
    this.aceCard.width = AceAndJack.CARD_WIDTH;
    this.aceCard.height = AceAndJack.CARD_HEIGHT - 20;
    this.aceCard.angle = 160; // Rotated clockwise
    this.aceCard.anchor.set(0, 1); // Set pivot to bottom right
    this.addChild(this.aceCard);

    this.initialize();
  }

  private initialize() {
    this.pivot.set(
      AceAndJack.CONTAINER_WIDTH / 2,
      AceAndJack.CONTAINER_HEIGHT / 2,
    );

    // Position both cards at the same bottom-right point for overlap
    this.aceCard.x = AceAndJack.CONTAINER_WIDTH;
    this.aceCard.y = AceAndJack.CONTAINER_HEIGHT + 35;

    this.jackCard.x = AceAndJack.CONTAINER_WIDTH;
    this.jackCard.y = AceAndJack.CONTAINER_HEIGHT;

    // Set container dimensions
    this.width = AceAndJack.CONTAINER_WIDTH;
    this.height = AceAndJack.CONTAINER_HEIGHT;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resize(__width: number, __height: number) {
    // Implement if needed
  }

  public async show() {
    this.visible = true;
  }

  public async hide() {
    this.visible = false;
  }
}

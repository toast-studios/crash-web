import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { Card } from "./Card";
import gsap from "gsap";
import { app } from "../../app";
import { sfx } from "../../utils/audio";
import { isDragEnabled } from "../../utils/game";
import { Logger } from "../../utils/logger";

export class CardDeck extends Container {
  public cards: Card[] = [];
  private shimmerAnimation: gsap.core.Timeline | null = null;
  private shimmerOverlay: Sprite | null = null;
  private whiteOverlay: Graphics | null = null;
  private cardContainer: Container | null = null;

  private isDragEnabled: boolean = isDragEnabled();
  private isTournamentMode: boolean = false;
  private isProcessingTap: boolean = false;
  private lastTapTime: number = 0;
  private readonly TAP_COOLDOWN_MS = 500; // 500ms cooldown between taps

  private onDeckTap: (() => void) | null = null;

  constructor({
    deckLength,
    isTournamentMode = false,
    onDeckTap,
  }: {
    deckLength: number;
    isTournamentMode?: boolean;
    onDeckTap?: () => void;
  }) {
    super();
    this.sortableChildren = true;
    this.isTournamentMode = isTournamentMode;
    this.onDeckTap = onDeckTap || null;

    this.initialize(deckLength);
  }

  private initialize(deckLength: number) {
    this.cardContainer = new Container();

    for (let i = 0; i < deckLength; i++) {
      const card = new Card({ cardId: "card-back" });
      this.cards.push(card);
      this.cardContainer.addChild(card);
      this.addChild(card);
    }

    this.addChild(this.cardContainer);
  }

  public async removeTopCardAndReArrangeDeck() {
    const topCard = this.cards[this.cards.length - 1];
    if (!topCard) return;

    topCard.interactive = false;
    topCard.alpha = 0.5;
    this.removeChild(topCard);
    topCard.off("pointerdown");
    app.stage.off("pointertap");
    this.cards.pop();
  }

  public makeTopCardNonInteractive() {
    const topCard = this.cards[this.cards.length - 1];
    if (!topCard) return;

    topCard.interactive = false;
    topCard.alpha = 0.5;
    topCard.children.forEach((child) => {
      child.alpha = 0.5;
    });
    this.cleanupListeners();
    this.resetTapState();
  }

  public makeTopCardInteractive() {
    // this.cleanupListeners();

    try {
      const topCard = this.cards[this.cards.length - 1];
      if (!topCard) return;
      topCard.interactive = true;
      topCard.alpha = 1;
      topCard.children.forEach((child) => {
        child.alpha = 1;
      });

      // If drag is not enabled, allow tap on deck to place card randomly
      topCard.eventMode = "static";
      topCard.cursor = "pointer";
      topCard.on("pointertap", this.handleDeckTap.bind(this));
    } catch (error) {
      Logger.error("error making top card interactive", error);
    }
  }

  private handleDeckTap() {
    // Rate limiting: prevent rapid taps
    const currentTime = Date.now();
    if (
      this.isProcessingTap ||
      currentTime - this.lastTapTime < this.TAP_COOLDOWN_MS
    ) {
      Logger.info("Deck tap ignored due to rate limiting");
      return;
    }

    this.lastTapTime = currentTime;
    this.isProcessingTap = true;

    // Call the callback to handle random placement
    if (this.onDeckTap) {
      this.onDeckTap();
    }

    // Reset processing flag after cooldown
    setTimeout(() => {
      this.isProcessingTap = false;
    }, this.TAP_COOLDOWN_MS);
  }

  private cleanupListeners() {
    const topCard = this.cards[this.cards.length - 1];
    if (topCard) {
      topCard.removeAllListeners();
    }
    app.stage.off("pointertap");
    app.stage.off("pointermove");
  }

  public resetTapState() {
    this.isProcessingTap = false;
  }

  public showShimmerAnimation() {
    if (!this.isDragEnabled) return;

    const topCard = this.cards[this.cards.length - 1];
    if (!topCard) return;

    if (this.shimmerAnimation) {
      this.shimmerAnimation.kill();
    }

    if (!this.shimmerOverlay) {
      const shimmerContainer = new Container();
      const mask = new Graphics();
      mask.rect(4, 4, topCard.width, topCard.height);
      mask.fill({ color: 0xffffff, alpha: 1 });

      this.shimmerOverlay = new Sprite(Texture.WHITE);
      this.shimmerOverlay.width = topCard.width / 4;
      this.shimmerOverlay.height = topCard.height * 2;
      this.shimmerOverlay.alpha = 0;
      this.shimmerOverlay.tint = 0xffffff;
      this.shimmerOverlay.rotation = -Math.PI / 4;

      shimmerContainer.addChild(this.shimmerOverlay);
      shimmerContainer.mask = mask;

      topCard.addChild(mask);
      topCard.addChild(shimmerContainer);
    }

    this.shimmerAnimation = gsap
      .timeline({ repeat: -1 })
      .fromTo(
        this.shimmerOverlay,
        {
          x: -topCard.width * 2,
          alpha: 0,
        },
        {
          x: topCard.width * 2,
          alpha: 0.5,
          duration: 1,
          ease: "power1.inOut",
        },
      )
      .to(this.shimmerOverlay, {
        alpha: 0,
        duration: 0.2,
        ease: "power1.in",
      })
      .to({}, { duration: 1 });
  }

  public stopShimmerAnimation() {
    if (this.shimmerAnimation) {
      this.shimmerAnimation.kill();
      this.shimmerAnimation = null;
    }

    if (this.shimmerOverlay) {
      this.shimmerOverlay.parent?.removeChild(this.shimmerOverlay);
      this.shimmerOverlay = null;
    }
  }

  public setOpacityCardDeck(opacity: number) {
    this.cards.forEach((card) => {
      gsap.to(card, {
        alpha: opacity,
        duration: 0.3,
        ease: "power2.out",
      });
    });
  }

  public showWhiteOverlay() {
    const topCard = this.cards[this.cards.length - 1];
    if (!topCard) return;

    if (!this.whiteOverlay) {
      this.whiteOverlay = new Graphics();
      this.whiteOverlay.roundRect(
        4,
        4,
        topCard.width + 2,
        topCard.height + 2,
        10,
      );
      this.whiteOverlay.fill({ color: 0x000000, alpha: 0.8 });
    }

    topCard.addChild(this.whiteOverlay);
  }

  public hideWhiteOverlay(animate = false) {
    if (this.whiteOverlay) {
      if (animate) {
        gsap.to(this.whiteOverlay, {
          alpha: 0,
          duration: 0.3,
          ease: "power2.out",
          onComplete: () => {
            if (this.whiteOverlay) {
              this.whiteOverlay.destroy();
              this.whiteOverlay = null;
            }
          },
        });
      } else {
        this.whiteOverlay.destroy();
        this.whiteOverlay = null;
      }
    }
  }

  public setTopCardOpacity(opacity: number) {
    const topCard = this.cards[0];
    if (!topCard) return;

    gsap.to(topCard, {
      alpha: opacity,
      duration: 0.3,
      ease: "power2.out",
    });

    topCard.children.forEach((child) => {
      gsap.to(child, {
        alpha: opacity,
        duration: 0.3,
        ease: "power2.out",
      });
    });
  }

  private finalPositions = {
    moveXPosition: 6,
    moveYPosition: 6,
  };

  private arrangeCards = (card: Card, index: number) => {
    if (index < 40 && index > 4) {
      card.destroy();
      return false;
    }

    card.angle = this.isTournamentMode ? -90 : 0;
    card.x = 0;
    card.y = 0;

    if (index < 3) {
      card.x = this.finalPositions.moveXPosition;
      card.y = this.finalPositions.moveYPosition;
      this.finalPositions.moveXPosition -= 1;
      this.finalPositions.moveYPosition -= 1;
    }

    return true;
  };

  public async show(animate: boolean) {
    if (!animate) {
      this.cards = this.cards.filter(this.arrangeCards);
      return;
    }

    //card deck enter sound
    sfx.play("common/card_dealt_to_central_pile.wav", { delay: 0.25 });
    this.cards.forEach((card, index) => {
      let angle, x, y;
      if (index === this.cards.length - 1) {
        angle = this.isTournamentMode ? -90 : 0;
        x = 0;
        y = 0;
      } else {
        angle = this.isTournamentMode ? -90 : index % 2 === 0 ? -6 : 6;
        x = index % 2 === 0 ? -8 : 8;
        y = index % 2 === 0 ? 4 : -4;
      }
      const gameTableWidth = app.screen.width;
      gsap.fromTo(
        card,
        {
          x: -gameTableWidth,
          y: 0,
          angle: this.isTournamentMode ? -90 : 0,
          alpha: 0,
        },
        {
          x,
          y,
          angle,
          alpha: 1,
          duration: 0.08,
          ease: "none",
          delay: index < 40 ? 0 : (index - 40) * 0.1,
          onComplete: () => {
            if (index === this.cards.length - 1) {
              this.cards = this.cards.filter(this.arrangeCards);
            }
          },
        },
      );
    });
  }

  public reArrangeTopCardAngle() {
    const topCard = this.cards[this.cards.length - 1];
    if (!topCard) return;

    gsap.to(topCard, {
      x: 0,
      y: 0,
      angle: this.isTournamentMode ? -90 : 0,
      duration: 0.5,
      ease: "circ",
    });
  }

  public async hide() {
    this.hideWhiteOverlay();
    this.cards.forEach((card) => {
      gsap.killTweensOf(card);
    });

    this.destroy();
  }

  public resize() {
    // if (this.cardMask && this.gameTable) {
    //   this.cardMask.clear();
    //   this.cardMask.roundRect(
    //     0,
    //     0,
    //     this.gameTable.width,
    //     app.screen.height,
    //   );
    //   this.cardMask.fill({ color: 0xffffff, alpha: 1 });
    // }
  }
}

import gsap from "gsap";
import { Container } from "pixi.js";
import { opponentCardPlacementCoordinations } from "./CardPlacementHolder";
import { Card, CardId } from "./Card";
import { app } from "../../app";
import { sfx } from "../../utils/audio";
import { CardInfo } from "./CardPlacementHolder";
import { Logger } from "../../utils/logger";

export class CardPlacement extends Container {
  public card: Card;
  public cardId: CardId;
  public cardIndex: number;
  public columnIndex: number;
  private isOpponent: boolean;
  private onTap?: (cardInfo: CardInfo) => void;

  constructor({
    cardIndex,
    columnIndex,
    isOpponent,
    cardId,
    onTap,
  }: {
    cardIndex: number;
    columnIndex: number;
    isOpponent: boolean;
    cardId: CardId;
    onTap?: (cardInfo: CardInfo) => void;
  }) {
    super();
    this.cardId = cardId;
    this.card = new Card({ cardId: this.cardId ?? "card-placement" });
    this.cardIndex = cardIndex;
    this.columnIndex = columnIndex;
    this.isOpponent = isOpponent;
    this.onTap = onTap;
    this.addChild(this.card);

    if (!isOpponent) {
      this.setupTapInteraction();
    }
  }

  private setupTapInteraction(): void {
    /* Reconnection case handle*/
    if (this.cardId == null) {
      this.eventMode = "static";
      this.cursor = "pointer";
    }

    this.on("pointertap", () => {
      // Check if the cardPlacement is empty (primary check)
      if (this.onTap && this.cardId === null) {
        const globalPosition = this.getGlobalPosition();
        this.onTap({
          x: globalPosition.x,
          y: globalPosition.y,
          cardIndex: this.cardIndex,
          columnIndex: this.columnIndex,
        });
      } else {
        if (!this.onTap) {
          Logger.info("onTap is not set - ignoring tap", this.cardId);
          return;
        }
        Logger.info("CardPlacement is not empty - ignoring tap", this.cardId);
      }
    });
  }

  public tapInteraction(enable: boolean): void {
    this.eventMode = enable ? "static" : "none";
    this.cursor = enable ? "pointer" : "default";
    this.onTap = enable ? this.onTap : undefined;
  }

  public async animate(animate: boolean, visible: boolean) {
    this.visible = visible;
    const globalPosition = this.card.getGlobalPosition();

    // Only add to coordinations array if:
    // 1. CardPlacement is empty (no card placed yet)
    // 2. It's being made visible
    // 3. It doesn't already exist in the array
    if (this.cardId === null && visible && this.isOpponent) {
      const existingIndex = opponentCardPlacementCoordinations.findIndex(
        (coord) =>
          coord.columnIndex === this.columnIndex &&
          coord.cardIndex === this.cardIndex,
      );

      if (existingIndex === -1) {
        // Not found - add it
        opponentCardPlacementCoordinations.push({
          x: globalPosition.x,
          y: globalPosition.y,
          cardIndex: this.cardIndex,
          columnIndex: this.columnIndex,
        });
      } else {
        // Already exists - update position in case it changed
        opponentCardPlacementCoordinations[existingIndex].x = globalPosition.x;
        opponentCardPlacementCoordinations[existingIndex].y = globalPosition.y;
      }
    }

    if (animate) {
      gsap.fromTo(
        this.card.position,
        {
          x: this.card.x,
          y: app.screen.height + this.card.y,
        },
        {
          x: this.card.x,
          y: this.card.y,
          duration: 1,
          ease: "power1.inOut",
        },
      );
    } else {
      this.card.position.set(this.card.x, this.card.y);
      if (this.isOpponent && !this.cardId) {
        this.card.scale.set(0);
      }
    }
  }

  public setCard(cardValue: CardId, cardIndexCounter: number = 0) {
    this.cardId = cardValue;

    // Use changeCardValue to update the card visual without replacing the instance
    // This maintains proper references and prevents getGlobalPosition errors
    this.card.changeCardValue(cardValue);
    this.card.zIndex = 1;

    // Disable tap interaction once a card is placed
    if (cardValue !== null && cardValue !== "card-placement") {
      this.tapInteraction(false);
    }

    if (cardValue == "card-back" && cardIndexCounter > 0) {
      this.card.addCardClickIndexText(cardIndexCounter);
      if (this.card.cardClickIndexText && this.card.cardClickIndexBG) {
        this.card.cardClickIndexBG.visible = true;
        this.card.cardClickIndexText.visible = true;
      }
    }
  }

  public flipCard(
    cardValue: CardId,
    setCard: boolean = true,
    avoidSound: boolean = false,
  ) {
    if (setCard) {
      this.setCard("card-back");
    }

    const newCard = new Card({ cardId: cardValue });
    // Get dimensions before scaling to 0
    const cardWidth = newCard.width;
    const cardHeight = newCard.height;
    newCard.scale.x = 0;
    newCard.pivot.set(cardWidth / 2, cardHeight / 2);
    newCard.position.set(
      this.card.x + cardWidth / 2,
      this.card.y + cardHeight / 2,
    );

    if (!avoidSound) {
      //sfx.play("common/flip_card.mp3");
      sfx.play("common/drafting_phase_card_flipping.wav", { delay: 0.2 });
    }

    // Ensure scale.y is 1 before flip animation (opponent cards may have scale.y = 0)
    this.card.scale.y = 1;

    gsap.to(this.card.scale, {
      x: 0,
      duration: 0.25,
      ease: "back.in",
      onComplete: () => {
        // Update the existing card instance instead of replacing it
        // This maintains proper references and prevents getGlobalPosition errors
        this.cardId = cardValue;
        this.card.changeCardValue(cardValue);

        // Clean up the temporary animation card
        this.removeChild(newCard);
        newCard.destroy();

        gsap.to(this.card.scale, {
          x: 1,
          duration: 0.25,
          ease: "back.out",
        });
      },
    });
  }

  public hide(animate = true) {
    if (animate) {
      gsap.to(this.card.scale, {
        x: 0,
        duration: 0.5,
        ease: "back.in",
        onComplete: () => {
          this.visible = false;
        },
      });
    } else {
      this.visible = false;
    }
  }
}

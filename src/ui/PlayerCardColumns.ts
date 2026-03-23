import {
  Container,
  Sprite,
  Text,
  Texture,
  NineSliceSprite,
  Graphics,
} from "pixi.js";
import { Card, CardId } from "./Cards/Card";
import { CardPlacement } from "./Cards/CardPlacement";
import { CardInfo } from "./Cards/CardPlacementHolder";
import { app } from "../app";
import gsap from "gsap";
import { sfx } from "../utils/audio";
import { ColumnResultBadge, ColumnResultType } from "./ColumnResultBadge";
import { ScoreCircle } from "./ScoreCircle";

export enum FINISH_TYPES {
  NONE = "",
  BUST = "BUST",
  WIN = "WIN",
  LOSE = "LOSE",
  DRAW = "DRAW",
}

export class PlayerCardColumns extends Container {
  private background: NineSliceSprite;
  private scoreContainer: Container;
  private scoreBackground: Sprite;
  private scoreOverlay: Sprite;
  private scoreTextContainer: Container;
  private scoreMask: Sprite;
  private currentScore: number = 0;
  private currentFinishType: FINISH_TYPES = FINISH_TYPES.NONE;
  private cardsContainer: Container<Card>;
  private cards: Card[] = [];
  private cardGap = 30;
  private statusContainer: Container;
  private statusBackground: Sprite;
  private statusText: Text;

  private cardPlacements: CardPlacement[] = [];
  private columnIndex: number = 0;
  private isDraftingPhase: boolean = false;
  private availableHeightDrafting: number = 0;
  private availableHeightPhaseTwo: number = 0;

  private scoreContainerOverlay: Graphics | null = null;
  private isScoreContainerOverlaySet: boolean = false;
  private columnResultBadge: ColumnResultBadge | null = null;

  // Dealer section (mirrors opponent UI in 1v1)
  private dealerCardsContainer: Container<Card>;
  private dealerCards: Card[] = [];
  private dealerScoreCircle: ScoreCircle | null = null;
  private dealerCardGap = 25;

  // Queue system for card animations
  private isCardAnimating: boolean = false;
  private cardQueue: Array<{
    cardId: CardId;
    skipAnimation: boolean;
    cardNumber?: number;
  }> = [];
  private animatingCard: Card | null = null;

  constructor({
    header,
    leaderboard,
    playerBar,
    isDraftingPhase = false,
    columnIndex = 0,
    playerCards,
    onCardPlacementTap,
  }: {
    header: { height: number };
    leaderboard: { height: number };
    playerBar: { height: number };
    isDraftingPhase?: boolean;
    columnIndex?: number;
    playerCards?: Array<CardId | null>;
    onCardPlacementTap: (cardInfo: CardInfo, index: number) => void;
  }) {
    super();

    this.isDraftingPhase = isDraftingPhase;
    this.columnIndex = columnIndex;

    // Calculate both heights at construction time
    const totalPaddingBetweenComponents = 290;
    const totalPaddingDrafting = 210;

    this.availableHeightPhaseTwo =
      app.screen.height -
      header.height -
      leaderboard.height -
      playerBar.height -
      totalPaddingBetweenComponents;

    this.availableHeightDrafting =
      app.screen.height -
      header.height -
      leaderboard.height -
      playerBar.height -
      totalPaddingDrafting;

    const bgTexture = Texture.from("player_card_column_contianer");
    this.background = new NineSliceSprite({
      texture: bgTexture,
      leftWidth: bgTexture.width / 2,
      topHeight: bgTexture.height / 2,
      rightWidth: bgTexture.width / 2,
      bottomHeight: bgTexture.height / 2,
    });

    this.background.width = bgTexture.width * 0.5;

    // Use the appropriate height based on phase
    let adjustedHeight = isDraftingPhase
      ? this.availableHeightDrafting
      : this.availableHeightPhaseTwo;

    // Adjust height to fit card placements if in drafting phase
    if (isDraftingPhase) {
      // Estimate space needed for 2 card placements (similar to CardsColumn)
      // Each card is approximately 140px height, with gap of 10px
      const cardPlacementHeight = 120;
      const gap = 10;
      const totalCardsHeight = cardPlacementHeight * 2 + gap;
      const bottomPadding = 10; // Space from bottom
      const topPadding = 0; // Space for score container
      adjustedHeight = Math.max(
        adjustedHeight,
        totalCardsHeight + bottomPadding + topPadding,
      );
    }

    this.background.height = adjustedHeight;

    this.addChild(this.background);

    this.statusContainer = new Container();
    this.statusContainer.visible = false;
    this.addChild(this.statusContainer);

    this.statusBackground = Sprite.from("player_card_column_status_contianer");
    this.statusBackground.anchor.set(0.5, 0);
    this.statusBackground.scale.set(0.5);
    this.statusContainer.addChild(this.statusBackground);

    this.statusText = new Text({
      text: "",
      style: {
        fontFamily: "Pridi",
        fontSize: 18,
        fill: 0xffffff,
        align: "center",
      },
    });
    this.statusText.anchor.set(0.5);
    this.statusText.x = 0;
    this.statusText.y = this.statusBackground.height / 2;
    this.statusContainer.addChild(this.statusText);

    this.scoreContainer = new Container();

    this.scoreBackground = Sprite.from(
      "player_card_column_score_container_active",
    );
    this.scoreBackground.anchor.set(0.5, 0);
    this.scoreBackground.scale.set(0.5);
    this.scoreContainer.addChild(this.scoreBackground);

    this.scoreContainer.y = 10;
    this.scoreContainer.x = this.background.width / 2;
    this.addChild(this.scoreContainer);

    this.statusContainer.x = this.scoreContainer.x;

    this.scoreOverlay = new Sprite();
    this.scoreOverlay.anchor.set(0.5, 0);
    this.scoreOverlay.visible = false;
    this.scoreContainer.addChild(this.scoreOverlay);

    this.scoreMask = Sprite.from("player_card_column_score_container_mask");
    this.scoreMask.anchor.set(0.5, 0);
    this.scoreMask.width = this.scoreBackground.width;
    this.scoreMask.height = this.scoreBackground.height - 6;
    this.scoreMask.y = 0;
    this.scoreContainer.addChild(this.scoreMask);

    this.scoreTextContainer = new Container();
    this.scoreTextContainer.mask = this.scoreMask;
    this.scoreTextContainer.x = 0;
    this.scoreTextContainer.y = this.scoreBackground.height / 2;
    this.scoreContainer.addChild(this.scoreTextContainer);

    this.updateScoreDisplay(0);

    this.cardsContainer = new Container();
    this.cardsContainer.sortableChildren = true;
    this.cardsContainer.y = this.background.height - 80;
    this.cardsContainer.x = this.background.width / 2 - 40;
    this.addChild(this.cardsContainer);

    // Dealer cards section (positioned at top, mirroring opponent in 1v1)
    this.dealerCardsContainer = new Container();
    this.dealerCardsContainer.x = this.background.width / 2 - 40;
    this.dealerCardsContainer.y =
      this.scoreContainer.y + this.scoreBackground.height + 15;
    this.dealerCardsContainer.visible = false;
    this.addChild(this.dealerCardsContainer);

    // Hide cardsContainer in drafting phase
    if (isDraftingPhase) {
      this.cardsContainer.visible = false;
      this.initializeCardPlacements(
        playerCards || [null, null],
        onCardPlacementTap,
      );
    }
  }

  private initializeCardPlacements(
    playerCards: Array<CardId | null>,
    onCardPlacementTap: (cardInfo: CardInfo, index: number) => void,
  ): void {
    this.cardPlacements = [];
    for (let i = 0; i < 2; i++) {
      const cardPlacement = new CardPlacement({
        cardIndex: i,
        columnIndex: this.columnIndex,
        isOpponent: false,
        cardId: playerCards[i] || null,
        onTap: (cardInfo: CardInfo) => onCardPlacementTap(cardInfo, i),
      });
      this.cardPlacements.push(cardPlacement);
      this.addChild(cardPlacement);
    }
    this.positionCardPlacements();
  }

  private positionCardPlacements(): void {
    if (this.cardPlacements.length === 0) return;

    // Center cards horizontally
    this.cardPlacements.forEach((cardPlacement) => {
      cardPlacement.x = this.background.width / 2 - cardPlacement.width / 2;
    });

    let bottomCardsY =
      this.background.height - 10 - this.cardPlacements[0].height;

    // Position second card (index 1) first (lower)
    this.cardPlacements[1].y = bottomCardsY;
    bottomCardsY -= this.cardPlacements[0].height + 10;
    // Position first card (index 0) second (higher)
    this.cardPlacements[0].y = bottomCardsY;
  }

  public getCardPlacements(): CardPlacement[] {
    return this.cardPlacements;
  }

  public setCard(
    cardIndex: number,
    cardValue: CardId,
    cardIndexCounter: number = 0,
  ): void {
    if (this.cardPlacements[cardIndex]) {
      this.cardPlacements[cardIndex].setCard(cardValue, cardIndexCounter);
    }
  }

  public flipCard(cardInfo: { cardIndex: number; cardValue: CardId }): void {
    const { cardIndex, cardValue } = cardInfo;
    if (this.cardPlacements[cardIndex]) {
      this.cardPlacements[cardIndex].flipCard(cardValue);
    }
  }

  public initializeFromPlayerData(
    playerCards: Array<CardId | null>,
    positions?: Array<{ columnIndex: number; cardIndex: number }>,
  ): void {
    if (!this.isDraftingPhase) return;

    // Handle reconnection: set cards based on positions
    if (positions) {
      for (let i = 0; i < positions.length; i++) {
        const position = positions[i];
        if (position.columnIndex === this.columnIndex) {
          const cardIndex = position.cardIndex;
          if (this.cardPlacements[cardIndex] && !playerCards[cardIndex]) {
            this.setCard(cardIndex, "card-back", i + 1);
          }
        }
      }
    }
  }

  public getCardPlacementByIndex(
    columnIndex: number,
    cardIndex: number,
  ): CardPlacement | null {
    return (
      this.cardPlacements.find(
        (placement) =>
          placement.cardIndex === cardIndex &&
          placement.columnIndex === columnIndex,
      ) ?? null
    );
  }

  public showCardPlacements(animate: boolean): void {
    if (!this.isDraftingPhase) return;
    this.cardPlacements.forEach((cardPlacement) => {
      const visible = true;
      cardPlacement.animate(animate, visible);
    });
  }

  public hideCardPlacements(animate: boolean): void {
    if (!this.isDraftingPhase) return;
    this.cardPlacements.forEach((cardPlacement) => {
      cardPlacement.hide(animate);
    });
  }

  public addCard(
    cardId: CardId,
    skipAnimation: boolean = false,
    cardNumber?: number,
  ): Card {
    // Deduplication check:
    // 1. Check if the card is already the one currently animating.
    if (this.animatingCard && this.animatingCard.cardId === cardId) {
      return this.animatingCard;
    }

    // 2. Check if the last added card matches the new cardId (ignoring card-back for now, mainly for real cards).
    // This prevents double-addition from multiple socket events for the same card.
    const lastCard = this.cards[this.cards.length - 1];
    if (lastCard && lastCard.cardId === cardId && cardId !== "card-back") {
      return lastCard;
    }

    // Case 1: If card animation is going on and we have an animating card with a value (not card-back)
    if (this.isCardAnimating && this.animatingCard) {
      const animatingCardId = this.animatingCard.cardId;

      // Check if animating card has a real card value (not card-back)
      if (animatingCardId && animatingCardId !== "card-back") {
        // Add to queue for processing after current animation completes
        // Avoid adding duplicate requests to queue
        const isDuplicate = this.cardQueue.some(
          (queuedCard) => queuedCard.cardId === cardId,
        );

        if (!isDuplicate) {
          this.cardQueue.push({ cardId, skipAnimation, cardNumber });
        }

        // Return the currently animating card as a safe fallback
        // The queued card will be added properly when processed
        return this.animatingCard;
      }
      // Case 2: If card is animating without card value (card-back), flip the existing card
      else if (animatingCardId === "card-back") {
        // Flip the animating card to the new value instead of adding a new card
        this.animatingCard.changeCardValue(cardId);
        // Update card number if it's a card-back and cardNumber is provided
        if (cardId === "card-back" && cardNumber) {
          this.animatingCard.addCardClickIndexText(cardNumber);
          if (
            this.animatingCard.cardClickIndexText &&
            this.animatingCard.cardClickIndexBG
          ) {
            this.animatingCard.cardClickIndexBG.visible = true;
            this.animatingCard.cardClickIndexText.visible = true;
          }
        }
        return this.animatingCard;
      }
    }

    // Case 3: Normal operation - no animation in progress
    return this.addCardInternal(cardId, skipAnimation, cardNumber);
  }

  private addCardInternal(
    cardId: CardId,
    skipAnimation: boolean = false,
    cardNumber?: number,
  ): Card {
    const card = new Card({ cardId });
    card.alpha = 0;

    // Add card number if it's a card-back and cardNumber is provided
    if (cardId === "card-back" && cardNumber) {
      card.addCardClickIndexText(cardNumber);
      if (card.cardClickIndexText && card.cardClickIndexBG) {
        card.cardClickIndexBG.visible = true;
        card.cardClickIndexText.visible = true;
      }
    }

    // New card always goes to bottom (y = 0)
    const targetY = 0;

    // Move all existing cards up by cardGap
    if (this.cards.length > 0) {
      for (let i = 0; i < this.cards.length; i++) {
        const existingCard = this.cards[i];
        const newTargetY = existingCard.y - this.cardGap;
        if (skipAnimation) {
          existingCard.y = newTargetY;
        } else {
          gsap.to(existingCard, {
            y: newTargetY,
            duration: 0.5,
            ease: "power2.out",
          });
        }
      }
    }

    this.cardsContainer.addChild(card);
    this.cards.push(card);

    if (skipAnimation) {
      card.y = targetY;
      card.alpha = 1;
      this.isCardAnimating = false;
      this.animatingCard = null;
      this.processCardQueue();
    } else {
      this.isCardAnimating = true;
      this.animatingCard = card;

      gsap.to(card, {
        y: targetY,
        alpha: 1,
        duration: 0.5,
        ease: "power2.out",
        onComplete: () => {
          this.isCardAnimating = false;
          this.animatingCard = null;
          this.processCardQueue();
        },
      });
    }
    return card;
  }

  private processCardQueue(): void {
    if (this.cardQueue.length > 0 && !this.isCardAnimating) {
      const nextCard = this.cardQueue.shift();
      if (nextCard) {
        this.addCardInternal(
          nextCard.cardId,
          nextCard.skipAnimation,
          nextCard.cardNumber,
        );
      }
    }
  }

  public setupCardsImmediatelyWithoutAnimation(
    cardIds: CardId[],
    startingCardNumber: number = 1,
  ) {
    // Clear existing cards
    this.cards.forEach((card) => {
      this.cardsContainer.removeChild(card);
      card.destroy();
    });
    this.cards = [];

    // Reset animation state and queue
    this.isCardAnimating = false;
    this.animatingCard = null;
    this.cardQueue = [];

    // Add all cards immediately without animation with sequential card numbers
    cardIds.forEach((cardId, index) => {
      const cardNumber = startingCardNumber + index;
      this.addCard(cardId, true, cardNumber);
    });

    // Ensure cardsContainer is visible
    this.cardsContainer.visible = true;
  }

  public setOverlayOnCards(showOverlay: boolean, animate: boolean): void {
    // Set or remove overlay on all cards in this column
    this.cards.forEach((card) => {
      if (showOverlay) {
        card.setOverlay(animate);
      } else {
        card.removeOverlay();
      }
    });
  }

  public getCardsContainerGlobalPosition(): { x: number; y: number } {
    // Return the global position of the cardsContainer where new cards are added
    return this.cardsContainer.getGlobalPosition();
  }

  public getCardsCount(): number {
    return this.cards.length;
  }

  public getCurrentScore(): number {
    return this.currentScore;
  }

  public updateScore(newScore: number, finishType: FINISH_TYPES) {
    // Check if both score and finishType are unchanged
    if (
      newScore === this.currentScore &&
      finishType === this.currentFinishType
    ) {
      return; // No need to update anything
    }

    // Update score if changed
    if (newScore !== this.currentScore) {
      this.animateScoreChange(this.currentScore, newScore);
      this.currentScore = newScore;
    }

    // Update finishType if changed
    if (finishType !== this.currentFinishType) {
      this.currentFinishType = finishType;

      this.statusContainer.visible = false;
      this.statusContainer.y =
        this.scoreContainer.y +
        (this.scoreBackground.height - this.statusBackground.height) / 2;

      if (finishType === FINISH_TYPES.BUST) {
        sfx.play("common/going_bust.wav");
        this.scoreBackground.texture = Texture.from(
          "player_card_column_score_container_bust",
        );
        this.scoreOverlay.texture = Texture.from(
          "player_card_column_score_bust_crack_effect_overlay_image",
        );
        this.scoreOverlay.visible = true;
        this.scoreOverlay.scale.set(0.5);

        this.scoreOverlay.x = 0;
        this.scoreOverlay.y =
          (this.scoreBackground.height - this.scoreOverlay.height) / 2;

        this.statusText.text = "Bust";
        this.statusText.x = 0;
        this.statusText.y = this.statusBackground.height / 2;

        this.statusContainer.visible = true;
        this.statusContainer.alpha = 1;
        this.statusContainer.y = this.scoreContainer.y;

        // Create timeline for bust animation
        const bustTimeline = gsap.timeline();
        bustTimeline.to(this.statusContainer, {
          y: this.scoreContainer.y + this.scoreBackground.height - 10,
          duration: 0.5,
          ease: "back.out(1.7)",
        });
        // Wait for 1 second then fade out
        bustTimeline.to(
          this.statusContainer,
          {
            alpha: 0,
            duration: 0.3,
            ease: "power2.in",
          },
          "+=1",
        );
        bustTimeline.call(() => {
          this.statusContainer.visible = false;
        });
      } else if (finishType === FINISH_TYPES.WIN || newScore === 21) {
        this.scoreBackground.texture = Texture.from(
          "player_card_column_score_container_win",
        );
        if (finishType === FINISH_TYPES.WIN || newScore === 21) {
          sfx.play("common/winning_a_lane.wav");
          this.scoreOverlay.texture = Texture.from(
            "player_card_column_score_win_rays_effect_overlay_image",
          );
          this.scoreOverlay.visible = true;
          this.scoreOverlay.scale.set(0.5);

          this.scoreOverlay.x = 0;
          this.scoreOverlay.y =
            (this.scoreBackground.height - this.scoreOverlay.height) / 2;

          this.statusText.text = "Perfect";
          this.statusText.x = 0;
          this.statusText.y = this.statusBackground.height / 2;
          this.statusText.y -= 5;

          this.statusContainer.visible = true;
          this.statusContainer.alpha = 1;
          this.statusContainer.y = this.scoreContainer.y;

          // Create timeline for perfect animation
          const perfectTimeline = gsap.timeline();
          perfectTimeline.to(this.statusContainer, {
            y: this.scoreContainer.y - this.statusBackground.height + 10,
            duration: 0.5,
            ease: "back.out(1.7)",
          });
          // Wait for 1 second then fade out
          perfectTimeline.to(
            this.statusContainer,
            {
              alpha: 0,
              duration: 0.3,
              ease: "power2.in",
            },
            "+=1",
          );
          perfectTimeline.call(() => {
            this.statusContainer.visible = false;
          });
        }
      } else {
        this.scoreBackground.texture = Texture.from(
          "player_card_column_score_container_active",
        );
        this.scoreOverlay.visible = false;
      }

      this.scoreBackground.scale.set(0.5);

      this.scoreTextContainer.y = this.scoreBackground.height / 2;
      this.scoreMask.width = this.scoreBackground.width;
      this.scoreMask.height = this.scoreBackground.height - 6;
    }
  }

  private createScoreText(
    score: number,
    type: "top" | "center" | "bottom",
  ): Text {
    const isCenter = type === "center";
    const fontSize = 40;
    const scale = isCenter ? 1 : 0.75;
    const alpha = isCenter ? 1 : 0.3;
    const yPos = type === "top" ? -34 : type === "bottom" ? 30 : -4;

    const text = new Text({
      text: score.toString(),
      style: {
        fontFamily: "Pridi",
        fontSize: fontSize,
        fill: 0xffffff,
        align: "center",
      },
    });
    text.anchor.set(0.5);
    text.scale.set(scale);
    text.x = 0;
    text.y = yPos;
    text.alpha = alpha;
    return text;
  }

  private updateScoreDisplay(score: number) {
    this.scoreTextContainer.removeChildren();

    const centerText = this.createScoreText(score, "center");
    this.scoreTextContainer.addChild(centerText);
  }

  private animateScoreChange(oldScore: number, newScore: number) {
    this.scoreTextContainer.removeChildren();

    const scrollContainer = new Container();
    this.scoreTextContainer.addChild(scrollContainer);

    const step = 34;

    const minVal = Math.min(oldScore, newScore) - 1;
    const maxVal = Math.max(oldScore, newScore) + 1;

    for (let i = minVal; i <= maxVal; i++) {
      const text = new Text({
        text: i.toString(),
        style: {
          fontFamily: "Pridi",
          fontSize: 40,
          fill: 0xffffff,
          align: "center",
        },
      });
      text.anchor.set(0.5);
      text.x = 0;
      text.y = (i - oldScore) * step - 4;

      text.alpha = 1;

      scrollContainer.addChild(text);
    }

    const targetY = -(newScore - oldScore) * step;

    gsap.to(scrollContainer, {
      y: targetY,
      duration: 0.3,
      ease: "power2.out",
      onUpdate: () => {
        scrollContainer.children.forEach((child) => {
          const text = child as Text;
          const currentY = text.y + scrollContainer.y + 4;
          const dist = Math.abs(currentY);

          const maxDist = step;

          const scale = Math.max(0.75, 1 - (dist / maxDist) * 0.25);
          text.scale.set(scale);

          const alpha = Math.max(0.3, 1 - (dist / maxDist) * 0.7);
          text.alpha = alpha;
        });
      },
      onComplete: () => {
        this.updateScoreDisplay(newScore);
      },
    });
  }

  public getCurrentHeight(): number {
    return this.background.height;
  }

  public async transitionToPhaseTwo() {
    await new Promise<void>((resolve) => {
      this.cardPlacements.forEach((cardPlacement) => {
        gsap.to(cardPlacement, {
          y: cardPlacement.y - 30,
          duration: 0.5,
          ease: "power2.inOut",
          onComplete: () => {
            resolve();
          },
        });
      });
    });

    // Check if cardPlacements exist and are valid
    if (
      !this.cardPlacements ||
      this.cardPlacements.length < 2 ||
      !this.cardPlacements[0]
    ) {
      // Column was not initialized with cardPlacements (not in drafting phase)
      // Just ensure cardsContainer is visible and mark as not drafting phase
      this.isDraftingPhase = false;
      this.cardsContainer.visible = true;
      return;
    }

    gsap.to(this.background, {
      height: this.availableHeightPhaseTwo,
      duration: 0.5,
      ease: "power2.inOut",
    });
    this.cardsContainer.y =
      this.cardPlacements[0].y + this.cardPlacements[0].height + 11;
    await this.transitionFromDraftingToPhaseTwo();
  }

  private async transitionFromDraftingToPhaseTwo() {
    await new Promise((resolve) => {
      const bottomCardsY = this.cardPlacements[1].y - this.cardGap;

      gsap.to(this.cardPlacements[0], {
        y: bottomCardsY,
        duration: 0.5,
        onComplete: () => {
          // Add cards with their card numbers (1 and 2 from drafting phase)
          this.addCard(this.cardPlacements[0].cardId, true, 1);
          this.addCard(this.cardPlacements[1].cardId, true, 2);
          this.removeChild(this.cardPlacements[0]);
          this.removeChild(this.cardPlacements[1]);
          this.cardsContainer.visible = true;
          this.isDraftingPhase = false;
          resolve("done");
        },
      });
    });
  }

  public setScoreOverlay(active: boolean, animate: boolean) {
    if (active && this.scoreContainer && !this.isScoreContainerOverlaySet) {
      this.scoreContainerOverlay = new Graphics();
      // Match the scoreBackground dimensions for covering the entire score box
      const width = this.scoreBackground.width;
      const height = this.scoreBackground.height;

      this.scoreContainerOverlay.roundRect(-width / 2, 0, width, height, 5);
      this.scoreContainerOverlay.fill({
        color: 0x151515,
        alpha: 1,
      });

      this.scoreContainerOverlay.alpha = 0;
      this.scoreContainerOverlay.x = 0;
      this.scoreContainerOverlay.y = -2;
      this.scoreContainer.addChild(this.scoreContainerOverlay);

      if (animate) {
        gsap.to(this.scoreContainerOverlay, {
          alpha: 0.9,
          duration: 0.4,
        });
      } else {
        this.scoreContainerOverlay.alpha = 0.9;
      }
      this.isScoreContainerOverlaySet = true;
    }
    if (!active && this.scoreContainerOverlay) {
      gsap.to(this.scoreContainerOverlay, {
        alpha: 0,
        duration: 0.4,
      });
      this.isScoreContainerOverlaySet = false;
      this.scoreContainer.removeChild(this.scoreContainerOverlay);
      this.scoreContainerOverlay.destroy();
      this.scoreContainerOverlay = null;
    }
  }

  public showColumnResult(resultType: ColumnResultType): void {
    if (this.columnResultBadge) {
      this.removeChild(this.columnResultBadge);
      this.columnResultBadge.destroy();
      this.columnResultBadge = null;
    }

    this.columnResultBadge = new ColumnResultBadge(resultType);
    this.columnResultBadge.x =
      this.background.width / 2 - this.columnResultBadge.getBadgeWidth() / 2;
    this.columnResultBadge.y =
      this.scoreContainer.y + this.scoreBackground.height + 5;
    this.columnResultBadge.alpha = 0;
    this.addChild(this.columnResultBadge);

    gsap.to(this.columnResultBadge, {
      alpha: 1,
      duration: 0.3,
      ease: "power2.out",
    });
  }

  public getColumnIndex(): number {
    return this.columnIndex;
  }

  // --- Dealer Section (mirrors opponent in 1v1 CardsColumnPhaseTwo) ---

  public initializeDealerCards(
    dealerCards: Array<CardId | null>,
    dealerScore: number,
  ): void {
    this.dealerCardsContainer.visible = true;

    dealerCards.forEach((cardId) => {
      if (cardId) {
        this.addDealerCardInternal(cardId, true);
      }
    });

    this.initDealerScoreCircle(dealerScore);
  }

  private initDealerScoreCircle(score: number): void {
    if (this.dealerScoreCircle) {
      this.dealerScoreCircle.destroy();
    }

    const isHigher = score >= this.currentScore;
    this.dealerScoreCircle = new ScoreCircle(score, isHigher, false);
    this.dealerScoreCircle.scale.set(0.8);
    this.dealerScoreCircle.x =
      this.background.width / 2 - this.dealerScoreCircle.width / 2;
    this.updateDealerScorePosition();
    this.addChild(this.dealerScoreCircle);
  }

  private updateDealerScorePosition(): void {
    if (!this.dealerScoreCircle) return;

    if (this.dealerCards.length > 0) {
      const lastDealerCard = this.dealerCards[this.dealerCards.length - 1];
      this.dealerScoreCircle.y =
        this.dealerCardsContainer.y +
        lastDealerCard.y +
        lastDealerCard.height +
        15;
    } else {
      this.dealerScoreCircle.y = this.dealerCardsContainer.y + 5;
    }
  }

  public addDealerCard(cardId: CardId, skipAnimation: boolean = false): Card {
    const card = this.addDealerCardInternal(cardId, skipAnimation);
    this.updateDealerScorePosition();
    return card;
  }

  private addDealerCardInternal(cardId: CardId, skipAnimation: boolean): Card {
    const card = new Card({ cardId });

    const targetY =
      this.dealerCards.length > 0
        ? this.dealerCards[this.dealerCards.length - 1].y + this.dealerCardGap
        : 0;

    card.x = this.getCardXJitter(this.dealerCards.length);

    this.dealerCardsContainer.addChild(card);
    this.dealerCards.push(card);

    if (skipAnimation) {
      card.y = targetY;
      card.alpha = 1;
    } else {
      card.alpha = 0;
      card.y = targetY - 20;
      gsap.to(card, {
        y: targetY,
        alpha: 1,
        duration: 0.4,
        ease: "power2.out",
      });
    }

    return card;
  }

  private getCardXJitter(index: number): number {
    if (index % 2 === 0) {
      return -(Math.random() * 6);
    }
    return Math.random() * 6;
  }

  public updateDealerScore(score: number): void {
    if (!this.dealerScoreCircle) {
      this.initDealerScoreCircle(score);
      return;
    }

    const isHigher = score >= this.currentScore;
    this.dealerScoreCircle.updateScore(score, isHigher);
    this.updateDealerScorePosition();
  }

  public getDealerCardsContainerGlobalPosition(): { x: number; y: number } {
    const pos = this.dealerCardsContainer.getGlobalPosition();
    if (this.dealerCards.length > 0) {
      const lastCard = this.dealerCards[this.dealerCards.length - 1];
      return {
        x: pos.x + lastCard.x,
        y: pos.y + lastCard.y + this.dealerCardGap,
      };
    }
    return pos;
  }

  public setDealerOverlay(animate: boolean): void {
    if (this.dealerScoreCircle) {
      if (animate) {
        gsap.to(this.dealerScoreCircle, { alpha: 0.2, duration: 0.3 });
      } else {
        this.dealerScoreCircle.alpha = 0.2;
      }
    }
    this.dealerCards.forEach((card) => {
      card.setOverlay(animate);
    });
  }

  public showDealerSection(): void {
    this.dealerCardsContainer.visible = true;
  }

  public hideDealerSection(): void {
    this.dealerCardsContainer.visible = false;
    if (this.dealerScoreCircle) {
      this.dealerScoreCircle.visible = false;
    }
  }
}

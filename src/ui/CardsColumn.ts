import { Container, Sprite } from "pixi.js";
import { CardPlacement } from "./Cards/CardPlacement";
import { CardId } from "./Cards/Card";
import { app } from "../app";
import { CardInfo } from "./Cards/CardPlacementHolder";

export class CardsColumn extends Container {
  private columnBackground: Sprite;
  public playerCardPlacements!: CardPlacement[];
  public opponentCardPlacements!: CardPlacement[];
  private columnIndex: number;
  private onCardPlacementTap: ((cardInfo: CardInfo) => void) | null = null;

  constructor({
    columnIndex,
    playerCards,
    opponentCards,
    onCardPlacementTap,
  }: {
    columnIndex: number;
    playerCards: CardId[];
    opponentCards: CardId[];
    onCardPlacementTap?: (cardInfo: CardInfo) => void;
  }) {
    super();
    this.columnIndex = columnIndex;
    this.onCardPlacementTap = onCardPlacementTap ?? null;

    this.columnBackground = Sprite.from("cards-column-background");
    this.columnBackground.width = 125.74;
    this.columnBackground.height = app.screen.height * 0.66;
    this.addChild(this.columnBackground);

    this.initializeOpponentCards(opponentCards);
    this.initializePlayerCards(playerCards);
    this.positionCards();
  }

  public getCardPlacements(): CardPlacement[] {
    return this.playerCardPlacements;
  }

  private initializeOpponentCards(opponentCards: CardId[]): void {
    this.opponentCardPlacements = [];
    for (let j = 0; j < 2; j++) {
      const cardPlacement = new CardPlacement({
        cardIndex: j,
        columnIndex: this.columnIndex,
        isOpponent: true,
        cardId: opponentCards[j],
      });
      this.opponentCardPlacements.push(cardPlacement);
      this.addChild(cardPlacement);
    }
  }

  private initializePlayerCards(playerCards: CardId[]): void {
    this.playerCardPlacements = [];
    for (let i = 0; i < 2; i++) {
      const cardPlacement = new CardPlacement({
        cardIndex: i,
        columnIndex: this.columnIndex,
        isOpponent: false,
        cardId: playerCards[i],
        onTap: this.onCardPlacementTap ?? undefined,
      });
      this.playerCardPlacements.push(cardPlacement);
      this.addChild(cardPlacement);
    }
  }

  private positionCards(): void {
    // Center cards horizontally
    this.playerCardPlacements.forEach((cardPlacement) => {
      cardPlacement.x = this.width / 2 - cardPlacement.width / 2;
    });

    this.opponentCardPlacements.forEach((cardPlacement) => {
      cardPlacement.x = this.width / 2 - cardPlacement.width / 2;
    });

    // Position opponent cards at the top
    let topCardsY = -20;
    const gap = 10;
    this.opponentCardPlacements[0].y = topCardsY;
    topCardsY += this.opponentCardPlacements[0].height + gap;
    this.opponentCardPlacements[1].y = topCardsY;

    // Position player cards at the bottom
    const thisHeight =
      this.height - 30 - this.playerCardPlacements[0].height + gap;
    let bottomCardsY = thisHeight - this.playerCardPlacements[0].height + 30;
    this.playerCardPlacements[1].y = bottomCardsY;
    bottomCardsY += this.playerCardPlacements[0].height + gap;
    this.playerCardPlacements[0].y = bottomCardsY;
  }

  public setPlayerCardsPlacementsVisible(): void {
    this.playerCardPlacements[1].animate(false, true);
  }

  public setCard(
    cardIndex: number,
    cardValue: CardId,
    cardIndexCounter: number = 0,
  ): void {
    this.playerCardPlacements[cardIndex].setCard(cardValue, cardIndexCounter);
  }

  public flipPlayerCard(cardInfo: {
    cardIndex: number;
    cardValue: CardId;
  }): void {
    const { cardIndex, cardValue } = cardInfo;
    this.playerCardPlacements[cardIndex].flipCard(cardValue);
  }

  public flipOpponentCard(cardInfo: {
    cardIndex: number;
    cardValue: CardId;
  }): void {
    const { cardIndex, cardValue } = cardInfo;
    this.opponentCardPlacements[cardIndex].flipCard(cardValue, true, true);
  }

  public getCardPlacementByIndex(
    columnIndex: number,
    cardIndex: number,
  ): CardPlacement | null {
    return (
      this.playerCardPlacements.find(
        (placement) =>
          placement.cardIndex === cardIndex &&
          placement.columnIndex === columnIndex,
      ) ?? null
    );
  }

  /** Show the component */
  public async show(animate: boolean): Promise<void> {
    this.playerCardPlacements.forEach((cardPlacement) => {
      const visible = true;
      cardPlacement.animate(animate, visible);
    });

    this.opponentCardPlacements.forEach((cardPlacement) => {
      cardPlacement.animate(false, true); // Opponent cards don't animate on show
    });
  }

  /** Hide the component */
  public async hide(animate: boolean): Promise<void> {
    this.playerCardPlacements.forEach((cardPlacement) => {
      cardPlacement.hide(animate);
    });
    this.opponentCardPlacements.forEach((cardPlacement) => {
      cardPlacement.hide(false); // Opponent cards don't animate on hide
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resize(__width: number, __height: number): void {
    // Implement resize logic if needed
  }
}

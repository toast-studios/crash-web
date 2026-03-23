import { Container, FillGradient, Graphics, Sprite, Text } from "pixi.js";
import { Card, CardId } from "./Cards/Card";
import gsap from "gsap";
import { sfx } from "../utils/audio";
import { app } from "../app";
import { playBustAnimation } from "../animations/lottie";
import { ScoreCircle } from "./ScoreCircle";
import { ActionMessage } from "./ActionMessage";
import { navigation } from "../utils/navigation";
import { CURRENT_PARTNER, PARTNER_ID } from "../network/constants";
import { calculatePlayerBustAnimationOffset } from "../utils/htmlDom";
import { FINISH_TYPES, CardsColumn } from "../store/storeTypes";

export class CardsColumnPhaseTwo extends Container {
  private columnBackground: Sprite;
  private columnWinBackground: Sprite;
  private columnLoseBackground: Sprite;
  private activeColumnBackground: Graphics;

  private opponentCards: Card[];
  private opponentColumnScore: ScoreCircle;

  private playerCards: Card[];
  private playerColumnScore: ScoreCircle;

  private opponentActionMessage: ActionMessage;

  private finishType?: Text;
  private pointsText?: Text;
  private isActive: boolean = false;
  private overlayTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private hasDealerRevealCompleted: boolean = false;

  // * constants
  private cardGap = 25;

  constructor({
    opponentColumnInfo,
    playerColumnInfo,
    isColumnActive,
  }: {
    opponentColumnInfo: CardsColumn;
    playerColumnInfo: CardsColumn;
    isColumnActive: boolean;
  }) {
    super();
    this.isActive = isColumnActive;

    this.columnBackground = Sprite.from("cards-column-background");
    this.columnWinBackground = Sprite.from("cards-column-background-win");
    this.columnLoseBackground = Sprite.from("cards-column-background-lose");

    this.columnBackground.width = 125.74;
    this.columnBackground.height = app.screen.height * 0.66;

    this.columnWinBackground.width = 125.74;
    this.columnWinBackground.height = app.screen.height * 0.66;

    this.columnLoseBackground.width = 125.74;
    this.columnLoseBackground.height = app.screen.height * 0.66;

    if (
      playerColumnInfo.finishType === FINISH_TYPES.WIN ||
      playerColumnInfo.finishType === FINISH_TYPES.BLACKJACK_WIN
    ) {
      this.changeColumnBackground(this.columnWinBackground, false);
    } else if (playerColumnInfo.finishType === FINISH_TYPES.LOSE) {
      this.changeColumnBackground(this.columnLoseBackground, false);
    }

    this.addChild(this.columnBackground);

    //add golden gradient

    // Add the gradient for active state
    const gradient = new Graphics();
    const colorStops = [0xffebad, 0x696565, 0xffebad];
    const gradientFill = new FillGradient(
      0,
      0,
      0,
      this.columnBackground.height,
    );

    if (CURRENT_PARTNER === PARTNER_ID.em) {
      gradientFill.addColorStop(0, 0x09ca51);
      gradientFill.addColorStop(0.2, 0xcfc7c7);
      gradientFill.addColorStop(0.5, 0x696565);
      gradientFill.addColorStop(0.7, 0xcfc7c7);
      gradientFill.addColorStop(1, 0x09ca51);
    } else {
      // Default gradient
      gradientFill.addColorStop(0.2, colorStops[0]);
      gradientFill.addColorStop(0.48, colorStops[1]);
      gradientFill.addColorStop(0.8, colorStops[2]);
    }

    gradient
      .roundRect(
        0,
        0,
        this.columnBackground.width,
        this.columnBackground.height,
        10,
      )
      .fill(gradientFill);
    gradient.alpha = 0.25;
    gradient.visible = this.isActive;
    this.activeColumnBackground = gradient;
    this.addChild(gradient);

    //@todo make this into a function
    const isOpponentHigher = opponentColumnInfo.score > playerColumnInfo.score;
    const isEqual = opponentColumnInfo.score === playerColumnInfo.score;
    this.opponentColumnScore = new ScoreCircle(
      opponentColumnInfo.score,
      isOpponentHigher || isEqual,
      !isColumnActive,
    );
    this.playerColumnScore = new ScoreCircle(
      playerColumnInfo.score,
      !isOpponentHigher || isEqual,
      !isColumnActive,
    );

    if (playerColumnInfo.finishType) {
      this.addFinishType(
        { playerFinishType: playerColumnInfo.finishType },
        () => {
          // TODO think this later
        },
        false,
      );
    }

    this.opponentCards = [];
    this.playerCards = [];

    const loopLength = playerColumnInfo.cards.length;

    for (let i = 0; i < loopLength; i++) {
      const opponentCard = new Card({
        cardId: opponentColumnInfo.cards[i] ?? "card-back",
      });
      const playerCard = new Card({
        cardId: playerColumnInfo.cards[i] ?? "card-back",
      });
      this.opponentCards.push(opponentCard);
      this.playerCards.push(playerCard);
      this.addChild(playerCard, opponentCard);
    }

    // * opponent action message initialization
    this.opponentActionMessage = new ActionMessage();
    this.opponentActionMessage.x = this.width / 2;
    this.opponentActionMessage.y =
      this.opponentColumnScore.y + this.opponentColumnScore.height + 25;

    this.addChild(this.opponentActionMessage);
    this.addChild(this.opponentColumnScore);
    this.addChild(this.playerColumnScore);

    this.initialize();
    if (!this.isActive) {
      // setTimeout(() => {
      this.isActive = true; // ! hacky way to set overlay
      this.setOverlay(false, false, true);
      // }, 1000);
    }
  }

  private initialize() {
    this.initializeOpponentCards();
    this.initializePlayerCards();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resize(__width: number, __height: number) {
    // this.columnBackground.width = width;
    // this.columnBackground.height = height;
  }

  /** Show the component */
  public async show(animate: boolean) {
    // this.cardPlacements.forEach((cardPlacement) => {
    //   cardPlacement.show();
    // });

    this.animateScore(animate, false, true, true, true);
  }

  /** Hide the component */
  public async hide() {
    // this.cardPlacements.forEach((cardPlacement) => {
    //   cardPlacement.hide();
    // });
  }

  public showOpponentAction(action: "hit" | "stand", label?: string) {
    this.updateOpponentActionMessagePosition();

    // Kill any existing animations
    gsap.killTweensOf(this.opponentActionMessage);

    this.opponentActionMessage.alpha = 0;
    gsap.to(this.opponentActionMessage, {
      alpha: 1,
      duration: 0.3,
      ease: "power2.out",
    });

    this.opponentActionMessage.showActionInfo(action, label);
  }

  private updateOpponentActionMessagePosition() {
    this.opponentActionMessage.x = this.width / 2;
    this.opponentActionMessage.y =
      this.opponentColumnScore.y + this.opponentColumnScore.height + 25;
  }

  private initializeOpponentCards() {
    // * set the y position of the first card
    let opponentCardY = -this.cardGap;
    // let opponentCardX = this.width / 2 - this.opponentCards[0].width / 2;

    // * set the position of each card
    this.opponentCards.forEach((card, index) => {
      const opponentCardX = this.getCardXPosition(index);
      card.position = { x: opponentCardX, y: opponentCardY };
      opponentCardY += this.cardGap;
    });

    // * center align the score
    this.opponentColumnScore.x =
      this.width / 2 - this.opponentColumnScore.width / 2;

    // * set the y position of the score
    this.opponentColumnScore.y = this.getOpponentScorePosition();
  }

  private initializePlayerCards() {
    // * set the y position of the first card
    let playerCardY = this.height - this.playerCards[0].height - this.cardGap;
    // let playerCardX = this.width / 2 - this.playerCards[0].width / 2;

    // * set the position of each card
    this.playerCards.forEach((card, index) => {
      const playerCardX = this.getCardXPosition(index);
      if (index === 0) {
        card.position = { x: playerCardX, y: playerCardY };
      } else {
        card.position = { x: playerCardX, y: playerCardY };
      }
      playerCardY += this.cardGap;
    });

    // * center align the score
    this.playerColumnScore.x =
      this.width / 2 - this.playerColumnScore.width / 2;
    this.playerColumnScore.y = this.getPlayerScorePosition();
  }

  private getCardXPosition(index: number) {
    let xPosition = this.width / 2 - this.playerCards[0].width / 2;
    if (index % 2 === 0) {
      xPosition -= Math.random() * 10;
    } else {
      xPosition += Math.random() * 10;
    }
    return xPosition;
  }

  public getOpponentScorePosition() {
    return (
      this.opponentCards[this.opponentCards.length - 1].y +
      this.opponentCards[this.opponentCards.length - 1].height +
      15
    );
  }

  public getPlayerScorePosition(beforeAnimateComplete: boolean = false) {
    if (beforeAnimateComplete) {
      return (
        this.playerCards[0].position.y -
        this.playerColumnScore.height -
        this.cardGap
      );
    }
    return this.playerCards[0].position.y - this.playerColumnScore.height;
  }

  private getNextOpponentCardPositions() {
    return {
      x: this.getCardXPosition(this.opponentCards.length),
      y: this.opponentCards[this.opponentCards.length - 1].y + this.cardGap,
    };
  }

  private getNextPlayerCardPositions() {
    return {
      x: this.getCardXPosition(this.playerCards.length),
      y: this.playerCards[this.playerCards.length - 1].y,
    };
  }

  private getNextCardGlobalXPosition(isPlayer: boolean) {
    const index = isPlayer
      ? this.playerCards.length
      : this.opponentCards.length;
    let xPosition = 0;
    if (index % 2 === 0) {
      xPosition -= Math.random() * 10;
    } else {
      xPosition += Math.random() * 10;
    }
    return xPosition;
  }

  public getOpponentNextCardGlobalPosition() {
    const globalPosition =
      this.opponentCards[this.opponentCards.length - 1].getGlobalPosition();
    return {
      x: globalPosition.x + this.getNextCardGlobalXPosition(false),
      y: globalPosition.y + this.cardGap,
    };
  }

  public getPlayerNextCardGlobalPosition() {
    const globalPosition =
      this.playerCards[this.playerCards.length - 1].getGlobalPosition();
    return {
      x: globalPosition.x + this.getNextCardGlobalXPosition(true),
      y: globalPosition.y,
    };
  }
  public addNewOpponentCardAndUpdateScore({
    cardId,
    // TODO get x position from last card
    isOpponentBusted,
    columnScore,
    onComplete,
    skipBustAnimation = false,
  }: {
    cardId: CardId;
    isOpponentBusted: boolean;
    columnScore: number;
    onComplete: () => void;
    skipBustAnimation?: boolean;
    // TODO get last x to map the card position , avoid getter
  }) {
    const opponentCard = new Card({ cardId: cardId });
    opponentCard.position = this.getNextOpponentCardPositions();
    this.opponentCards.push(opponentCard);

    const isHigher = columnScore > this.playerColumnScore.getScore();
    const isEqual = columnScore === this.playerColumnScore.getScore();

    this.opponentColumnScore.updateScore(columnScore, isHigher || isEqual);
    this.playerColumnScore.updateScore(
      this.playerColumnScore.getScore(),
      !isHigher || isEqual,
    );

    if (isOpponentBusted) {
      this.opponentColumnScore.tint = 0xe74c3c;
      // * show bust animation only if not skipped (when coordinating both busts)
      if (!skipBustAnimation) {
        setTimeout(() => {
          // * dismiss settings popup when user busts
          navigation.dismissPopup();
          playBustAnimation(this, -20, 0, "opponent");

          setTimeout(() => {
            this.bustOpponentCards();
            this.showRubbleAfterBust({
              x: this.columnBackground.width / 2 - 45,
              y: -45,
            });
            onComplete();
          }, 700);
        }, 1000);
      } else {
        onComplete();
      }
    } else {
      // If dealer's score exceeds 21, set the tint to red
      if (columnScore > 21) {
        this.opponentColumnScore.tint = 0xe74c3c;
      }
      onComplete();
    }
    this.addChild(this.opponentCards[this.opponentCards.length - 1]);

    // If column is inactive (has overlay), apply overlay to the newly added card
    if (!this.isActive) {
      opponentCard.setOverlay(false);
    }

    this.animateScore(true, true, true, false, false);
  }

  public addNewPlayerCardAndUpdateScore({
    cardId,
    isPlayerLose,
    isPlayerWin,
    // TODO get x position from last card
    columnScore,
    skipMoveUpAnimation = false,
    targetPosition,
  }: {
    cardId: CardId;
    isPlayerLose: boolean;
    isPlayerWin: boolean;
    columnScore: number;
    skipMoveUpAnimation?: boolean;
    targetPosition?: { x: number; y: number };
  }) {
    const playerCard = new Card({ cardId: cardId });
    playerCard.position = targetPosition || this.getNextPlayerCardPositions();
    if (!skipMoveUpAnimation) {
      this.movePlayerCardsUp();
    }
    this.playerCards.push(playerCard);

    // const previousPlayerScore = this.playerColumnScore.getScore();
    const isHigher = columnScore > this.opponentColumnScore.getScore();
    const isEqual = columnScore === this.opponentColumnScore.getScore();

    // Play overtake sound if player's score becomes higher than opponent's
    //npt needed
    // if (
    //   isHigher &&
    //   previousPlayerScore < this.opponentColumnScore.getScore() &&
    //   columnScore <= 21
    // ) {
    //   sfx.play("common/3_seconds_countdown.wav");
    // }

    this.playerColumnScore.updateScore(columnScore, isHigher || isEqual);
    this.opponentColumnScore.updateScore(
      this.opponentColumnScore.getScore(),
      !isHigher || isEqual,
    );

    if (isPlayerLose) {
      this.playerColumnScore.tint = 0xe74c3c;
    }
    if (isPlayerWin) {
      this.playerColumnScore.tint = 0x68d556;
    }
    this.addChild(this.playerCards[this.playerCards.length - 1]);
    // If cards already moved up, don't anticipate future movement in score animation
    this.animateScore(true, !skipMoveUpAnimation, false, true, false);
  }

  public addFinishType(
    params: {
      playerFinishType: FINISH_TYPES;
    },
    onComplete: () => void,
    animate: boolean = true,
  ) {
    let fillColor = "#ffffff";
    let text = "PUSH";
    let fontSize = 27;
    const finishType = params.playerFinishType;
    if (finishType === FINISH_TYPES.LOSE || finishType === FINISH_TYPES.BUST) {
      if (finishType === FINISH_TYPES.LOSE) {
        sfx.play("common/going_bust.wav");
      }
      fillColor = "#FF5B5B";
      text = "LOST";
      this.changeColumnBackground(this.columnLoseBackground, animate);
      if (animate) {
        //not needed
        //  sfx.play("common/losing_a_lane.wav");
      }
    } else if (finishType === FINISH_TYPES.BLACKJACK_WIN) {
      fillColor = "#FFD700";
      text = "BLACKJACK!";
      fontSize = 20;
      this.changeColumnBackground(this.columnWinBackground, animate);
      if (animate) {
        sfx.play("common/winning_a_lane.wav");
      }
    } else if (finishType === FINISH_TYPES.WIN) {
      fillColor = "#68D556";
      text = "WON";
      this.changeColumnBackground(this.columnWinBackground, animate);
      if (animate) {
        sfx.play("common/winning_a_lane.wav");
      }
    }
    this.finishType = new Text({
      text: text,
      style: {
        fontFamily: "Pridi",
        fontSize: fontSize,
        fill: fillColor,
        fontWeight: "900",
      },
    });
    this.finishType.x = this.width / 2 - this.finishType.width / 2;
    this.finishType.y =
      this.columnBackground.height / 2 - this.finishType.height / 2;
    this.addChild(this.finishType);

    if (animate) {
      gsap.fromTo(
        this.finishType,
        {
          y: this.finishType.y - 20,
          alpha: 0,
        },
        {
          y: this.finishType.y,
          alpha: 1,
          duration: 1,
          ease: "bounce.out",
          onComplete: () => {
            onComplete();
          },
        },
      );
    } else {
      this.finishType.alpha = 1;
      onComplete();
    }
  }

  public showBustAnimation(
    columnFinishType: FINISH_TYPES,
    isPlayer: boolean,
    onComplete: () => void,
    skipFinishType: boolean = false,
  ) {
    // * show bust animation

    setTimeout(() => {
      // * dismiss settings popup when user busts
      navigation.dismissPopup();
      // Place bust animation safely near the respective piles:
      // - Opponent: slightly above top (-20)
      // - Player: near bottom of the column background (ensure on-screen)
      const playerTop = calculatePlayerBustAnimationOffset(
        this.columnBackground.height,
      );
      playBustAnimation(
        this,
        isPlayer ? playerTop : -20,
        0,
        isPlayer ? "player" : "opponent",
      );
      sfx.play("common/going_bust.wav");
      setTimeout(() => {
        // sfx.play("common/game-over.mp3");
        //sfx.play("common/bust.wav");

        this.bustPlayerCards();
        this.showRubbleAfterBust({
          x: this.columnBackground.width / 2 - 45,
          y: this.columnBackground.height - 45,
        });
        setTimeout(() => {
          if (skipFinishType) {
            onComplete();
          } else {
            this.addFinishType(
              { playerFinishType: columnFinishType },
              onComplete,
            );
          }
        }, 900);
      }, 700);
    }, 1000);
  }

  private changeColumnBackground(columnBackground: Sprite, animate: boolean) {
    if (animate) {
      gsap.to(this.columnBackground, {
        alpha: 0,
        duration: 0.3,
        onComplete: () => {
          this.columnBackground.texture = columnBackground.texture;
          gsap.to(this.columnBackground, {
            alpha: 1,
            duration: 0.3,
          });
        },
      });
    } else {
      this.columnBackground.texture = columnBackground.texture;
    }
  }

  private animateScore(
    animate: boolean,
    beforeAnimateComplete: boolean,
    animateOpponent: boolean = true,
    animatePlayer: boolean = true,
    isInitialShow: boolean = false,
  ) {
    if (animate) {
      if (animateOpponent) {
        if (isInitialShow) {
          gsap.fromTo(
            this.opponentColumnScore,
            {
              y: this.getOpponentScorePosition() - 100,
              alpha: 0,
            },
            {
              y: this.getOpponentScorePosition(),
              alpha: 1,
              duration: 0.3,
              onUpdate: () => {
                this.updateOpponentActionMessagePosition();
              },
            },
          );
        } else {
          gsap.to(this.opponentColumnScore, {
            y: this.getOpponentScorePosition(),
            duration: 0.3,
            onUpdate: () => {
              this.updateOpponentActionMessagePosition();
            },
          });
        }
      }

      if (animatePlayer) {
        if (isInitialShow) {
          gsap.fromTo(
            this.playerColumnScore,
            {
              y: this.getPlayerScorePosition(beforeAnimateComplete) + 100,
              alpha: 0,
            },
            {
              y: this.getPlayerScorePosition(beforeAnimateComplete),
              alpha: 1,
              duration: 0.3,
            },
          );
        } else {
          gsap.to(this.playerColumnScore, {
            y: this.getPlayerScorePosition(beforeAnimateComplete),
            duration: 0.3,
          });
        }
      }
    } else {
      if (animateOpponent) {
        this.opponentColumnScore.y = this.getOpponentScorePosition();
      }
      if (animatePlayer) {
        this.playerColumnScore.y = this.getPlayerScorePosition(
          beforeAnimateComplete,
        );
      }
      this.updateOpponentActionMessagePosition();
    }
  }

  private movePlayerCardsUp() {
    this.playerCards.forEach((card) => {
      gsap.to(card, {
        y: card.y - this.cardGap,
        duration: 0.3,
      });
    });
  }

  /**
   * Public method to trigger upward animation of existing player cards
   * Used to synchronize with incoming card animation from deck
   */
  public movePlayerCardsUpAnimated() {
    this.movePlayerCardsUp();
  }

  public setOverlay(
    skipOpponent: boolean = false,
    skipPlayer: boolean = false,
    skipAnimation: boolean = false,
  ) {
    // * default delay is 500ms
    if (this.isActive) {
      this.overlayTimeoutId = setTimeout(
        () => {
          this.overlayTimeoutId = null;
          if (!this.finishType) {
            if (!skipAnimation) {
              gsap.to(this.columnBackground, { alpha: 0.3, duration: 0.3 });
            } else {
              this.columnBackground.alpha = 0.3;
            }
          }
          this.isActive = false;
          this.activeColumnBackground.visible = false;
          if (!skipPlayer) {
            this.setOverlayForPlayerCards(skipAnimation);
          }
          if (!skipOpponent) {
            this.setOverlayForOpponentCards(skipAnimation);
          }
        },
        skipAnimation ? 0 : 500,
      );
    }
  }

  public setOverlayForPlayerCards(animate: boolean) {
    if (animate) {
      gsap.to(this.playerColumnScore, { alpha: 0.2, duration: 0.5 });
    } else {
      this.playerColumnScore.alpha = 0.2;
    }
    this.playerCards.forEach((card) => {
      card.setOverlay(animate);
    });
  }

  private bustPlayerCards() {
    gsap.to(this.playerColumnScore, { alpha: 0, duration: 0.3 });
    this.playerCards.forEach((card) => {
      gsap.to(card, {
        alpha: 0,
        duration: 0.3,
        onComplete: () => {
          card.visible = false;
        },
      });
    });
  }

  private bustOpponentCards() {
    gsap.to(this.opponentColumnScore, { alpha: 0, duration: 0.3 });
    this.opponentCards.forEach((card) => {
      gsap.to(card, {
        alpha: 0,
        duration: 0.3,
        onComplete: () => {
          card.visible = false;
        },
      });
    });
  }

  // Show opponent bust animation (used when both players bust)
  public showOpponentBustAnimation(onComplete: () => void) {
    // Set dealer score tint to red when busted
    this.opponentColumnScore.tint = 0xe74c3c;

    setTimeout(() => {
      // * dismiss settings popup when user busts
      navigation.dismissPopup();
      playBustAnimation(this, -20, 0, "opponent");
      // Don't play sfx again if already played by player bust
      setTimeout(() => {
        this.bustOpponentCards();
        this.showRubbleAfterBust({
          x: this.columnBackground.width / 2 - 45,
          y: -45,
        });
        setTimeout(() => {
          onComplete();
        }, 900);
      }, 700);
    }, 1000);
  }

  private showRubbleAfterBust(positions: { x: number; y: number }) {
    const rubble = Sprite.from("rubble");
    rubble.width = 99;
    rubble.height = 99;
    rubble.position = positions;
    rubble.alpha = 0.2;
    this.addChild(rubble);
    gsap.to(rubble, {
      alpha: 1,
      duration: 0.3,
      delay: 0.3,
    });
  }

  public cancelPendingOverlay(): void {
    if (this.overlayTimeoutId) {
      clearTimeout(this.overlayTimeoutId);
      this.overlayTimeoutId = null;
    }
  }

  public getOpponentCardIds(): CardId[] {
    return this.opponentCards.map((card) => card.cardId);
  }

  public revealOpponentCardWithFlip(
    index: number,
    cardId: CardId,
    onComplete?: () => void,
  ): void {
    const card = this.opponentCards[index];
    if (!card) {
      onComplete?.();
      return;
    }

    const originalScaleX = card.scale.x;

    gsap.to(card.scale, {
      x: 0,
      duration: 0.15,
      ease: "power2.in",
      onComplete: () => {
        card.changeCardValue(cardId);
        gsap.to(card.scale, {
          x: originalScaleX,
          duration: 0.15,
          ease: "power2.out",
          onComplete: () => {
            onComplete?.();
          },
        });
      },
    });
  }

  public updateOpponentScoreOnly(score: number): void {
    const isHigher = score > this.playerColumnScore.getScore();
    const isEqual = score === this.playerColumnScore.getScore();
    this.opponentColumnScore.updateScore(score, isHigher || isEqual);
    this.playerColumnScore.updateScore(
      this.playerColumnScore.getScore(),
      !isHigher || isEqual,
    );
    // If dealer's score exceeds 21, set the tint to red
    if (score > 21) {
      this.opponentColumnScore.tint = 0xe74c3c;
    }
    this.animateScore(true, false, true, false, false);
  }

  public hasFinishTypeShown(): boolean {
    return !!this.finishType;
  }

  public hasDealerRevealAnimationCompleted(): boolean {
    return this.hasDealerRevealCompleted;
  }

  public markDealerRevealCompleted(): void {
    this.hasDealerRevealCompleted = true;
  }

  public showPoints(points: number): void {
    if (this.pointsText) {
      this.pointsText.destroy();
    }

    const pointsText = new Text({
      text: `+${points}`,
      style: {
        fontFamily: "Pridi",
        fontSize: 24,
        fill: points > 0 ? 0x68d556 : 0xff5b5b,
        fontWeight: "700",
        dropShadow: {
          color: 0x000000,
          alpha: 0.6,
          distance: 2,
          blur: 3,
        },
      },
    });

    pointsText.x = this.width / 2 - pointsText.width / 2;
    pointsText.y = this.finishType
      ? this.finishType.y + this.finishType.height + 10
      : this.columnBackground.height / 2 + 20;
    pointsText.alpha = 0;
    pointsText.scale.set(0.5);

    this.addChild(pointsText);
    this.pointsText = pointsText;

    gsap.to(pointsText, {
      alpha: 1,
      scale: 1,
      duration: 0.5,
      ease: "back.out(1.7)",
    });
  }

  public setOverlayForOpponentCards(animate: boolean) {
    if (animate) {
      gsap.to(this.opponentColumnScore, { alpha: 0.2, duration: 0.3 });
    } else {
      this.opponentColumnScore.alpha = 0.2;
    }
    this.opponentCards.forEach((card) => {
      card.setOverlay(animate);
    });
  }

  private updateScores() {
    const opponentScore = this.opponentColumnScore.getScore();
    const playerScore = this.playerColumnScore.getScore();
    const isEqual = opponentScore === playerScore;
    const isOpponentHigher = opponentScore > playerScore;

    this.opponentColumnScore.updateScore(
      opponentScore,
      isOpponentHigher || isEqual,
    );
    this.playerColumnScore.updateScore(
      playerScore,
      !isOpponentHigher || isEqual,
    );
  }

  public removeOverlay() {
    if (!this.isActive) {
      this.isActive = true;
      this.activeColumnBackground.visible = true;
      this.opponentColumnScore.setEnabled(true);
      this.playerColumnScore.setEnabled(true);

      this.updateScores();

      gsap.to(this.columnBackground, { alpha: 1, duration: 0.3 });
      gsap.to(this.playerColumnScore, { alpha: 1, duration: 0.3 });
      gsap.to(this.opponentColumnScore, { alpha: 1, duration: 0.3 });
      this.opponentCards.forEach((card) => {
        card.removeOverlay();
      });
      this.playerCards.forEach((card) => {
        card.removeOverlay();
      });
    }
  }
}

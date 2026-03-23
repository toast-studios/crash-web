// import {
//   ALLOW_ACTIONS,
//   END_GAME_REASON,
//   FINISH_TYPES,
//   StoreData,
// } from "../store/storeTypes";
// import { CardId } from "../ui/Cards/Card";
// import {
//   actionButtonCoordinations,
//   CardInfo,
// } from "../ui/Cards/CardPlacementHolder";
// import { FTUEPointer } from "../ui/FTUEPointer";
// import { FederatedPointerEvent } from "pixi.js";
// import { ResultOverlay } from "../ui/ResultOverlay";
// import { Tooltip } from "../ui/ToolTip";
// import { delayCall, getOpponent, isMetaFreeWin } from "../utils/game";
// import { navigation } from "../utils/navigation";
// import { GameScreen } from "./GameScreen";
// import { FTUEQueue } from "../utils/FTUEQueue";
// import {
//   cardPlacements,
//   practicePhaseTwoData,
//   getPracticeStepsData,
//   getPracticeColumnUpdateInfo,
// } from "../store/Practice";
// import { Logger } from "../utils/logger";
// import { apiClient } from "../network/apis";
// import { CURRENT_PARTNER, PARTNER_ID } from "../network/constants";
// import { sfx } from "../utils/audio";
// import { ActionButton } from "../ui/ActionButton";
// import { VIEW_MODE } from "../constants";
// import { delay } from "../utils/promiseUtils";
// import { LOBBY_FORMAT } from "../types";
// import { ClientEvent } from "../utils/clientEvent";

// export class PracticeScreen extends GameScreen {
//   private FTUEStep: number = 0;
//   private ToolTip: Tooltip;
//   private skipButton: ActionButton | null = null;
//   private ftueQueue: FTUEQueue;
//   public viewMode = import.meta.env.VITE_VIEW_MODE;
//   private cardPickedCount: number = 0;
//   private columnTurnTracker = new Map<number, number>();
//   private winCount: number = 0;
//   private loseCount: number = 0;
//   private drawCount: number = 0;
//   private isFirstTurnDraw: boolean = false;
//   private timer: NodeJS.Timeout | null = null;
//   private isTurnActionInProgress = false;
//   private autoPickTimer: NodeJS.Timeout | null = null;
//   private actionPointersTimer: NodeJS.Timeout | null = null;
//   private suppressActionPointers: boolean = false;
//   private hasPracticeEndEventBeenSent: boolean = false;
//   private sixthCardPlaced: boolean = false;

//   public getCurrentActiveColumnIndex(): number | null {
//     if (this.phaseTwo) {
//       return this.phaseTwo.getCurrentActiveColumnIndex();
//     }
//     return null;
//   }

//   constructor(practiceData: StoreData) {
//     super(practiceData);

//     ClientEvent.GameStarted({
//       amount: 0,
//     });

//     this.FTUEPointer = new FTUEPointer();
//     this.FTUEPointer.visible = false;
//     this.addChild(this.FTUEPointer);

//     this.ToolTip = new Tooltip({});
//     this.ToolTip.visible = false;
//     this.addChild(this.ToolTip);

//     // Initialize FTUE Queue
//     this.ftueQueue = new FTUEQueue();
//     this.initializeFTUEQueue();

//     // Override the PhaseOne handler to use FTUE's implementation
//     if (this.phaseOne) {
//       this.phaseOne.handleCardPlaceConfirm =
//         this.handleCardPlaceConfirm.bind(this);
//     }
//     //this.createSkipButton();

//     // Add pointer down event listener
//     this.eventMode = "static";
//     this.boundHandlePointerDown = this.handlePointerDown.bind(this);
//     this.on("pointerdown", this.boundHandlePointerDown);

//     // * start Practice
//     this.startPractice();

//     // Bind the app message listener
//     this.bindAppMessageListener = this.handleAppMessage.bind(this) as (
//       event: Event,
//     ) => void;
//   }

//   private autoPickRemainingCards() {
//     // Get all truly empty card placements by checking cardId
//     const emptyPlacements = this.getAllEmptyCardPlacements();

//     if (emptyPlacements.length > 0) {
//       this.autoPickCardsSequentially(emptyPlacements, 0);
//     }
//   }

//   private autoPickCardsSequentially(
//     placements: CardInfo[],
//     index: number,
//   ): void {
//     if (index >= placements.length) {
//       Logger.info(`[PRACTICE] Reached end of placements`);
//       return;
//     }

//     // Stop at 5 cards - the 6th card has special logic in handleCardPlaceConfirm
//     if (this.cardPickedCount >= 5) {
//       Logger.info(
//         `[PRACTICE] Stopping auto-pick at 5 cards, letting special 6th card logic take over`,
//       );
//       return;
//     }

//     const placement = placements[index];

//     // Calculate what the card number will be (it will be incremented in handleCardPlaceConfirm)
//     const cardNumber = this.cardPickedCount + 1;

//     this.phaseOne?.handleAutoCardPick(placement, cardNumber, () => {
//       // Use handleCardPlaceConfirm to properly track cardPickedCount and trigger opponent animations
//       this.handleCardPlaceConfirm(placement);

//       // Wait longer for opponent animation to complete before picking next card
//       // The delay should allow the opponent animation and nextFTUEStep to complete
//       if (index < placements.length - 1 && this.cardPickedCount < 5) {
//         setTimeout(() => {
//           this.autoPickCardsSequentially(placements, index + 1);
//         }, 2000); // Increased delay to allow opponent animation to complete
//       }
//     });
//   }

//   private initializeFTUEQueue() {
//     // this.ftueQueue.addStep(
//     //     "tap_empty_slot",
//     //     () => {
//     //         this.handlePlayVoice("tap_on_empty_slot");
//     //     },
//     //     2000,
//     //     2,
//     // ); // Priority 2 - User interaction

//     this.ftueQueue.addStep(
//       "start_card_placement",
//       () => {
//         /* for kaboom mode */
//         this.findNextFTUECardPlacement(1, 0, 300);
//         this.phaseOne?.cardDeck.makeTopCardInteractive();
//         this.FTUEStartTimer(100, true);
//         this.autoPickTimer = setTimeout(() => {
//           this.autoPickRemainingCards();
//         }, 30100);
//         if (this.phaseOne) {
//           this.phaseOne.setIsTurnActive(true);
//           this.phaseOne.startShimmerAnimation();
//           this.phaseOne.startCardPlacementPulseAnimation();
//         }
//         // Show tooltip for first card placement
//         setTimeout(() => {
//           this.ToolTip.show({
//             text: "Click slots to fill it",
//             position: { x: 0, y: -200 },
//             autoHideDelay: 0, // Don't auto-hide, will be hidden when card is placed
//           });
//         }, 2000); // Show after pointers appear (3000ms delay + 500ms buffer)
//       },
//       1500,
//       3,
//     ); // Priority 3 - Card placement
//     this.ftueQueue.addStep(
//       "pick_other_cards",
//       () => {
//         if (this.cardPickedCount > 1) return;
//         this.showPointersAtAllEmptyPlacements();
//       },
//       undefined,
//       3.5,
//     ); // Priority 4 - Opponent action

//     this.ftueQueue.addStep(
//       "opponent_same_card",
//       () => {
//         this.handlePlayVoice("opponent_gets_same_card");
//       },
//       undefined,
//       4,
//     ); // Priority 4 - Opponent action

//     this.ftueQueue.addStep(
//       "finish_setup",
//       () => {
//         this.handlePlayVoice("finish_your_setup");
//       },
//       3000,
//       5,
//     ); // Priority 5 - Setup completion

//     this.ftueQueue.addStep(
//       "after_finish_setup_card_placement",
//       () => {
//         if (this.phaseOne) {
//           this.phaseOne.setIsTurnActive(true);
//         }
//       },
//       5000,
//       5.5,
//     ); // Priority 5.5 - After finish setup Card placement

//     this.ftueQueue.addStep(
//       "setup_done",
//       () => {
//         this.ToolTip.hide();
//         this.animateDeckPhaseTwo(false);
//       },
//       2100,
//       7,
//     ); // Priority 7 - Phase transition

//     this.ftueQueue.addStep(
//       "phase_two_transition",
//       async () => {
//         // Ensure tooltip is hidden before Phase Two starts
//         this.ToolTip.hide();
//         this.playerBar.stopTimer();
//         await delay(2200);
//         this.moveToPhaseTwo({
//           players: practicePhaseTwoData.players,
//           activeColumnIndex: 2,
//           avoidListeners: true,
//         });
//         this.animateDeckPhaseTwo(true);
//         setTimeout(() => {
//           this.playerBar.bindHitAction(this.hitAction.bind(this));
//           this.playerBar.bindStandAction(this.standAction.bind(this));
//           this.handleFTUEPhaseTwoTransition();
//         }, 1000);
//       },
//       undefined,
//       8,
//     );

//     this.ftueQueue.addStep(
//       "beat_opponent",
//       () => {
//         this.handlePlayVoice(
//           "beat_your_opponent_without_busting_going_over_21_to_win_the_match_up",
//         );
//       },
//       1500,
//       9,
//     ); // Priority 9 - Game strategy

//     this.ftueQueue.addStep(
//       "beat_opponent_pointer",
//       () => {
//         this.FTUEStartTimer();
//         this.showPointersOnActionButtons();
//         this.playerBar.hitActionButton.setEnabled();
//         this.playerBar.standActionButton.setEnabled();
//       },
//       5000,
//       9.5,
//     ); // Priority 9.5 - Beat opponent pointer (slightly higher than beat_opponent)

//     this.ftueQueue.addStep(
//       "win_two_columns",
//       () => {
//         this.handlePlayVoice("win_2_out_of_3_columns_to_win_the_game");
//       },
//       4000,
//       10,
//     ); // Priority 10 - Win condition
//   }

//   private startPractice() {
//     console.log("startPractice");
//     delayCall(100, () => {
//       //this.ftueQueue.startStep("tap_empty_slot");
//       this.ftueQueue.startStep("start_card_placement");
//     });
//   }

//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   protected handlePointerDown(_event?: FederatedPointerEvent) {
//     this.hideFTUEPointers();
//     const activeStepId = this.ftueQueue.getActiveStepId();
//     if (activeStepId) {
//       this.ftueQueue.skipStep(activeStepId);
//     }
//     this.ToolTip.hide();
//   }

//   public async show() {
//     // Practice mode has custom FTUE flow, so we don't call super.show()
//     // which would show VersusText and start socket listeners
//     if (this.phaseOne) {
//       this.phaseOne.cardDeck.visible = true;
//       this.phaseOne.cardDeck.show(true);
//     }
//     // this.opponentBar.show(true);
//     this.playerBar.show(true);
//     if (this.phaseOne) {
//       this.phaseOne.animateShow(true, true);
//     }

//     window.addEventListener("appMessage", this.bindAppMessageListener);
//     window.addEventListener("message", this.bindAppMessageListener);
//   }

//   public handleEmitLeaveGame = () => {
//     Logger.info("handleEmitLeaveGame from PracticeScreen called");
//     apiClient.updatePlayerOnboardingStatus().catch((error) => {
//       Logger.error("Failed to update player onboarding status", error);
//     });
//     navigation.goBackToLobby(false);
//   };

//   public async hide() {
//     // Practice-specific cleanup
//     this.opponentBar.hide(true);
//     this.playerBar.hide(true);

//     if (this.phaseOne) {
//       this.phaseOne.animateHide(true, true);
//     }

//     window.removeEventListener("appMessage", this.bindAppMessageListener);
//     window.removeEventListener("message", this.bindAppMessageListener);

//     // Call parent hide() to cleanup base GameScreen UI components
//     // await super.hide();
//   }
//   public resize(width: number, height: number) {
//     // Call parent resize method first
//     super.resize(width, height);

//     // Handle skip button resizing
//     if (this.skipButton) {
//       // * keep left side skip button to avoid overlap with opponent bar
//       this.skipButton.x = 40;

//       this.skipButton.y =
//         this.viewMode == VIEW_MODE.WEB_VIEW
//           ? this.opponentBar.y + this.skipButton.height / 3
//           : 20;
//     }
//   }

//   public handleCardPlaceConfirm = (cardInfo: CardInfo) => {
//     // Validate that the slot is actually empty before proceeding
//     const placement =
//       this.phaseOne?.cardsColumns[cardInfo.columnIndex].getCardPlacements()[
//         cardInfo.cardIndex
//       ];

//     if (!placement) {
//       Logger.warn("Invalid card placement position", cardInfo);
//       return;
//     }

//     if (
//       placement.cardId !== null &&
//       placement.cardId !== "card-placement" &&
//       placement.cardId !== "card-back"
//     ) {
//       Logger.warn("Card already placed at this position, skipping", cardInfo);
//       return;
//     }

//     this.cardPickedCount++;
//     if (this.showHandTimer) {
//       clearTimeout(this.showHandTimer);
//     }
//     if (this.cardPickedCount === 5 && this.autoPickTimer) {
//       clearTimeout(this.autoPickTimer);
//       this.autoPickTimer = null;
//     }
//     if (this.cardPickedCount < 5) {
//       this.showHandTimer = setTimeout(() => {
//         this.showPointersAtAllEmptyPlacements();
//       }, 3000);
//     }

//     // Hide tooltip when first card is placed
//     if (this.cardPickedCount === 1) {
//       this.ToolTip.hide();
//     }

//     // Auto-place 6th card immediately after 5th card is placed
//     if (this.cardPickedCount === 5 && this.phaseOne && !this.sixthCardPlaced) {
//       setTimeout(() => {
//         const emptyPlacements = this.getAllEmptyCardPlacements();
//         if (emptyPlacements.length > 0) {
//           this.sixthCardPlaced = true;
//           this.cardPickedCount++; // Increment for 6th card
//           const autoPickCardParams = emptyPlacements[0];
//           const cardNumber = this.cardPickedCount; // Use the incremented value

//           // Hide FTUE pointers before auto-placing
//           this.hideFTUEPointers();

//           // Animate the 6th card placement
//           this.phaseOne?.handleAutoCardPick(
//             autoPickCardParams,
//             cardNumber,
//             () => {
//               // Trigger opponent card reveal and phase 2 transition
//               // Call nextFTUEStep directly to trigger opponent animation and phase 2 transition
//               this.nextFTUEStep({
//                 columnIndex: autoPickCardParams.columnIndex,
//                 cardIndex: autoPickCardParams.cardIndex,
//               });
//             },
//           );
//         }
//       }, 1000);
//     }

//     // Clear animations/timers
//     this.hideFTUEPointers();
//     //this.playerBar.stopTimer();
//     if (this.phaseOne) {
//       this.phaseOne.cardDeck.hideWhiteOverlay();
//       this.phaseOne.cardDeck.setOpacityCardDeck(0.5);
//       this.phaseOne.clearShimmerTimer();
//       this.phaseOne.stopCardPlacementPulse();
//     }
//     // Set card and visual states
//     this.phaseOne?.cardsColumns[cardInfo.columnIndex].setCard(
//       cardInfo.cardIndex,
//       "card-back",
//       this.cardPickedCount,
//     );

//     // Don't restart animations here - they will be restarted in onFTUEStepComplete after opponent's card
//     return this.nextFTUEStep({
//       columnIndex: cardInfo.columnIndex,
//       cardIndex: cardInfo.cardIndex,
//     });
//   };

//   public cardPlaceConfirmAction(cardInfo: CardInfo) {
//     const { columnIndex, cardIndex } = cardInfo;

//     // Validate that the slot is actually empty before proceeding
//     const placement =
//       this.phaseOne?.cardsColumns[columnIndex].getCardPlacements()[cardIndex];

//     if (!placement) {
//       Logger.warn(
//         "Invalid card placement position in cardPlaceConfirmAction",
//         cardInfo,
//       );
//       return;
//     }

//     if (placement.cardId !== null && placement.cardId !== "card-placement") {
//       Logger.warn(
//         "Card already placed at this position in cardPlaceConfirmAction, skipping",
//         cardInfo,
//       );
//       return;
//     }

//     this.hideFTUEPointers();
//     //this.playerBar.stopTimer();

//     return this.nextFTUEStep({
//       columnIndex,
//       cardIndex,
//     });
//   }

//   protected showPointersAtAllEmptyPlacements() {
//     // Stop any existing animation first
//     this.FTUEPointer.stopAnimation();

//     const emptyPlacements = this.getAllEmptyCardPlacements();
//     if (emptyPlacements.length === 0) return;

//     const pointerPositions = emptyPlacements.map((placement: CardInfo) => ({
//       from: {
//         x: placement.x + 35,
//         y: placement.y + 60,
//       },
//       to: {
//         x: placement.x + 45,
//         y: placement.y + 70,
//       },
//     }));

//     this.FTUEPointer.animateMultipleTaps(pointerPositions);
//   }

//   private showPointersOnActionButtons() {
//     if (this.suppressActionPointers) {
//       return;
//     }
//     // Stop any existing animation first
//     this.FTUEPointer.stopAnimation();

//     const hitButtonPos = actionButtonCoordinations.find(
//       (item) => item.buttonId === "hit",
//     );
//     const standButtonPos = actionButtonCoordinations.find(
//       (item) => item.buttonId === "stand",
//     );

//     // If coordinates aren't available yet, retry after a short delay
//     if (!hitButtonPos || !standButtonPos) {
//       if (this.suppressActionPointers) return;
//       this.actionPointersTimer = setTimeout(() => {
//         this.showPointersOnActionButtons();
//       }, 200);
//       return;
//     }

//     // Show pointers on both buttons with wave effect
//     this.FTUEPointer.animateMultipleUpDown([
//       { ...hitButtonPos, angle: -170 },
//       { ...standButtonPos, angle: -170 },
//     ]);
//   }
//   private scheduleActionPointers(delayMs = 1000) {
//     if (this.actionPointersTimer) {
//       clearTimeout(this.actionPointersTimer);
//       this.actionPointersTimer = null;
//     }
//     if (this.suppressActionPointers) {
//       return;
//     }
//     this.actionPointersTimer = setTimeout(() => {
//       if (this.suppressActionPointers) return;
//       this.showPointersOnActionButtons();
//     }, delayMs);
//   }

//   private findNextFTUECardPlacement(
//     _columnIndex: number,
//     _cardIndex: number,
//     setTimeOut: number = 0,
//   ) {
//     if (this.FTUEStep === 0) {
//       // Show pointer animation for all empty placements (ignoring columnIndex and cardIndex)
//       setTimeout(() => {
//         this.showPointersAtAllEmptyPlacements();
//       }, setTimeOut);
//     } else {
//       // Enable tap interaction only for empty placements
//       this.phaseOne?.cardsColumns.forEach((column) => {
//         column.getCardPlacements().forEach((placement) => {
//           // Only enable tap if the placement is truly empty
//           const isEmpty =
//             placement.cardId === null || placement.cardId === "card-placement";
//           placement.tapInteraction(isEmpty);
//         });
//       });
//     }
//   }

//   private FTUEStartTimer(delay: number = 100, isCardPick: boolean = false) {
//     setTimeout(() => {
//       const turnInfo = {
//         opponentTurnInfo: {
//           turnTime: isCardPick ? 30 : 15,
//           remainingTurnTime: isCardPick ? 30 : 15,
//           isExtraTurnTime: false,
//         },
//         ownTurnInfo: {
//           turnTime: isCardPick ? 30 : 15,
//           remainingTurnTime: isCardPick ? 30 : 15,
//           isExtraTurnTime: false,
//           card: "C10" as CardId,
//           allowActions: [ALLOW_ACTIONS.PICK_CARD],
//         },
//       };
//       this.opponentBar.startTimer(turnInfo?.opponentTurnInfo);
//       this.playerBar.startTimer(turnInfo?.ownTurnInfo);
//     }, delay);
//   }

//   private nextFTUEStep(player: { columnIndex: number; cardIndex: number }) {
//     const delay = 0.5 + Math.random() * 0.4;
//     const onComplete = this.onFTUEStepComplete.bind(this);
//     const data = getPracticeStepsData(player.cardIndex, player.columnIndex);

//     if (!data) {
//       Logger.error("Invalid practice step data for position", player);
//       return;
//     }

//     if (this.FTUEStep === 0) {
//       this.ToolTip.hide();
//     }

//     setTimeout(() => {
//       this.phaseOne?.animateDeckCardToOpponent({
//         opponentInfo: {
//           columnIndex: data.opponentColumn,
//           cardIndex: data.opponentCard,
//           cardValue: data.cardValue,
//         },
//         onComplete,
//         delay,
//       });
//       this.phaseOne?.cardsColumns[player.columnIndex].flipPlayerCard({
//         cardIndex: player.cardIndex,
//         cardValue: data.cardValue,
//       });
//     }, 100);

//     this.FTUEStep++;
//     return;
//   }

//   private async onFTUEStepComplete() {
//     if (this.FTUEStep === 1) {
//       this.ftueQueue.startStep("after_finish_setup_card_placement");
//     }

//     if (this.FTUEStep <= 5) {
//       //this.FTUEStartTimer();
//       // Reset card deck state for next card placement (matching PhaseOne.handlePickCard behavior)
//       if (this.phaseOne) {
//         this.phaseOne.cardDeck.setOpacityCardDeck(1);
//         this.phaseOne.cardDeck.hideWhiteOverlay(true);
//         this.phaseOne.startShimmerAnimation();
//         this.phaseOne.startCardPlacementPulseAnimation();
//       }
//       const currentPlacement = cardPlacements.get(this.FTUEStep);
//       this.findNextFTUECardPlacement(
//         currentPlacement!.column,
//         currentPlacement!.card,
//         this.FTUEStep == 1 ? 300 : 0,
//       );
//     }

//     if (this.FTUEStep === 6) {
//       this.FTUEStep++;
//       this.ftueQueue.startStep("setup_done");
//       this.ftueQueue.startStep("phase_two_transition");
//     }
//   }

//   private handleFTUEPhaseTwoTransition() {
//     this.animateDeckPhaseTwo(true);
//     this.opponentBar.showActionInfo();
//     this.playerBar.setButtonsVisible(true);
//     this.playerBar.hitActionButton.setEnabled();
//     this.playerBar.standActionButton.setEnabled();
//     // Show pointers after buttons finish animating (0.5s width + 0.3s fade = ~0.8s, add buffer)
//     this.suppressActionPointers = false;
//     this.scheduleActionPointers(1000);
//     this.FTUEStartTimer();
//     this.timer = setTimeout(() => {
//       this.hitAction();
//     }, 15100);
//   }

//   public hitAction() {
//     if (this.timer) {
//       clearTimeout(this.timer);
//       this.timer = null;
//     }
//     if (this.isTurnActionInProgress) {
//       return;
//     }
//     this.isTurnActionInProgress = true;
//     const activeColumnIndex = this.getCurrentActiveColumnIndex();
//     this.playerBar.setButtonsVisible(false);
//     // Hide FTUE pointers when user takes action
//     this.hideFTUEPointers();
//     console.log("activeColumnIndex", activeColumnIndex);
//     if (activeColumnIndex === null) {
//       this.isTurnActionInProgress = false;
//       return;
//     }
//     const currentTurn = this.columnTurnTracker.get(activeColumnIndex) ?? 0;
//     const columnUpdateInfo = getPracticeColumnUpdateInfo(
//       activeColumnIndex,
//       currentTurn,
//       "HIT",
//       this.isFirstTurnDraw,
//     );
//     if (
//       activeColumnIndex === 2 &&
//       columnUpdateInfo?.ownColumnUpdate?.cardInfo?.columnFinishType ===
//         FINISH_TYPES.DRAW
//     ) {
//       this.isFirstTurnDraw = true;
//     }
//     const finishType =
//       columnUpdateInfo?.ownColumnUpdate?.cardInfo?.columnFinishType;
//     if (!columnUpdateInfo) {
//       console.log(
//         `No practice column update info for column ${activeColumnIndex} and turn ${currentTurn}`,
//       );
//       return;
//     }
//     // Check if game will end after this update (2 columns won)
//     // Game ends if: winCount >= 2 OR (drawCount >= 2 AND winCount >= 1)
//     const willWin = finishType === FINISH_TYPES.WIN;
//     const willDraw = finishType === FINISH_TYPES.DRAW;
//     const willGameEnd =
//       (willWin && this.winCount >= 1) || // After this win, winCount will be >= 2
//       (willDraw && this.drawCount >= 1 && this.winCount >= 1); // After this draw, drawCount will be >= 2 and winCount >= 1
//     // Set moveToNextColumn to false if game will end after this update
//     if (willGameEnd) {
//       columnUpdateInfo.moveToNextColumn = false;
//     }
//     if (finishType === FINISH_TYPES.WIN) {
//       this.winCount++;
//     } else if (finishType === FINISH_TYPES.LOSE) {
//       this.loseCount++;
//     } else if (finishType === FINISH_TYPES.DRAW) {
//       this.drawCount++;
//     }
//     this.phaseTwo?.applyColumnUpdate(columnUpdateInfo);
//     this.columnTurnTracker.set(activeColumnIndex, currentTurn + 1);
//     if (
//       activeColumnIndex === 2 &&
//       columnUpdateInfo?.ownColumnUpdate?.cardInfo?.columnFinishType ===
//         FINISH_TYPES.DRAW
//     ) {
//       this.isFirstTurnDraw = true;
//     }

//     if (this.winCount >= 2 || (this.drawCount >= 2 && this.winCount >= 1)) {
//       this.handleWinTwoOutThreeColumns();
//       this.isTurnActionInProgress = false;
//       return;
//     }
//     setTimeout(() => {
//       this.playerBar.setButtonsVisible(true);
//       this.FTUEStartTimer();
//       // Show pointers again for next turn after buttons finish animating
//       this.suppressActionPointers = false;
//       this.scheduleActionPointers(1000);
//       this.isTurnActionInProgress = false;
//       this.timer = setTimeout(() => {
//         this.timer = null;
//         this.hitAction();
//       }, 15100);
//     }, this.nextTurnStartDelay);
//   }

//   public standAction() {
//     if (this.timer) {
//       clearTimeout(this.timer);
//       this.timer = null;
//     }
//     if (this.isTurnActionInProgress) {
//       return;
//     }
//     this.isTurnActionInProgress = true;
//     const activeColumnIndex = this.getCurrentActiveColumnIndex();
//     this.playerBar.setButtonsVisible(false);
//     // Hide FTUE pointers when user takes action
//     this.hideFTUEPointers();
//     if (activeColumnIndex === null) {
//       Logger.warn(
//         "No active column index available for practice stand action in stand action",
//       );
//       this.isTurnActionInProgress = false;
//       return;
//     }

//     const currentTurn = this.columnTurnTracker.get(activeColumnIndex) ?? 0;
//     const columnUpdateInfo = getPracticeColumnUpdateInfo(
//       activeColumnIndex,
//       currentTurn,
//       "STAND",
//       this.isFirstTurnDraw,
//     );
//     const finishType =
//       columnUpdateInfo?.ownColumnUpdate?.cardInfo?.columnFinishType;
//     if (!columnUpdateInfo) {
//       Logger.warn(
//         `No practice column update info for column ${activeColumnIndex} and turn ${currentTurn}`,
//       );
//       this.isTurnActionInProgress = false;
//       return;
//     }
//     // Check if game will end after this update (2 columns won)
//     // Game ends if: winCount >= 2 OR (drawCount >= 2 AND winCount >= 1)
//     const willWin = finishType === FINISH_TYPES.WIN;
//     const willDraw = finishType === FINISH_TYPES.DRAW;
//     const willGameEnd =
//       (willWin && this.winCount >= 1) || // After this win, winCount will be >= 2
//       (willDraw && this.drawCount >= 1 && this.winCount >= 1); // After this draw, drawCount will be >= 2 and winCount >= 1
//     // Set moveToNextColumn to false if game will end after this update
//     if (willGameEnd) {
//       columnUpdateInfo.moveToNextColumn = false;
//     }
//     if (finishType === FINISH_TYPES.WIN) {
//       this.winCount++;
//     } else if (finishType === FINISH_TYPES.LOSE) {
//       this.loseCount++;
//     } else if (finishType === FINISH_TYPES.DRAW) {
//       this.drawCount++;
//     }
//     this.phaseTwo?.applyColumnUpdate(columnUpdateInfo);
//     this.columnTurnTracker.set(activeColumnIndex, currentTurn + 1);
//     if (this.winCount >= 2 || (this.drawCount >= 2 && this.winCount >= 1)) {
//       this.handleWinTwoOutThreeColumns();
//       this.isTurnActionInProgress = false;
//       return;
//     }
//     setTimeout(() => {
//       this.playerBar.setButtonsVisible(true);
//       this.FTUEStartTimer();
//       // Show pointers again for next turn after buttons finish animating
//       this.suppressActionPointers = false;
//       this.scheduleActionPointers(1000);
//       this.isTurnActionInProgress = false;
//       this.timer = setTimeout(() => {
//         this.timer = null;
//         this.standAction();
//       }, 15100);
//     }, this.nextTurnStartDelay);
//   }

//   private handleWinTwoOutThreeColumns() {
//     this.hideFTUEPointers();
//     this.playerBar.setButtonsVisible(false);
//     this.playerBar.stopTimer();
//     const activeColumnIndex = 0;
//     setTimeout(() => {
//       this.opponentBar.stopTimer();
//       this.phaseTwo?.cardsColumnPhaseTwo[activeColumnIndex].setOverlay(
//         false,
//         false,
//       );
//       setTimeout(() => {
//         this.endGame({
//           playerWon: true,
//           playerScore: this.winCount,
//           opponentScore: this.loseCount,
//           gameEndType: END_GAME_REASON.GAME_OVER,
//           onComplete: this.endGameHandler.bind(this),
//           gameResultInfo: {
//             winnerId: this.gameUserId,
//             winnerPoints: this.winCount,
//             looserPoints: this.loseCount,
//             looserId: getOpponent(this.players, this.gameUserId).gameUserId,
//             gameEndType: END_GAME_REASON.GAME_OVER,
//           },
//         });
//       }, 500);

//       this.FTUEStep++;
//     }, 2000);
//   }

//   public endGameHandler(resultOverlay: ResultOverlay) {
//     setTimeout(() => {
//       if (CURRENT_PARTNER === PARTNER_ID.bt) {
//         // Ensure game end event is only sent once per player
//         if (this.hasPracticeEndEventBeenSent) {
//           Logger.info(
//             "Practice end event already sent, skipping duplicate call",
//           );
//           return;
//         }

//         this.hasPracticeEndEventBeenSent = true;

//         ClientEvent.GameEnded({
//           lobbyFormat: LOBBY_FORMAT.DUEL,
//           matchId: this.matchId,
//           gameResult: "player_won",
//           amount: this.winCount,
//           user: {
//             username: this.players[this.gameUserId].username, // we don't need this as we are using from carnival state
//             score: this.winCount,
//             profilePicture: this.players[this.gameUserId].profilePicture,
//             isTie: false,
//           },
//           opponent: {
//             username: getOpponent(this.players, this.gameUserId).username,
//             score: this.loseCount,
//             profilePicture: getOpponent(this.players, this.gameUserId)
//               .profilePicture,
//             isTie: false,
//           },
//           currencyCode:
//             this.players[this.gameUserId].lobbyDetails?.currencyCode,
//         });
//         ClientEvent.GameClose();
//         return;
//       }
//       apiClient.updatePlayerOnboardingStatus().catch((error) => {
//         Logger.error("Failed to update player onboarding status", error);
//       });
//       setTimeout(() => {
//         navigation.goBackToLobby(false);
//         resultOverlay.hide();
//       }, 2500);
//     }, 3000);
//   }

//   private handlePlayVoice(
//     audioAlias:
//       | "tap_on_empty_slot"
//       | "opponent_gets_same_card"
//       | "finish_your_setup"
//       | "beat_your_opponent_without_busting_going_over_21_to_win_the_match_up"
//       | "win_2_out_of_3_columns_to_win_the_game",
//   ) {
//     if (CURRENT_PARTNER === PARTNER_ID.fw) {
//       const path = `ftue/${audioAlias}.wav`;
//       if (isMetaFreeWin()) {
//         sfx.play(path);
//       }
//     }
//   }

//   public handleAppMessage = (event: MessageEvent) => {
//     try {
//       if (event.data.type === "QUIT_GAME" || event.data.type === "GAME_LEAVE") {
//         //close the webview instead of redirecting to the lobby
//         if (!isMetaFreeWin()) {
//           navigation.closeWebView();
//         }
//       }
//     } catch (error) {
//       Logger.error("Error handling app message in LobbyScreen:", error);
//     }
//   };
//   public blur() {
//     this.playerBar.clearExpiringTimer();
//   }

//   private hideFTUEPointers() {
//     this.FTUEPointer.stopAnimation();
//     this.FTUEPointer.visible = false;
//     this.suppressActionPointers = true;
//     if (this.actionPointersTimer) {
//       clearTimeout(this.actionPointersTimer);
//       this.actionPointersTimer = null;
//     }
//   }
// }

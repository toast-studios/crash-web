// import { Container, Sprite, Text, Graphics } from "pixi.js";
// import { app } from "../app";
// import { StoreData, GAME_STATE, FINISH_TYPES } from "../store/storeTypes";
// import { PlayerCardColumns } from "../ui/PlayerCardColumns";
// import {
//     API_CONSTANTS,
//     CURRENT_PARTNER,
//     PARTNER_ID,
// } from "../network/constants";
// import { GAME_MODES } from "../constants";
// import { navigation } from "../utils/navigation";
// import { InfoPopup } from "../popups/InfoPopup";
// import { ClientEvent } from "../utils/clientEvent";
// import { socketManager } from "../network/SocketManager";
// import CONSTANTS from "../constants";
// import { isFreeWin, isMetaFreeWin } from "../utils/game";
// import { TournamentPlayerProfileBar } from "../ui/TournamentPlayerProfileBar";
// import {
//     LEADERBOARD_PLAYER_SCORE,
//     TurnInfo,
// } from "../network/SocketEventHandler";
// import { Logger } from "../utils/logger";
// import { delayCall } from "../utils/game";
// import gsap from "gsap";
// import { CardDeck } from "../ui/Cards/CardDeck";
// import { sfx } from "../utils/audio";

// import { TournamentPhaseOne } from "./phases/TournamentPhaseOne";
// import { TournamentPhaseTwo } from "./phases/TournamentPhaseTwo";
// import { CardId } from "../ui/Cards/Card";

// type DebugPlayerInfo = {
//     gameUserId: string;
//     username: string;
//     profilePicture: string;
//     rank: number;
//     score: number;
//     isTopper: boolean;
//     cardsColumns: Array<{
//         score: number;
//         finishType: FINISH_TYPES;
//         cards: Array<CardId | null>;
//     }>;
//     lastAction?: {
//         action: "HIT" | "STAND";
//         cardInfo: {
//             card: CardId;
//             columnIndex: number;
//             cardIndex: number;
//         };
//     };
// };

// type DebugGameTableInfo = {
//     players: Record<string, DebugPlayerInfo>;
//     activeColumnIndex: number;
//     gameState: GAME_STATE;
// };

// class DebugPlayerRow extends Container {
//     private background: Graphics;
//     private rankText: Text;
//     private scoreText: Text;
//     private nameText: Text;
//     private columnsContainer: Container;
//     private columnDisplays: Container[] = [];

//     constructor(private rowHeight: number = 150) {
//         super();

//         this.background = new Graphics();
//         this.background.beginFill(0x2a2a2a, 0.8);
//         this.background.drawRoundedRect(0, 0, 100, this.rowHeight, 10);
//         this.background.endFill();
//         this.addChild(this.background);

//         // Player info section
//         this.rankText = new Text("", {
//             fontSize: 16,
//             fill: 0xffffff,
//             fontWeight: "bold",
//         });
//         this.rankText.x = 10;
//         this.rankText.y = 10;
//         this.addChild(this.rankText);

//         this.scoreText = new Text("", {
//             fontSize: 14,
//             fill: 0x00ff00,
//         });
//         this.scoreText.x = 10;
//         this.scoreText.y = 35;
//         this.addChild(this.scoreText);

//         this.nameText = new Text("", {
//             fontSize: 12,
//             fill: 0xcccccc,
//         });
//         this.nameText.x = 10;
//         this.nameText.y = 55;
//         this.addChild(this.nameText);

//         this.columnsContainer = new Container();
//         this.columnsContainer.x = 10;
//         this.columnsContainer.y = 75;
//         this.addChild(this.columnsContainer);
//     }

//     public updatePlayerInfo(
//         playerInfo: DebugPlayerInfo,
//         activeColumnIndex: number
//     ) {
//         this.rankText.text = `Rank: ${playerInfo.rank}`;
//         this.scoreText.text = `Score: ${playerInfo.score}`;
//         this.nameText.text = `${playerInfo.username || playerInfo.gameUserId.substring(0, 8)}`;

//         // Clear existing column displays
//         this.columnsContainer.removeChildren();
//         this.columnDisplays = [];

//         // Create column displays
//         const columnWidth = 120;
//         const columnGap = 10;

//         playerInfo.cardsColumns.forEach((column, columnIndex) => {
//             const columnDisplay = this.createColumnDisplay(
//                 column,
//                 columnIndex,
//                 activeColumnIndex === columnIndex,
//                 playerInfo.lastAction
//             );
//             columnDisplay.x = columnIndex * (columnWidth + columnGap);
//             this.columnsContainer.addChild(columnDisplay);
//             this.columnDisplays.push(columnDisplay);
//         });

//         // Update background width
//         const totalWidth =
//             150 + playerInfo.cardsColumns.length * (columnWidth + columnGap);
//         this.background.clear();
//         this.background.beginFill(0x2a2a2a, 0.8);
//         this.background.drawRoundedRect(0, 0, totalWidth, this.rowHeight, 10);
//         this.background.endFill();
//     }

//     private createColumnDisplay(
//         column: DebugPlayerInfo["cardsColumns"][0],
//         columnIndex: number,
//         isActive: boolean,
//         lastAction?: DebugPlayerInfo["lastAction"]
//     ): Container {
//         const container = new Container();

//         // Column background
//         const bg = new Graphics();
//         bg.beginFill(isActive ? 0x4a4a00 : 0x1a1a1a, 0.9);
//         bg.lineStyle(2, isActive ? 0xffff00 : 0x666666);
//         bg.drawRoundedRect(0, 0, 110, 70, 5);
//         bg.endFill();
//         container.addChild(bg);

//         // Column score and finish type
//         const scoreText = new Text(`Score: ${column.score}`, {
//             fontSize: 10,
//             fill: 0xffffff,
//         });
//         scoreText.x = 5;
//         scoreText.y = 5;
//         container.addChild(scoreText);

//         const statusText = new Text(`${column.finishType}`, {
//             fontSize: 9,
//             fill: this.getFinishTypeColor(column.finishType),
//         });
//         statusText.x = 5;
//         statusText.y = 20;
//         container.addChild(statusText);

//         // Cards display
//         const cardsText = column.cards
//             .map((card, idx) => {
//                 if (card === null) return "[ ]";

//                 // Check if this card was just added by lastAction
//                 let actionLabel = "";
//                 if (
//                     lastAction &&
//                     lastAction.cardInfo.columnIndex === columnIndex &&
//                     lastAction.cardInfo.cardIndex === idx
//                 ) {
//                     actionLabel = `[${lastAction.action === "HIT" ? "H" : "S"}]`;
//                 }

//                 return `${actionLabel}${card}`;
//             })
//             .join(" ");

//         const cardsDisplay = new Text(cardsText, {
//             fontSize: 9,
//             fill: 0xaaaaaa,
//             wordWrap: true,
//             wordWrapWidth: 100,
//         });
//         cardsDisplay.x = 5;
//         cardsDisplay.y = 35;
//         container.addChild(cardsDisplay);

//         return container;
//     }

//     private getFinishTypeColor(finishType: FINISH_TYPES): number {
//         switch (finishType) {
//             case FINISH_TYPES.WIN:
//                 return 0x00ff00;
//             case FINISH_TYPES.BUST:
//                 return 0xff0000;
//             case FINISH_TYPES.DRAW:
//                 return 0xffff00;
//             case FINISH_TYPES.LOSE:
//                 return 0xff8800;
//             default:
//                 return 0xcccccc;
//         }
//     }
// }

// export class TestTournamentScreen extends Container {
//     public static assetBundles = ["common", "game", "player-profile"];
//     private background: Sprite;
//     public viewMode = import.meta.env.VITE_VIEW_MODE;
//     private playerColumnsContainer: Container;
//     private playerColumns: PlayerCardColumns[] = [];
//     private playerBar: TournamentPlayerProfileBar;
//     private activeColumnIndex: number;
//     public gameState: GAME_STATE;
//     public isReconnection: boolean = false;
//     public nextTurnStartDelay: number = 1500;
//     private isFirstTurn: boolean = true;
//     private gameTable: Sprite;
//     public cardDeck: CardDeck;
//     private cardDeckContainer: Sprite;
//     private gameUserId: string;

//     public phaseOne?: TournamentPhaseOne;
//     public phaseTwo?: TournamentPhaseTwo;

//     // Debug UI
//     private debugContainer: Container;
//     private debugPlayerRows: Map<string, DebugPlayerRow> = new Map();
//     private debugScrollContainer: Container;
//     private debugGameTableInfo?: DebugGameTableInfo;

//     constructor({
//         gameState,
//         isReconnection,
//         gameUserId,
//         players,
//         turnInfo,
//         activeColumnIndex,
//     }: StoreData) {
//         super();

//         this.gameUserId = gameUserId;
//         this.activeColumnIndex = activeColumnIndex ?? -1;

//         this.background = Sprite.from("tournament_game_background");
//         this.addChild(this.background);

//         // Initialize debug container at the top
//         this.debugScrollContainer = new Container();
//         this.debugContainer = new Container();
//         this.debugScrollContainer.addChild(this.debugContainer);
//         this.addChild(this.debugScrollContainer);

//         // Create game table sprite for card deck
//         this.gameTable = Sprite.from("game-table");
//         this.gameTable.anchor.set(0.5);
//         this.gameTable.x = app.screen.width / 2;
//         this.gameTable.y = app.screen.height / 2;

//         this.cardDeckContainer = Sprite.from("card-deck-container");
//         this.cardDeckContainer.height /= 2;
//         this.cardDeckContainer.width /= 2;
//         this.addChild(this.cardDeckContainer);

//         this.cardDeck = new CardDeck({
//             deckLength: 52,
//             gameTable: this.gameTable,
//         });
//         this.cardDeck.cards.forEach((card) => {
//             card.width /= 2;
//             card.height /= 2;
//         });
//         this.cardDeck.visible = true;
//         this.addChild(this.cardDeck);
//         this.cardDeck.show(false);

//         this.gameState = gameState;
//         this.isReconnection = isReconnection;

//         if (isReconnection) {
//             this.nextTurnStartDelay = 1000;
//             this.isFirstTurn = false;
//         } else {
//             this.nextTurnStartDelay = 1500;
//             this.isFirstTurn = true;
//         }

//         this.playerColumnsContainer = new Container();
//         this.addChild(this.playerColumnsContainer);

//         const isDraftingPhase =
//             gameState === GAME_STATE.PHASE_ONE ||
//             gameState === GAME_STATE.SHUFFLING_CARDS;

//         this.playerBar = new TournamentPlayerProfileBar({
//             profilePictureUrl: players[gameUserId].profilePicture,
//             fallbackImageUrl: players[gameUserId].fallbackImageUrl ?? "",
//             isPokerChip: false,
//             coinValue: players[gameUserId].lobbyDetails
//                 ? {
//                       amount: players[gameUserId].lobbyDetails.entryFee,
//                       currencySymbol:
//                           players[gameUserId].lobbyDetails.currencySymbol,
//                       isFree: false,
//                       currencyCode:
//                           players[gameUserId].lobbyDetails.currencyCode,
//                   }
//                 : undefined,
//         });
//         this.playerBar.visible = !isDraftingPhase;
//         this.playerBar.y = isDraftingPhase
//             ? app.screen.height
//             : app.screen.height - this.playerBar.height - 15;

//         this.addChild(this.playerBar);

//         // Mock header and leaderboard for height calculation
//         const mockHeader = { height: 0 };
//         const mockLeaderboard = { height: 0 };

//         const playerCardsColumns = players[gameUserId].cardsColumns || [];
//         const numberOfColumns = Math.max(playerCardsColumns.length, 3);

//         for (let i = 0; i < numberOfColumns; i++) {
//             const col = new PlayerCardColumns({
//                 header: mockHeader,
//                 leaderboard: mockLeaderboard,
//                 playerBar: this.playerBar,
//                 isDraftingPhase,
//                 columnIndex: i,
//                 playerCards: playerCardsColumns[i]?.cards || [null, null],
//                 onCardPlacementTap: (cardInfo, index) => {
//                     this.phaseOne?.handleCardPlacementTap(cardInfo, index);
//                 },
//             });
//             this.playerColumns.push(col);
//             this.playerColumnsContainer.addChild(col);
//         }

//         playerCardsColumns.forEach((columnData, columnIndex) => {
//             if (this.playerColumns[columnIndex]) {
//                 if (players[gameUserId]?.positions) {
//                     this.playerColumns[columnIndex].initializeFromPlayerData(
//                         columnData.cards,
//                         players[gameUserId].positions
//                     );
//                 }

//                 if (isReconnection && gameState === GAME_STATE.PHASE_TWO) {
//                     const validCards = columnData.cards.filter(
//                         (cardId): cardId is CardId => cardId !== null
//                     );
//                     if (validCards.length > 0) {
//                         this.playerColumns[
//                             columnIndex
//                         ].setupCardsImmediatelyWithoutAnimation(validCards);
//                     }
//                 } else {
//                     columnData.cards.forEach((cardId) => {
//                         if (cardId) {
//                             this.playerColumns[columnIndex].addCard(cardId);
//                         }
//                     });
//                 }
//                 this.playerColumns[columnIndex].updateScore(
//                     columnData.score,
//                     columnData.finishType
//                 );
//             }
//         });

//         if (isDraftingPhase) {
//             this.phaseOne = new TournamentPhaseOne({
//                 playerColumns: this.playerColumns,
//                 cardDeck: this.cardDeck,
//             });
//             this.addChild(this.phaseOne);
//         }

//         if (this.gameState === GAME_STATE.PHASE_TWO) {
//             this.phaseTwo = new TournamentPhaseTwo({
//                 playerColumns: this.playerColumns,
//                 getPlayerBar: () => this.playerBar,
//                 activeColumnIndex: this.activeColumnIndex,
//                 handleColumnUpdate: (columnIndex: number) => {
//                     // this.handleColumnUpdate(columnIndex);
//                 },
//                 getTooltip: () => this.tooltip,
//                 cardDeck: this.cardDeck,
//             });
//             this.addChild(this.phaseTwo);
//         }

//         if (this.isReconnection && turnInfo) {
//             this.handleTurnInfo(turnInfo, true);
//         }
//         if (this.isReconnection) {
//             if (this.gameState === GAME_STATE.PHASE_TWO) {
//                 this.playerColumns.forEach((col, index) => {
//                     col.transitionToPhaseTwo();
//                     col.setOverlayOnCards(
//                         index !== this.activeColumnIndex ? true : false,
//                         false
//                     );
//                 });
//             } else {
//                 this.playerColumns.forEach((column, index) => {
//                     column.setOverlayOnCards(
//                         index !== this.activeColumnIndex ? true : false,
//                         true
//                     );
//                 });
//             }
//         }
//     }

//     private handleDebugGTIWithOpponentInfo(data: DebugGameTableInfo) {
//         Logger.info("DEBUG_GTI_WITH_OPPONENT_INFO", data);

//         // Store the game table info
//         this.debugGameTableInfo = data;

//         // Update debug display
//         this.updateDebugDisplay();
//     }

//     private updateDebugDisplay() {
//         if (!this.debugGameTableInfo) return;

//         this.debugContainer.removeChildren();
//         this.debugPlayerRows.clear();

//         let yOffset = 10;
//         const rowGap = 10;

//         const gameTableInfo = this.debugGameTableInfo;

//         // Sort players by rank (data now includes rank from backend)
//         const sortedPlayers = Object.entries(gameTableInfo.players).sort(
//             ([, playerA], [, playerB]) => {
//                 return playerA.rank - playerB.rank;
//             }
//         );

//         sortedPlayers.forEach(([gameUserId, playerInfo]) => {
//             const row = new DebugPlayerRow(150);
//             row.updatePlayerInfo(playerInfo, gameTableInfo.activeColumnIndex);
//             row.y = yOffset;
//             this.debugContainer.addChild(row);
//             this.debugPlayerRows.set(gameUserId, row);

//             yOffset += 150 + rowGap;
//         });
//     }

//     private handleSetupDone(data: StoreData): void {
//         Logger.info("SETUP_DONE");
//         this.activeColumnIndex = data.activeColumnIndex;
//         const delay = 2000;
//         delayCall(delay, () => {
//             Logger.info("Transitioning to Phase Two");
//             this.gameState = GAME_STATE.PHASE_TWO;
//             this.transitionToPhaseTwo(
//                 data.players[this.gameUserId].cardsColumns
//             );
//         });
//     }

//     private handleTurnInfo(data: TurnInfo, isReconnection: boolean = false) {
//         Logger.info("TURN_INFO", data, { isReconnection });

//         const cb = () => {
//             if (data.ownTurnInfo && data.ownTurnInfo.allowActions.length) {
//                 this.playerBar.startTimer(data.ownTurnInfo);

//                 if (
//                     this.gameState === GAME_STATE.PHASE_ONE ||
//                     this.gameState === GAME_STATE.SHUFFLING_CARDS
//                 ) {
//                     if (this.phaseOne) {
//                         this.phaseOne.isTurnActive = true;
//                         this.cardDeck.makeTopCardInteractive();
//                     }

//                     this.playerColumns.forEach((column) => {
//                         column.showCardPlacements(false);
//                         column.setCardPlacementsInteractive(true);
//                     });
//                 }

//                 if (this.gameState === GAME_STATE.PHASE_TWO) {
//                     if (this.phaseTwo) {
//                         if (!this.phaseTwo.isHitOrStandPromiseGoingOn) {
//                             this.playerBar.setButtonsVisible(true);
//                             Logger.info("TURN_INFO: Buttons shown");
//                         } else {
//                             Logger.info(
//                                 "TURN_INFO: Buttons not shown - waiting for column update"
//                             );
//                         }
//                     }
//                 }
//             }
//         };
//         if (isReconnection) {
//             cb();
//         } else {
//             delayCall(this.nextTurnStartDelay, cb);
//             if (this.isFirstTurn) {
//                 this.isFirstTurn = false;
//                 this.nextTurnStartDelay = 0;
//             }
//         }
//     }

//     private handleTournamentResultScreen(data: {
//         leaderboard: LEADERBOARD_PLAYER_SCORE[];
//     }) {
//         Logger.info("TOURNAMENT_RESULT_SCREEN", data);
//         setTimeout(() => {
//             navigation.goBackToLobby(true);
//         }, 3000);
//     }

//     private startSocketEventListeners() {
//         socketManager.on(
//             CONSTANTS.EVENTS.SETUP_DONE,
//             this.handleSetupDone.bind(this)
//         );
//         socketManager.on(
//             CONSTANTS.EVENTS.TURN_INFO,
//             this.handleTurnInfo.bind(this)
//         );
//         socketManager.on(
//             CONSTANTS.EVENTS.TOURNAMENT_RESULT_SCREEN,
//             this.handleTournamentResultScreen.bind(this)
//         );
//         socketManager.on(
//             CONSTANTS.EVENTS.DEBUG_GTI_WITH_OPPONENT_INFO,
//             this.handleDebugGTIWithOpponentInfo.bind(this)
//         );
//     }

//     private stopSocketEventListeners() {
//         socketManager.off(CONSTANTS.EVENTS.SETUP_DONE);
//         socketManager.off(CONSTANTS.EVENTS.TURN_INFO);
//         socketManager.off(CONSTANTS.EVENTS.TOURNAMENT_RESULT_SCREEN);
//         socketManager.off(CONSTANTS.EVENTS.DEBUG_GTI_WITH_OPPONENT_INFO);
//     }

//     public resize(width: number, height: number) {
//         const scaleX = width / this.background.texture.width;
//         const scaleY = height / this.background.texture.height;
//         const scale = Math.max(scaleX, scaleY);

//         this.background.width = this.background.texture.width * scale;
//         this.background.height = this.background.texture.height * scale;
//         this.background.x = (width - this.background.width) / 2;
//         this.background.y = (height - this.background.height) / 2;

//         // Position debug container
//         this.debugScrollContainer.x = 10;
//         this.debugScrollContainer.y = 10;

//         this.cardDeckContainer.x = width / 2 - this.cardDeckContainer.width / 2;
//         this.cardDeckContainer.y = 200;

//         if (this.cardDeck) {
//             this.cardDeck.x = width / 2 - this.cardDeck.width / 2;
//             this.cardDeck.y =
//                 this.cardDeckContainer.y + this.cardDeckContainer.height - 18;
//         }

//         if (this.phaseOne) {
//             this.phaseOne.resize(width, height);
//         }

//         this.playerColumnsContainer.y = 250;
//         this.playerColumnsContainer.x = 0;

//         const padding = 20;
//         const availableWidth = width - padding * 2;

//         if (this.playerColumns.length > 0) {
//             const baseColWidth = this.playerColumns[0].getLocalBounds().width;
//             const totalColsWidth = baseColWidth * this.playerColumns.length;

//             let targetScale = 1;
//             let gap = 0;

//             if (totalColsWidth > availableWidth) {
//                 targetScale = availableWidth / totalColsWidth;
//                 gap = 0;
//             } else {
//                 const remainingSpace = availableWidth - totalColsWidth;
//                 if (this.playerColumns.length > 1) {
//                     gap = remainingSpace / (this.playerColumns.length - 1);
//                 } else {
//                     gap = 0;
//                 }
//             }

//             this.playerColumns.forEach((col, index) => {
//                 col.width = baseColWidth * targetScale;
//                 col.height = col.getLocalBounds().height * targetScale;

//                 const currentWidth = col.width;

//                 if (this.playerColumns.length === 1) {
//                     col.x = (width - currentWidth) / 2;
//                 } else {
//                     col.x = padding + index * (currentWidth + gap);
//                 }

//                 col.y = 0;
//             });
//         }

//         if (this.playerBar) {
//             this.playerBar.x = width / 2 - this.playerBar.width / 2;
//             this.playerBar.y = height - 100;
//         }
//     }

//     public async show() {
//         this.startSocketEventListeners();
//         this.phaseOne?.startSocketEventListeners();
//         this.phaseTwo?.startSocketEventListeners();
//         this.cardDeck.show(false);
//     }

//     public async hide() {
//         this.stopSocketEventListeners();
//         this.phaseOne?.stopSocketEventListeners();
//         if (this.cardDeck) {
//             this.cardDeck.stopShimmerAnimation();
//             this.cardDeck.makeTopCardNonInteractive();
//         }
//         this.phaseTwo?.stopSocketEventListeners();

//     }

//     public exitButtonPressHandler() {
//         if (isMetaFreeWin()) {
//             ClientEvent.ShowQuitPopupModal();
//             return;
//         }
//         navigation.presentPopup(InfoPopup, {
//             message: "Are you sure you want to go back to lobby?",
//             showLoader: false,
//             showOkButton: true,
//             showCancelButton: true,
//             onOkPress: () => {
//                 navigation.presentPopup(InfoPopup, {
//                     showLoader: true,
//                     message: "",
//                     showCancelButton: false,
//                     showOkButton: false,
//                 });
//                 this.handleEmitLeaveGame();
//             },
//             onCancelPress: () => {
//                 navigation.dismissPopup();
//             },
//             ...(CURRENT_PARTNER == PARTNER_ID.em && {
//                 textColor: 0xfefff9,
//                 backgroundColor: 0x121212,
//             }),
//         });
//     }

//     public transitionToPhaseTwo(
//         playerCardsColumns: Array<{
//             score: number;
//             finishType: FINISH_TYPES;
//             cards: Array<CardId>;
//         }>
//     ) {
//         this.playerColumns.forEach((col, index) => {
//             col.transitionToPhaseTwo();
//             col.setOverlayOnCards(
//                 index !== this.activeColumnIndex ? true : false,
//                 true
//             );
//             col.updateScore(
//                 playerCardsColumns[index].score,
//                 playerCardsColumns[index].finishType
//             );
//         });

//         this.playerBar.visible = true;
//         this.playerBar.y = app.screen.height + this.playerBar.height;
//         gsap.to(this.playerBar, {
//             y: app.screen.height - 100,
//             duration: 0.6,
//             ease: "back.out(1.2)",
//         });

//         if (this.phaseOne) {
//             this.phaseOne.stopSocketEventListeners();
//             this.phaseOne.visible = false;
//         }

//         if (!this.phaseTwo) {
//             this.phaseTwo = new TournamentPhaseTwo({
//                 playerColumns: this.playerColumns,
//                 getPlayerBar: () => this.playerBar,
//                 activeColumnIndex: this.activeColumnIndex,
//                 cardDeck: this.cardDeck,
//             });
//             this.addChild(this.phaseTwo);
//         }
//     }

//     private handleEmitLeaveGame = () => {
//         if (API_CONSTANTS.GAME_MODES === GAME_MODES.PRACTICE) {
//             navigation.closeWebView();
//             return;
//         }
//         socketManager.emit(CONSTANTS.ACTIONS.LEAVE_GAME, {}, (response) => {
//             if (response.error) {
//                 navigation.presentPopup(InfoPopup, {
//                     message: response.message,
//                 });
//                 return;
//             }
//             if (isFreeWin() || CURRENT_PARTNER === PARTNER_ID.bt) {
//                 navigation.closeWebView();
//             } else {
//                 navigation.goBackToLobby(true);
//             }
//         });
//     };
// }

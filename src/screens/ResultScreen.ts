// import { Container, Text, FillGradient, Graphics } from "pixi.js";
// import { Leaderboard, PlayerData } from "../ui/Leaderboard";
// import type { PlayerExtraData } from "../ui/Leaderboard";
// import { CurrencyDisplay } from "../ui/CurrencyDisplay";
// import { app } from "../app";
// import { formatCurrency } from "../utils/currency";
// import { CURRENCY_CODES, CURRENCY_UI_MAPPING } from "../types";
// import { PlayAgainButton } from "../components/PlayAgainButton";
// import { BackToLobbyButton } from "../components/BackToLobbyButton";
// import type { StoreData } from "../store/storeTypes";
// import gsap from "gsap";
// import { apiClient } from "../network/apis";
// import { Logger } from "../utils/logger";
// import { sfx } from "../utils/audio";

// export interface ResultScreenPlayerData {
//   userId: string;
//   name: string;
//   score: number;
//   rank: number;
//   isTopper: boolean;
//   avatarUrl: string;
//   fallbackImageUrl: string;
//   isUser: boolean;
// }

// export interface ResultScreenConfig {
//   winAmount: number;
//   currencyCode: CURRENCY_CODES;
//   currencyIcon?: string;
//   currencySymbol?: string;
//   players: ResultScreenPlayerData[];
//   currentUserId: string;
//   gameUserId: string;
//   matchId: string;
//   onPlayAgain?: () => void;
//   onBackToLobby?: () => void;
// }

// export class ResultScreen extends Container {
//   private background: Graphics;
//   private contentContainer: Container;
//   private headerText: Text;
//   private winAmountText: Text;
//   private currencyDisplay: CurrencyDisplay;
//   private winAmountContainer: Container;
//   private leaderboard: Leaderboard;
//   private playAgainButton: PlayAgainButton;
//   private backToLobbyButton: BackToLobbyButton;
//   private buttonContainer: Container;
//   private onPlayAgainCallback?: () => void | Promise<void>;
//   private onBackToLobbyCallback?: () => void;

//   // Store final positions for animation
//   private headerFinalY: number = 0;
//   private winAmountFinalY: number = 0;
//   private leaderboardFinalY: number = 0;
//   private buttonsFinalY: number = 0;

//   // Polling
//   private matchId: string;
//   private currentUserId: string;
//   private pollingInterval: NodeJS.Timeout | null = null;
//   private isPollingActive: boolean = false;
//   private isFirstPoll: boolean = true;
//   private currentCurrencyCode: CURRENCY_CODES;
//   private currentCurrencyIcon?: string;
//   private currentCurrencySymbol?: string;
//   private currentWinAmount: number;

//   constructor(config: ResultScreenConfig) {
//     super();

//     // Store callbacks and config
//     this.onPlayAgainCallback = config.onPlayAgain;
//     this.onBackToLobbyCallback = config.onBackToLobby;
//     this.matchId = config.matchId;
//     this.currentUserId = config.currentUserId;
//     this.currentCurrencyCode = config.currencyCode;
//     this.currentCurrencyIcon = config.currencyIcon;
//     this.currentCurrencySymbol = config.currencySymbol;
//     this.currentWinAmount = config.winAmount;

//     // Create semi-transparent background
//     this.background = new Graphics();
//     this.background.rect(0, 0, app.screen.width, app.screen.height);
//     this.background.fill({ color: 0x000000, alpha: 0.5 });
//     this.addChild(this.background);

//     // Create content container for animation
//     this.contentContainer = new Container();
//     this.addChild(this.contentContainer);

//     // Create gradient for "You Win" text
//     const gradient = new FillGradient(0, 0, 200, 0);
//     gradient.addColorStop(0, 0xefbf6e);
//     gradient.addColorStop(0.5, 0xffde83);
//     gradient.addColorStop(1, 0xefbf6e);

//     // Determine initial header text based on match state and win amount
//     let initialHeaderText = "MATCH RESULT";
//     if (config.gameUserId) {
//       initialHeaderText = "MATCH IN PROGRESS";
//     } else if (config.winAmount > 0) {
//       initialHeaderText = "YOU WIN! ";
//     }

//     this.headerText = new Text({
//       text: initialHeaderText,
//       style: {
//         fontFamily: "Inter",
//         fontSize: 36,
//         fill: gradient,
//         fontWeight: "900",
//         align: "center",
//         fontStyle: "italic",
//       },
//     });
//     this.contentContainer.addChild(this.headerText);

//     this.winAmountContainer = new Container();
//     this.currencyDisplay = new CurrencyDisplay({
//       icon: config.currencyIcon,
//       symbol: config.currencySymbol,
//       size: 40,
//       textStyle: {
//         fontSize: 32,
//         fill: 0xffffff,
//         fontFamily: "Inter",
//       },
//     });

//     const formattedCurrency = formatCurrency(
//       config.winAmount,
//       config.currencyCode,
//       config.currencySymbol || "",
//       false,
//     );

//     this.winAmountText = new Text({
//       text: config.gameUserId ? "" : formattedCurrency,
//       style: {
//         fontFamily: "Inter",
//         fontSize: 32,
//         fill: 0xffffff,
//         fontWeight: "bold",
//         align: "left",
//       },
//     });

//     // Hide win amount container if match is ongoing or if user didn't win
//     if (config.gameUserId || config.winAmount <= 0) {
//       this.winAmountContainer.visible = false;
//     }
//     this.winAmountContainer.addChild(this.currencyDisplay);
//     this.winAmountContainer.addChild(this.winAmountText);
//     this.contentContainer.addChild(this.winAmountContainer);

//     // Convert ResultScreenPlayerData to Leaderboard format
//     const leaderboardPlayers: PlayerData[] = config.players.map((player) => ({
//       gameUserId: player.userId,
//       score: player.score,
//       rank: player.rank,
//       isTopper: player.isTopper,
//     }));

//     const extra: Record<string, PlayerExtraData> = {};

//     const players: StoreData["players"] = {};
//     config.players.forEach((player) => {
//       players[player.userId] = {
//         username: player.name,
//         profilePicture: player.avatarUrl,
//         fallbackImageUrl: player.fallbackImageUrl,
//         gameUserId: player.userId,
//         networkStatus: 0,
//         extraTurnTimeLeft: 0,
//         skipTurnCount: 0,
//         cardsColumns: [],
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         lobbyDetails: undefined as unknown as any,
//       };
//     });
//     this.leaderboard = new Leaderboard({
//       leaderboardPlayers,
//       extra,
//       players,
//       currentUserId: config.currentUserId,
//       isDraftingPhase: false,
//       variant: "result",
//     });
//     this.contentContainer.addChild(this.leaderboard);

//     this.buttonContainer = new Container();

//     this.playAgainButton = new PlayAgainButton({
//       width: 0,
//       height: 80,
//       onPress: this.handlePlayAgainPress,
//     });
//     this.buttonContainer.addChild(this.playAgainButton);

//     this.backToLobbyButton = new BackToLobbyButton({
//       width: 0,
//       height: 75,
//       onPress: this.handleBackToLobbyPress,
//     });
//     this.buttonContainer.addChild(this.backToLobbyButton);

//     this.contentContainer.addChild(this.buttonContainer);

//     this.setLayout();
//     this.setupInitialState();
//   }

//   private setLayout() {
//     const screenWidth = app.screen.width;
//     const padding = 30;
//     const containerWidth = screenWidth - 60;

//     // Header
//     this.headerText.x = screenWidth / 2 - this.headerText.width / 2;
//     this.headerFinalY = 150;
//     this.headerText.y = this.headerFinalY;

//     // Win amount display
//     this.currencyDisplay.x = 0;
//     this.currencyDisplay.y = 0;
//     this.winAmountText.x = this.currencyDisplay.width + 10;
//     this.winAmountText.y =
//       this.currencyDisplay.height / 2 - this.winAmountText.height / 2;

//     this.winAmountContainer.x =
//       screenWidth / 2 - this.winAmountContainer.width / 2 - 5;
//     this.winAmountFinalY = this.headerText.y + this.headerText.height;
//     this.winAmountContainer.y = this.winAmountFinalY;

//     // Leaderboard
//     this.leaderboard.x = padding;
//     this.leaderboardFinalY =
//       this.winAmountContainer.y + this.winAmountContainer.height + 100;
//     this.leaderboard.y = this.leaderboardFinalY;

//     // Action buttons
//     const buttonSpacing = 10;
//     const playAgainWidth = containerWidth * 0.78;
//     const backToLobbyWidth = containerWidth * 0.2;

//     this.playAgainButton.updateSize(playAgainWidth, 80);
//     this.backToLobbyButton.updateSize(backToLobbyWidth, 80);

//     this.playAgainButton.x = 0;
//     this.playAgainButton.y = 0;
//     this.backToLobbyButton.x = playAgainWidth + buttonSpacing;
//     this.backToLobbyButton.y = 0;

//     this.buttonContainer.x = padding;
//     this.buttonsFinalY = app.screen.height - this.buttonContainer.height - 50;
//     this.buttonContainer.y = this.buttonsFinalY;
//   }

//   private setupInitialState() {
//     // Hide individual elements initially and position them below their final positions
//     this.background.alpha = 0;

//     // Position elements below their final positions
//     this.headerText.y = this.headerFinalY + 50;
//     this.headerText.alpha = 0;

//     this.winAmountContainer.y = this.winAmountFinalY + 50;
//     this.winAmountContainer.alpha = 0;

//     this.leaderboard.y = this.leaderboardFinalY + 50;
//     this.leaderboard.alpha = 0;

//     this.buttonContainer.y = this.buttonsFinalY + 50;
//     this.buttonContainer.alpha = 0;
//   }

//   public animateIn() {
//     // Play result sound based on win/lose
//     if (this.currentWinAmount > 0) {
//       sfx.play("common/winning_the_game.wav");
//     } else {
//       sfx.play("common/losing_the_game.wav");
//     }

//     // Animate background fade in (keep as is)
//     gsap.to(this.background, {
//       alpha: 1,
//       duration: 0.3,
//       ease: "power2.out",
//     });

//     // Slide header in from below the screen to its final Y position
//     this.headerText.y = app.screen.height + 50;
//     gsap.to(this.headerText, {
//       y: this.headerFinalY,
//       alpha: 1,
//       duration: 0.5,
//       ease: "power2.out",
//     });

//     // Slide win amount container in from below the screen
//     this.winAmountContainer.y = app.screen.height + 50;
//     gsap.to(this.winAmountContainer, {
//       y: this.winAmountFinalY,
//       alpha: 1,
//       duration: 0.5,
//       ease: "power2.out",
//       onComplete: () => {
//         // Animate leaderboard after 0.1s delay, coming from bottom
//         this.leaderboard.y = app.screen.height + 50;
//         gsap.to(this.leaderboard, {
//           y: this.leaderboardFinalY,
//           alpha: 1,
//           duration: 0.5,
//           delay: 0.1,
//           ease: "power2.out",
//           onComplete: () => {
//             // Animate button container from bottom
//             this.buttonContainer.y = app.screen.height + 50;
//             gsap.to(this.buttonContainer, {
//               y: this.buttonsFinalY,
//               alpha: 1,
//               duration: 0.5,
//               ease: "power2.out",
//             });
//           },
//         });
//       },
//     });
//   }

//   private handlePlayAgainPress = async () => {
//     if (!this.onPlayAgainCallback) return;

//     try {
//       // Disable button to prevent rage tapping
//       this.playAgainButton.eventMode = "none";
//       this.playAgainButton.cursor = "default";

//       await this.onPlayAgainCallback();
//     } catch (error) {
//       Logger.error("Error in handlePlayAgainPress", error);
//     } finally {
//       // Re-enable button
//       this.playAgainButton.eventMode = "static";
//       this.playAgainButton.cursor = "pointer";
//     }
//   };

//   private handleBackToLobbyPress = () => {
//     if (!this.onBackToLobbyCallback) return;

//     try {
//       // Disable both buttons when leaving
//       this.playAgainButton.eventMode = "none";
//       this.backToLobbyButton.eventMode = "none";
//       this.playAgainButton.cursor = "default";
//       this.backToLobbyButton.cursor = "default";

//       this.onBackToLobbyCallback();
//     } catch (error) {
//       Logger.error("Error in handleBackToLobbyPress", error);
//     }
//   };

//   public updateLeaderboard(
//     players: ResultScreenPlayerData[],
//     ongoingMatchGameUserId?: string,
//   ) {
//     // Update header text based on whether match is still ongoing
//     if (ongoingMatchGameUserId !== undefined) {
//       this.headerText.text = "MATCH IN PROGRESS";
//       this.winAmountContainer.visible = false;
//     }
//     // Note: Don't set winAmountContainer.visible = true here
//     // Let updateHeaderAndWinAmount handle visibility based on actual winAmount

//     // Re-center header after text change
//     this.headerText.x = app.screen.width / 2 - this.headerText.width / 2;

//     // Convert ResultScreenPlayerData to Leaderboard format
//     const leaderboardPlayers: PlayerData[] = players.map((player) => ({
//       gameUserId: player.userId,
//       score: player.score,
//       rank: player.rank,
//       isTopper: player.isTopper,
//     }));

//     const extra: Record<string, PlayerExtraData> = {};

//     const playersData: StoreData["players"] = {};
//     players.forEach((player) => {
//       playersData[player.userId] = {
//         username: player.name,
//         profilePicture: player.avatarUrl,
//         fallbackImageUrl: player.fallbackImageUrl,
//         gameUserId: player.userId,
//         networkStatus: 0,
//         extraTurnTimeLeft: 0,
//         skipTurnCount: 0,
//         cardsColumns: [],
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         lobbyDetails: undefined as unknown as any,
//       };
//     });

//     // Use the current user from the leaderboard's stored currentUserId
//     const currentUserId =
//       players.find((p) => p.isUser)?.userId || players[0]?.userId;

//     this.leaderboard.updatePlayers({
//       leaderboardPlayers,
//       extra,
//       players: playersData,
//       currentUserId: currentUserId,
//       isDraftingPhase: false,
//     });
//   }

//   public resize() {
//     this.background.clear();
//     this.background.rect(0, 0, app.screen.width, app.screen.height);
//     this.background.fill({ color: 0x000000, alpha: 0.5 });

//     this.leaderboard.resize(app.screen.width, app.screen.height);
//     this.setLayout();
//   }

//   /**
//    * Start polling the leaderboard API to get live updates
//    * Automatically stops when all players complete and match status is COMPLETED
//    * @param pollingInterval Time between polls in milliseconds (default 3000ms)
//    */
//   public startPolling(pollingInterval: number = 3000) {
//     if (this.isPollingActive) {
//       return;
//     }

//     this.isPollingActive = true;
//     this.isFirstPoll = true;

//     // Fetch immediately
//     this.fetchLeaderboard();

//     // Then poll at interval
//     this.pollingInterval = setInterval(() => {
//       this.fetchLeaderboard();
//     }, pollingInterval);
//   }

//   public stopPolling() {
//     this.isPollingActive = false;
//     if (this.pollingInterval) {
//       clearInterval(this.pollingInterval);
//       this.pollingInterval = null;
//     }
//   }

//   private async fetchLeaderboard() {
//     try {
//       const response = await apiClient.getLeaderboard(this.matchId);

//       if (response.success && response.data?.leaderboard?.players) {
//         const leaderboardData = response.data.leaderboard;

//         // Update currency info if it changed
//         if (leaderboardData.currencyCode) {
//           this.currentCurrencyCode =
//             leaderboardData.currencyCode as CURRENCY_CODES;
//           const currencyMapping =
//             CURRENCY_UI_MAPPING[leaderboardData.currencyCode] || {};
//           this.currentCurrencyIcon = currencyMapping.icon;
//           this.currentCurrencySymbol = currencyMapping.symbol;
//         }

//         this.checkPlayerStatusesAndManagePolling(leaderboardData);
//       }
//     } catch (error) {
//       Logger.error("Failed to fetch leaderboard", error);
//     }
//   }

//   private checkPlayerStatusesAndManagePolling(leaderboardData: {
//     status: string;
//     players: Array<{
//       gameUserId: string;
//       username: string;
//       profilePicture: string;
//       score: number;
//       rank: number;
//       winAmount: number;
//       status: "PLAYING" | "COMPLETED";
//       isTie: boolean;
//     }>;
//     currencyCode: string;
//   }) {
//     let allPlayersCompleted = true;

//     for (const player of leaderboardData.players) {
//       if (player.status === "PLAYING") {
//         allPlayersCompleted = false;
//         break;
//       }
//     }

//     const isMatchCompleted =
//       allPlayersCompleted && leaderboardData.status === "COMPLETED";

//     // Find current user's data to get win amount
//     const currentUserData = leaderboardData.players.find(
//       (p) => p.gameUserId === this.currentUserId,
//     );
//     const winAmount = currentUserData?.winAmount || 0;

//     // Convert API players to ResultScreenPlayerData format
//     const players: ResultScreenPlayerData[] = leaderboardData.players.map(
//       (player) => ({
//         userId: player.gameUserId,
//         name: player.username,
//         score: player.score,
//         rank: player.rank,
//         isTopper: player.winAmount > 0,
//         avatarUrl: player.profilePicture,
//         fallbackImageUrl: "",
//         isUser: player.gameUserId === this.currentUserId,
//       }),
//     );

//     // Always update header, win amount, and leaderboard on every poll
//     const isOngoing = !isMatchCompleted;
//     this.updateHeaderAndWinAmount(winAmount, isOngoing);
//     this.updateLeaderboard(players, isOngoing ? "ongoing" : undefined);

//     // Stop polling when match is completed
//     if (isMatchCompleted) {
//       this.stopPolling();
//     }

//     // Mark first poll as done
//     if (this.isFirstPoll) {
//       this.isFirstPoll = false;
//     }
//   }

//   private updateHeaderAndWinAmount(winAmount: number, isOngoing: boolean) {
//     // Update header text and win amount based on match state and win amount
//     if (isOngoing) {
//       this.headerText.text = "MATCH IN PROGRESS";
//       this.winAmountContainer.visible = false;
//     } else if (winAmount > 0) {
//       // Player won with amount > 0
//       this.headerText.text = "YOU WIN! ";
//       this.winAmountContainer.visible = true;

//       // Update win amount
//       const formattedCurrency = formatCurrency(
//         winAmount,
//         this.currentCurrencyCode,
//         this.currentCurrencySymbol || "",
//         false,
//       );
//       this.winAmountText.text = formattedCurrency;

//       // Update currency display
//       this.currencyDisplay = new CurrencyDisplay({
//         icon: this.currentCurrencyIcon,
//         symbol: this.currentCurrencySymbol,
//         size: 40,
//         textStyle: {
//           fontSize: 32,
//           fill: 0xffffff,
//           fontFamily: "Inter",
//         },
//       });

//       // Recalculate layout for win amount container
//       this.winAmountContainer.removeChildren();
//       this.winAmountContainer.addChild(this.currencyDisplay);
//       this.winAmountContainer.addChild(this.winAmountText);

//       this.currencyDisplay.x = 0;
//       this.currencyDisplay.y = 0;
//       this.winAmountText.x = this.currencyDisplay.width + 10;
//       this.winAmountText.y =
//         this.currencyDisplay.height / 2 - this.winAmountText.height / 2;

//       this.winAmountContainer.x =
//         app.screen.width / 2 - this.winAmountContainer.width / 2 - 5;
//     } else {
//       // Match completed but no winnings (lost or tie with no prize)
//       this.headerText.text = "MATCH RESULT";
//       this.winAmountContainer.visible = false;
//     }

//     // Re-center header after text change
//     this.headerText.x = app.screen.width / 2 - this.headerText.width / 2;
//   }

//   public async hide() {
//     this.stopPolling();
//   }

//   public async show() {
//     this.animateIn();
//     this.startPolling(3000);
//   }
// }

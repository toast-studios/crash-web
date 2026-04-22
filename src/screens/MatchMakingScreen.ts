// import { Container, Sprite } from "pixi.js";
// import { app } from "../app";
// import { OpponentProfileBar } from "../ui/OpponentProfileBar";
// import { TiledBackground } from "../ui/TiledBackground";
// import { PlayerProfileBar } from "../ui/PlayerProfileBar";
// import { MatchmakingCounter } from "../ui/MatchmakingCounter";
// import { navigation } from "../utils/navigation";
// import { InfoPopup } from "../popups/InfoPopup";
// import { apiClient } from "../network/apis";
// import {
//   API_CONSTANTS,
//   CURRENT_PARTNER,
//   PARTNER_ID,
//   PARTNER_SPECIFIC_CONFIG,
// } from "../network/constants";
// import { Logger } from "../utils/logger";
// import { ClientEvent } from "../utils/clientEvent";
// import { PokerChip } from "../ui/PokerChip";
// import gsap from "gsap";
// import {
//   playLogoLottieAnimation,
//   hideLogoLottieAnimation,
// } from "../animations/lottie";
// import {
//   VIEW_MODE,
//   MATCH_MAKING_LOCKING_TIME_IN_SECONDS,
//   GAME_MODES,
// } from "../constants";
// import { Header } from "../ui/Header";
// import { CURRENCY_CODES, LOBBY_TYPE } from "../types";

// export interface MatchMakingScreenOptions {
//   remainingTime: number;
//   fromRematchModel: boolean;
//   playerProfilePicture: string;
//   playerFallbackImageUrl: string;
//   lobbyDetails: {
//     entryFee: number;
//     currencyCode: CURRENCY_CODES;
//     lobbyType: LOBBY_TYPE;
//     winAmount: number;
//     currencySymbol: string;
//     _id: string;
//   };
// }

// export class MatchMakingScreen extends Container {
//   public static assetBundles = ["common", "player-profile", "game"];
//   private background: TiledBackground;
//   public header: Header;
//   public pokerChip: PokerChip | null = null;
//   private matchMakingCounter: MatchmakingCounter;
//   // private cardGroupAnimation: LoadingCardAnimation

//   public opponentBar: OpponentProfileBar;
//   public playerBar: PlayerProfileBar;

//   private logo: Sprite;
//   public cardMachine: Sprite;
//   public aceAndJack: Sprite;
//   private viewMode = import.meta.env.VITE_VIEW_MODE;

//   private partnerLogo: Sprite | null = null;

//   private bindAppMessageListener: (event: Event) => void;
//   private remainingTimeTimer: NodeJS.Timeout | null = null;
//   private mmRemainingTime: number | null = null;
//   private skipHideAnimation: boolean = false;

//   constructor(screenOptions: MatchMakingScreenOptions) {
//     super();
//     this.background = new TiledBackground();
//     this.addChild(this.background);

//     this.matchMakingCounter = new MatchmakingCounter({
//       text: `${screenOptions.remainingTime}`,
//       background: this.background,
//       onTimeUpdateCallback: this.onTimeUpdateCallback.bind(this),
//     });

//     if (screenOptions.fromRematchModel) {
//       this.startRemainingTimeTimer(screenOptions.remainingTime);
//     }

//     this.addChild(this.matchMakingCounter);
//     // * no free win, show poker chip
//     if (CURRENT_PARTNER !== PARTNER_ID.fw) {
//       const value = screenOptions.lobbyDetails.entryFee;
//       this.pokerChip = new PokerChip({
//         currencySymbol: screenOptions.lobbyDetails?.currencySymbol,
//         isActive: true,
//         value: value,
//         currencyCode: screenOptions.lobbyDetails.currencyCode,
//       });

//       this.pokerChip.zIndex = 1000;
//       app.stage.sortableChildren = true;
//       this.addChild(this.pokerChip);
//     }

//     this.opponentBar = new OpponentProfileBar({
//       profilePictureUrl: "",
//       fallbackImageUrl: "",
//       animateOpponentProfilePicture: false,
//     });
//     this.addChild(this.opponentBar);

//     this.playerBar = new PlayerProfileBar({
//       profilePictureUrl: screenOptions.playerProfilePicture,
//       fallbackImageUrl: screenOptions.playerFallbackImageUrl,
//     });
//     this.addChild(this.playerBar);

//     this.logo = Sprite.from("logo");

//     this.logo.scale.set(0.5);
//     this.logo.anchor.set(0.5);
//     this.logo.alpha = 1;
//     if (CURRENT_PARTNER !== PARTNER_ID.em) {
//       this.addChild(this.logo);
//     }

//     this.cardMachine =
//       this.viewMode == VIEW_MODE.WEB_VIEW
//         ? Sprite.from("card-machine-web")
//         : Sprite.from("card-machine");
//     this.cardMachine.scale.set(0.3);
//     this.cardMachine.anchor.set(0.5);
//     this.addChild(this.cardMachine);

//     this.aceAndJack = Sprite.from("ace-and-jack");
//     if (CURRENT_PARTNER !== PARTNER_ID.bh) {
//       this.aceAndJack.scale.set(0.5);
//     }
//     this.addChild(this.aceAndJack);

//     if (
//       PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].typeOfPartnerLogoInMM === "png"
//     ) {
//       this.partnerLogo = Sprite.from("partner_logo");
//       this.partnerLogo.scale.set(0.5);
//       this.partnerLogo.anchor.set(0.5);
//       this.partnerLogo.alpha = 0; // Start hidden
//       this.addChild(this.partnerLogo);
//     }

//     this.header = new Header({
//       enableExitButton:
//         API_CONSTANTS.GAME_MODES !== GAME_MODES.PRACTICE
//           ? !PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].disableExitButtonInMM
//           : false,
//       onExitButtonPress: () => {
//         //@todo change this condition to isMetaFreeWin
//         if (CURRENT_PARTNER === PARTNER_ID.fw) {
//           ClientEvent.ShowQuitPopupModal();
//           return;
//         }
//         //original behaviour for non-freewin
//         navigation.presentPopup(InfoPopup, {
//           message: "Are you sure you want to go back to lobby?",
//           showLoader: false,
//           showOkButton: true,
//           onOkPress: this.handleQuitCall.bind(this),
//           showCancelButton: true,
//           onCancelPress: () => {
//             navigation.dismissPopup();
//           },
//           ...(CURRENT_PARTNER == PARTNER_ID.em && {
//             textColor: 0xfefff9,
//             backgroundColor: 0x121212,
//           }),
//         });
//       },
//       enablePartnerLogoButton:
//         this.viewMode == VIEW_MODE.WEB_VIEW
//           ? !PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].disablePartnerLogoInHeader
//           : false,
//       enableInboxButton: false,
//       enableSettingButton: false,
//     });
//     this.addChild(this.header);

//     // Initialize the bound listener once in the constructor
//     this.bindAppMessageListener = this.handleAppMessage.bind(this) as (
//       event: Event,
//     ) => Promise<void>;
//   }

//   private onTimeUpdateCallback(remainingTime: number) {
//     if (remainingTime <= MATCH_MAKING_LOCKING_TIME_IN_SECONDS) {
//       if (!this.header.exitButton?.interactive) {
//         this.header.hideExitButton();
//         navigation.dismissPopup();
//       }
//     }
//     this.mmRemainingTime = remainingTime;
//   }

//   private startRemainingTimeTimer(remainingTime: number) {
//     // Clear any existing timer first
//     this.clearRemainingTimeTimer();

//     this.remainingTimeTimer = setTimeout(() => {
//       apiClient.getActivePoolInfo().then((poolInfo) => {
//         const remainingTime = Math.max(
//           0,
//           Math.floor(
//             (new Date(Number(poolInfo.endTime)).getTime() -
//               new Date().getTime()) /
//               1000,
//           ),
//         );

//         this.removeChild(this.matchMakingCounter);
//         this.matchMakingCounter = new MatchmakingCounter({
//           text: `${remainingTime}`,
//           background: this.background,
//           onTimeUpdateCallback: this.onTimeUpdateCallback.bind(this),
//         });
//         this.matchMakingCounter.x =
//           app.screen.width / 2 - this.matchMakingCounter.width / 2;
//         this.matchMakingCounter.y =
//           app.screen.height / 2 - this.matchMakingCounter.height / 2;

//         this.addChild(this.matchMakingCounter);
//         this.matchMakingCounter.show();

//         this.startRemainingTimeTimer(remainingTime);
//       });
//     }, remainingTime * 1000);
//   }

//   private clearRemainingTimeTimer() {
//     if (this.remainingTimeTimer) {
//       clearTimeout(this.remainingTimeTimer);
//       this.remainingTimeTimer = null;
//     }
//   }

//   private handleQuitCall = async () => {
//     try {
//       if (
//         this.mmRemainingTime &&
//         this.mmRemainingTime <= MATCH_MAKING_LOCKING_TIME_IN_SECONDS
//       ) {
//         navigation.presentPopup(InfoPopup, {
//           message:
//             "Unable to proceed leave game, match making locking period is active",
//           showLoader: true,
//           showOkButton: true,
//           onOkPress: () => {
//             navigation.dismissPopup();
//           },
//         });
//         Logger.warn(
//           "Unable to proceed leave game, match making locking period is active",
//         );
//         return;
//       }

//       const leaveResponse = await apiClient.post(
//         `${API_CONSTANTS.BASE_URL}/game/de-register`,
//         {},
//       );
//       if (leaveResponse.status === 200) {
//         ClientEvent.CancelRegister();
//         if (
//           CURRENT_PARTNER === PARTNER_ID.fw ||
//           CURRENT_PARTNER === PARTNER_ID.bt
//         ) {
//           navigation.closeWebView();
//         } else {
//           this.skipHideAnimation = true;
//           navigation.goBackToLobby(true);
//         }
//       } else {
//         throw new Error("Failed to leave the game");
//       }
//     } catch (error) {
//       Logger.error("Error leaving the game", error);
//       navigation.presentPopup(InfoPopup, {
//         message: "Failed to leave the game, please try again",
//         showLoader: false,
//         showOkButton: true,
//         onOkPress: () => {
//           navigation.dismissPopup();
//         },
//       });
//     }
//   };

//   public showLogo() {
//     // Position logo at top right, respecting table boundaries
//     const tableRight =
//       this.background.gameTable.x + this.background.gameTable.width / 2;
//     const screenRight = app.screen.width;

//     const finalX =
//       this.background.gameTable.width >= app.screen.width
//         ? screenRight - 100 // Table wider than screen - use screen right
//         : Math.min(tableRight - 100, screenRight - 100); // Table narrower - don't exceed table right
//     const finalY = 70; // Fixed Y position at top
//     const initialScale = this.logo.scale.x;

//     // Only animate if shouldAnimateLogoInMM is true
//     if (PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].shouldAnimateLogoInMM) {
//       // Separate tweens for translation, scale, and opacity
//       gsap.to(this.logo, {
//         x: finalX,
//         y: finalY,
//         duration: 1,
//         ease: "power2.inOut",
//       });

//       gsap.to(this.logo.scale, {
//         x: initialScale * 0.5,
//         y: initialScale * 0.5,
//         duration: 1,
//         ease: "power2.inOut",
//       });

//       gsap.to(this.logo, {
//         alpha: 0.5,
//         duration: 1,
//         ease: "power2.inOut",
//         onComplete: () => {
//           if (
//             PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].typeOfPartnerLogoInMM ===
//             "lottie"
//           ) {
//             playLogoLottieAnimation();
//           } else if (
//             PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].typeOfPartnerLogoInMM ===
//             "png"
//           ) {
//             this.animatePartnerLogo();
//           }
//         },
//       });
//     }
//   }

//   public animatePartnerLogo() {
//     if (!this.partnerLogo) return;
//     gsap.to(this.partnerLogo, {
//       alpha: 1,
//       duration: 1,
//       ease: "power2.inOut",
//     });
//   }

//   public animatePokerChipToProfilePicture(animate: boolean = true) {
//     if (this.pokerChip) {
//       Logger.info("ANIMATE POKER CHIP TO PROFILE PICTURE", animate);
//       if (animate) {
//         if (this.viewMode == VIEW_MODE.WEB_VIEW) {
//           gsap.to(this.pokerChip, {
//             x: app.screen.width / 2 + this.playerBar.width - 190,
//             y: app.screen.height - 190,
//             duration: 1,
//             ease: "linear",
//           });
//         } else {
//           gsap.to(this.pokerChip, {
//             x: 50 + this.playerBar.width - this.pokerChip.width / 5,
//             y: this.playerBar.y + 20,
//             duration: 1,
//             ease: "linear",
//           });
//         }
//         gsap.to(this.pokerChip.scale, {
//           x: 0.4,
//           y: 0.4,
//           duration: 1,
//           ease: "linear",
//         });
//       } else {
//         if (this.viewMode == VIEW_MODE.WEB_VIEW) {
//           this.pokerChip.x = app.screen.width / 2 + this.playerBar.width - 190;
//           this.pokerChip.y = app.screen.height - 190;
//           this.pokerChip.scale.set(0.4);
//         } else {
//           this.pokerChip.x =
//             50 + this.playerBar.width - this.pokerChip.width / 4;
//           this.pokerChip.y = this.playerBar.y + 20;
//           this.pokerChip.scale.set(0.4);
//         }
//       }
//     }
//   }

//   /**
//    * Dynamically positions aceAndJack and cardMachine based on table width relative to screen width
//    * If table width < screen width: snap to table left/right
//    * If table width >= screen width: snap to screen left/right
//    */
//   private applyDynamicSnapping() {
//     const tableLeft =
//       this.background.gameTable.x - this.background.gameTable.width / 2;
//     const tableRight =
//       this.background.gameTable.x + this.background.gameTable.width / 2;
//     const screenLeft = 0;
//     const screenRight = app.screen.width;

//     if (this.background.gameTable.width >= app.screen.width) {
//       // Table is wider than or equal to screen - snap to screen edges
//       this.aceAndJack.x = screenLeft;
//       this.cardMachine.x = screenRight - this.cardMachine.width / 2;
//     } else {
//       // Table is narrower than screen - snap to table edges
//       this.aceAndJack.x = tableLeft;
//       this.cardMachine.x = tableRight - this.cardMachine.width / 2;
//     }
//   }

//   public resize(width: number, height: number) {
//     this.background.resize(width, height);

//     if (this.logo) {
//       this.logo.x = width / 2;
//       this.logo.y = height / 2 - this.logo.height / 2 - 150;
//     }

//     // Apply dynamic snapping for aceAndJack and cardMachine positioning
//     this.applyDynamicSnapping();

//     if (this.cardMachine) {
//       this.cardMachine.y = this.logo.y - 20;
//     }

//     if (this.aceAndJack) {
//       this.aceAndJack.y = this.logo.y - this.aceAndJack.height / 2 - 20;
//     }

//     // Position partner logo at center between aceAndJack and cardMachine
//     if (this.partnerLogo) {
//       this.partnerLogo.x = app.screen.width / 2;
//       this.partnerLogo.y = this.logo.y;
//     }

//     if (this.matchMakingCounter) {
//       this.matchMakingCounter.x =
//         app.screen.width / 2 - this.matchMakingCounter.width / 2;
//       this.matchMakingCounter.y =
//         app.screen.height / 2 - this.matchMakingCounter.height / 2;
//     }

//     if (this.pokerChip) {
//       this.pokerChip.x = app.screen.width / 2;
//       this.pokerChip.y =
//         this.matchMakingCounter.y +
//         this.matchMakingCounter.height +
//         this.pokerChip.height / 2 +
//         20;
//     }

//     if (this.playerBar) {
//       this.playerBar.x = app.screen.width / 2 - this.playerBar.width / 2;
//       this.playerBar.y = app.screen.height - this.playerBar.height - 50;
//     }
//     this.header.resize();
//   }

//   public async show() {
//     this.background.show();
//     this.opponentBar.show(false);
//     this.playerBar.show(false);

//     if (!PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].shouldAnimateLogoInMM) {
//       // For freewin, keep logo at initial position without animation
//       this.logo.x = app.screen.width / 2;
//       this.logo.y = app.screen.height / 2 - this.logo.height / 2 - 150;
//       this.logo.scale.set(0.5);
//       this.logo.alpha = 0.5;
//     } else if (this.matchMakingCounter.shouldAnimateLogo()) {
//       Logger.info("=====SHOW LOGO animation called=======");
//       this.showLogo();
//     } else {
//       // Set logo to final position without animation
//       const tableRight =
//         this.background.gameTable.x + this.background.gameTable.width / 2;
//       const screenRight = app.screen.width;

//       this.logo.x =
//         this.background.gameTable.width >= app.screen.width
//           ? screenRight - 100 // Table wider than screen - use screen right
//           : Math.min(tableRight - 100, screenRight - 100); // Table narrower - don't exceed table right
//       this.logo.y = 70; // Fixed Y position at top
//       this.logo.scale.set(0.25);
//       this.logo.alpha = 0.5;
//     }

//     this.matchMakingCounter.show();

//     if (this.pokerChip) {
//       this.pokerChip.visible = true;
//     }
//     this.addWebviewListeners();
//   }

//   public async hide() {
//     this.removeWebviewListeners();
//     this.background.animateToPlayPosition();
//     if (this.remainingTimeTimer) {
//       clearTimeout(this.remainingTimeTimer);
//     }

//     if (!this.skipHideAnimation) {
//       await new Promise((resolve) => setTimeout(resolve, 500));
//     }

//     this.opponentBar.hide(true);
//     this.playerBar.hide(true);
//     this.matchMakingCounter.hide();
//     if (this.pokerChip) {
//       this.pokerChip.visible = false;
//     }
//     this.hideLogo();
//     if (this.partnerLogo) {
//       this.partnerLogo.visible = false;
//     }
//   }

//   private handleAppMessage = async (event: MessageEvent) => {
//     if (event.data.type === "QUIT_GAME" || event.data.type === "GAME_LEAVE") {
//       Logger.info("QUIT_GAME or GAME_LEAVE called", event.data);
//       navigation.presentPopup(InfoPopup, {
//         showLoader: true,
//         message: "",
//       });
//       await this.handleQuitCall();
//       navigation.dismissPopup();
//     }
//   };

//   private addWebviewListeners() {
//     window.addEventListener("appMessage", this.bindAppMessageListener);
//     window.addEventListener("message", this.bindAppMessageListener);
//   }

//   private removeWebviewListeners() {
//     window.removeEventListener("appMessage", this.bindAppMessageListener);
//     window.removeEventListener("message", this.bindAppMessageListener);
//   }

//   public hideLogo() {
//     this.logo.visible = false;
//     hideLogoLottieAnimation();
//   }

//   public hideCardsAndAceAndJack() {
//     this.cardMachine.visible = false;
//     this.aceAndJack.visible = false;
//   }
//   public blur() {
//     this.playerBar.clearExpiringTimer();
//   }
// }

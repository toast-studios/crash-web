// import {
//   Container,
//   Sprite,
//   Text,
//   Graphics,
//   Texture,
//   FillGradient,
// } from "pixi.js";
// import { app } from "../app";
// import { ButtonContainer } from "@pixi/ui";
// import gsap from "gsap";
// import { navigation } from "../utils/navigation";

// import {
//   CURRENT_PARTNER,
//   PARTNER_ID,
//   PARTNER_SPECIFIC_CONFIG,
// } from "../network/constants";
// import { sfx } from "../utils/audio";
// import { CURRENCY_CODES } from "../types";
// import { registerInLobby } from "../screens/base";
// import { Lobby } from "../store/storeTypes";
// import { PokerChip } from "./PokerChip";
// export class RematchOverlay extends Container {
//   private background: Graphics;
//   private walletContainer: Container | null = null;
//   private pokerChip: PokerChip;
//   private buttonContainer: Container;
//   private winButton: ButtonContainer;
//   private winButtonBackground: Sprite;
//   private winButtonText: Text;
//   private exitButton: ButtonContainer | null = null;
//   private winButtonWhiteOverlay: Graphics | null = null;
//   private winAnimation: gsap.core.Tween | null = null;
//   private isAnimationPaused: boolean = false;
//   public viewMode = import.meta.env.VITE_VIEW_MODE;
//   private lobby: Lobby;
//   // private winAmount: number;

//   constructor({
//     currencySymbol,
//     lobby,
//     // winAmount,
//     entryFee,
//     currencyCode,
//   }: {
//     currencySymbol: string;
//     lobby: Lobby;
//     // winAmount: number;
//     entryFee: number;
//     currencyCode: CURRENCY_CODES;
//   }) {
//     super();
//     this.zIndex = 100;

//     this.lobby = lobby;
//     // this.winAmount = winAmount;
//     // Semi-transparent background
//     this.background = new Graphics();
//     this.background.rect(0, 0, app.screen.width, app.screen.height);
//     this.background.fill({ color: 0x000000, alpha: 0.7 });
//     this.addChild(this.background);

//     // Setup UI elements
//     this.setupWalletUI();

//     this.pokerChip = new PokerChip({
//       currencySymbol,
//       isActive: true,
//       value: entryFee,
//       currencyCode: currencyCode,
//     });

//     this.setupPokerChip();
//     // Set initial alpha to 0 for fade in
//     this.alpha = 0;

//     // Create button container
//     this.buttonContainer = new Container();
//     this.winButton = new ButtonContainer(this.buttonContainer);
//     this.winButton.x = app.screen.width / 2 - 60;

//     this.winButtonBackground = Sprite.from("golden-button-bg");

//     // Create text gradient
//     const textGradient = new FillGradient(0, 0, 0, 50);
//     const gradientColors =
//       PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].winButtonTextColor;
//     gradientColors.forEach(({ color, colorStop }) => {
//       textGradient.addColorStop(colorStop, color);
//     });

//     // Create button text
//     this.winButtonText = new Text({
//       text: "PLAY AGAIN",
//       style: {
//         fontFamily: "Inter",
//         fontSize: 32,
//         fill: textGradient,
//         fontWeight: "900",
//         align: "center",
//         dropShadow:
//           CURRENT_PARTNER === PARTNER_ID.em
//             ? undefined
//             : {
//                 color: "#E7C361",
//                 blur: 5,
//                 distance: 4,
//               },
//       },
//     });

//     this.setupCustomWinButton();
//     this.setupExitButton();
//   }

//   private setupWalletUI() {
//     if (
//       CURRENT_PARTNER === PARTNER_ID.kb ||
//       CURRENT_PARTNER === PARTNER_ID.gs ||
//       CURRENT_PARTNER === PARTNER_ID.bh ||
//       CURRENT_PARTNER === PARTNER_ID.bt ||
//       CURRENT_PARTNER === PARTNER_ID.st ||
//       CURRENT_PARTNER === PARTNER_ID.em ||
//       CURRENT_PARTNER === PARTNER_ID.ts ||
//       CURRENT_PARTNER === PARTNER_ID.sp
//     ) {
//       return;
//     }

//     this.walletContainer = new Container();

//     // Wallet background
//     const walletBg = Sprite.from("wallet-bn-bg");
//     walletBg.scale.set(0.5);

//     // Cash icon
//     const cashIcon = Sprite.from("cash-icon");
//     cashIcon.scale.set(0.5);
//     cashIcon.x = 10;
//     cashIcon.y = (walletBg.height - cashIcon.height) / 2;

//     // Divider
//     const divider = new Sprite(Texture.WHITE);
//     divider.width = 2;
//     divider.height = walletBg.height * 0.4;
//     divider.tint = 0x3d3d3d;
//     divider.x = cashIcon.x + cashIcon.width + 10;
//     divider.y = (walletBg.height - divider.height) / 2;

//     // Wallet amount text
//     const walletText = new Text({
//       text: "550",
//       style: {
//         fontFamily: "Inter",
//         fontSize: 22,
//         fill: 0xffffff,
//         fontWeight: "700",
//         fontStyle: "italic",
//       },
//     });
//     walletText.anchor.set(0.5);
//     walletText.x = divider.x + 30;
//     walletText.y = walletBg.height / 2;

//     // Add all elements to wallet container
//     this.walletContainer.addChild(walletBg, cashIcon, divider, walletText);
//     this.walletContainer.x =
//       app.screen.width / 2 - this.walletContainer.width / 2;
//     this.walletContainer.y = 30;

//     this.addChild(this.walletContainer);
//   }

//   private setupPokerChip() {
//     this.pokerChip.x = app.screen.width / 2;
//     this.pokerChip.y = app.screen.height / 2 + this.pokerChip.height / 2 + 80.5;
//     this.addChild(this.pokerChip);
//   }

//   private setupCustomWinButton() {
//     // Create button background
//     this.winButtonBackground.anchor.set(0.5);
//     this.winButtonBackground.width = 320;
//     this.winButtonBackground.height = 120;
//     this.buttonContainer.addChild(this.winButtonBackground);

//     this.winButtonText.anchor.set(0.5);
//     this.winButtonText.zIndex = 100;
//     this.winButtonText.y = -5;
//     this.buttonContainer.addChild(this.winButtonText);

//     // Create button container
//     this.winButton.y = app.screen.height - 120;

//     // Only create white overlay and mask if auto registration is enabled
//     if (PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].autoRegisterInRematchOverlay) {
//       // Create mask with same dimensions and border radius as the button
//       const buttonMask = new Graphics();
//       buttonMask.roundRect(
//         -this.winButtonBackground.width / 2 + 15,
//         -this.winButtonBackground.height / 2 + 8,
//         this.winButtonBackground.width - 35,
//         this.winButtonBackground.height - 30,
//         75,
//       );
//       buttonMask.fill({ color: 0xffffff });

//       // Create vertical gradient for the overlay
//       const overlayGradient = new FillGradient(
//         0,
//         0,
//         0,
//         this.winButtonBackground.height - 37,
//       );
//       if (CURRENT_PARTNER === PARTNER_ID.em) {
//         overlayGradient.addColorStop(0, 0x40ff40); // Light green at the top
//         overlayGradient.addColorStop(0.5, 0x00ff00); // Medium green in the middle
//         overlayGradient.addColorStop(1, 0x40ff40); // Light green at the bottom
//       } else {
//         overlayGradient.addColorStop(0, 0xddc597); // White at the top
//         overlayGradient.addColorStop(0.5, 0xffffff); // Light gray in the middle
//         overlayGradient.addColorStop(1, 0xddc597); // Slightly darker at the bottom
//       }

//       // Create white overlay
//       this.winButtonWhiteOverlay = new Graphics();
//       this.winButtonWhiteOverlay.roundRect(
//         0,
//         3,
//         this.winButtonBackground.width - 35,
//         this.winButtonBackground.height - 37,
//         75,
//       );
//       this.winButtonWhiteOverlay.fill(overlayGradient);
//       this.winButtonWhiteOverlay.alpha = 0.9;

//       // Position at the left side of the button initially
//       this.winButtonWhiteOverlay.x = -this.winButtonBackground.width / 2 + 15;
//       this.winButtonWhiteOverlay.y = -this.winButtonBackground.height / 2 + 8;
//       this.winButtonWhiteOverlay.zIndex = 1;

//       // Apply mask to the button
//       this.buttonContainer.mask = buttonMask;
//       this.buttonContainer.addChild(buttonMask);

//       // Add white overlay to the container
//       this.buttonContainer.addChild(this.winButtonWhiteOverlay);
//     }

//     // Handle win button press
//     this.winButton.onPress.connect(() => {
//       sfx.play("common/play_button_click.wav");

//       // Button press animation
//       gsap.to(this.winButtonBackground, {
//         width: this.winButtonBackground.width * 0.95,
//         height: this.winButtonBackground.height * 0.95,
//         duration: 0.1,
//         ease: "power2.out",
//         onComplete: () => {
//           // Reset animation
//           gsap.to(this.winButtonBackground, {
//             width: 320,
//             height: 120,
//             duration: 0.2,
//             ease: "elastic.out(1.5)",
//             onComplete: () => {
//               this.handleWinButtonPress();
//             },
//           });
//         },
//       });
//     });
//     this.addChild(this.winButton);
//   }

//   private startWinAnimation() {
//     // Only proceed if auto registration is enabled and white overlay exists
//     if (
//       !PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].autoRegisterInRematchOverlay ||
//       !this.winButtonWhiteOverlay
//     ) {
//       return;
//     }

//     // Clear any existing animation
//     if (this.winAnimation) {
//       this.winAnimation.kill();
//     }

//     // Reset the overlay position to the left side
//     this.winButtonWhiteOverlay.x = -this.winButtonBackground.width / 2 + 15;

//     this.winAnimation = gsap.to(this.winButtonWhiteOverlay, {
//       x: -this.winButtonBackground.width / 2 + 295, // Move to the right
//       duration: 20, //!FIXME Take from partnerconfig
//       ease: "linear",
//       onComplete: () => {
//         this.handleWinButtonPress();
//       },
//       paused: true, // Start paused
//     });

//     // Add visibility change listeners
//     document.addEventListener("visibilitychange", this.handleVisibilityChange);

//     // Start the animation
//     this.winAnimation?.play();
//   }

//   private handleVisibilityChange = () => {
//     if (!this.winAnimation) return;

//     if (document.hidden) {
//       // Page is hidden, pause the animation
//       this.winAnimation.pause();
//       this.isAnimationPaused = true;
//     } else {
//       // Page is visible again, resume if it was paused
//       if (this.isAnimationPaused) {
//         this.winAnimation.play();
//         this.isAnimationPaused = false;
//       }
//     }
//   };

//   private async handleWinButtonPress() {
//     // Play button press animation first
//     const originalWidth = this.winButtonBackground.width;
//     const originalHeight = this.winButtonBackground.height;

//     // Scale down animation
//     await gsap.to(this.winButtonBackground, {
//       width: originalWidth * 0.95,
//       height: originalHeight * 0.95,
//       duration: 0.2,
//       ease: "power2.out",
//     });

//     // Scale back up with elastic effect
//     await gsap.to(this.winButtonBackground, {
//       width: originalWidth,
//       height: originalHeight,
//       duration: 0.3,
//       ease: "elastic.out(1.5)",
//     });
//     await registerInLobby(this.lobby);
//   }

//   private setupExitButton() {
//     const buttonContainer = new Container();

//     // Exit icon
//     const exitIcon = Sprite.from("exit_cross_icon");
//     exitIcon.scale.set(0.5);
//     exitIcon.anchor.set(0.5);

//     buttonContainer.addChild(exitIcon);

//     // Create button container
//     this.exitButton = new ButtonContainer(buttonContainer);

//     // Handle exit button press
//     this.exitButton.onPress.connect(() => {
//       // Create a confirmation dialog directly within the RematchOverlay
//       const confirmationContainer = new Container();
//       confirmationContainer.zIndex = 200; // Higher than RematchOverlay's zIndex

//       // Semi-transparent background
//       const confirmBg = new Graphics();
//       confirmBg.rect(0, 0, app.screen.width, app.screen.height);
//       confirmBg.fill({ color: 0x000000, alpha: 0.7 });
//       confirmBg.interactive = true;
//       confirmationContainer.addChild(confirmBg);

//       // Message text
//       const messageText = new Text({
//         text: "Are you sure you want to go back to lobby?",
//         style: {
//           fontFamily: "Inter",
//           fontSize: 25,
//           fill: 0xffffff,
//           wordWrap: true,
//           wordWrapWidth: 350,
//           align: "center",
//         },
//       });
//       messageText.anchor.set(0.5);
//       messageText.x = app.screen.width / 2;
//       messageText.y = app.screen.height / 2 - 50;
//       confirmationContainer.addChild(messageText);

//       // OK Button using ButtonContainer
//       const okButtonContent = new Container();
//       const okButtonBg = Sprite.from("common-action-button-bg");
//       okButtonBg.width = 126;
//       okButtonBg.height = 56;
//       okButtonBg.anchor.set(0.5);

//       const okButtonLabel = new Text({
//         text: "OK",
//         style: {
//           fontFamily: "Inter",
//           fontSize: 18,
//           fill: CURRENT_PARTNER === PARTNER_ID.em ? 0xfefff9 : 0x000000,
//           fontWeight: "400",
//         },
//       });
//       okButtonLabel.anchor.set(0.5);

//       okButtonContent.addChild(okButtonBg);
//       okButtonContent.addChild(okButtonLabel);

//       const okButton = new ButtonContainer(okButtonContent);
//       okButton.x = app.screen.width / 2 + 70;
//       okButton.y = app.screen.height / 2 + 50;

//       // Cancel Button using ButtonContainer
//       const cancelButtonContent = new Container();
//       const cancelButtonBg = Sprite.from("common-action-button-bg");
//       cancelButtonBg.width = 126;
//       cancelButtonBg.height = 56;
//       cancelButtonBg.anchor.set(0.5);

//       const cancelButtonLabel = new Text({
//         text: "Cancel",
//         style: {
//           fontFamily: "Inter",
//           fontSize: 18,
//           fill: CURRENT_PARTNER === PARTNER_ID.em ? 0xfefff9 : 0x000000,
//         },
//       });
//       cancelButtonLabel.anchor.set(0.5);

//       cancelButtonContent.addChild(cancelButtonBg);
//       cancelButtonContent.addChild(cancelButtonLabel);

//       const cancelButton = new ButtonContainer(cancelButtonContent);
//       cancelButton.x = app.screen.width / 2 - 70;
//       cancelButton.y = app.screen.height / 2 + 50;

//       // Add buttons to container
//       confirmationContainer.addChild(okButton, cancelButton);

//       // Button handlers
//       okButton.onPress.connect(() => {
//         sfx.play("common/button-click.mp3");
//         this.hide();
//         this.removeChild(confirmationContainer);
//         navigation.dismissPopup();
//         if (CURRENT_PARTNER === PARTNER_ID.bt) {
//           navigation.closeWebView();
//         } else {
//           navigation.goBackToLobby(true);
//         }
//       });

//       cancelButton.onPress.connect(() => {
//         sfx.play("common/button-click.mp3");
//         this.removeChild(confirmationContainer);
//       });

//       // Add confirmation dialog to RematchOverlay
//       this.addChild(confirmationContainer);
//     });

//     // Position exit button to the right of win button
//     this.exitButton.x =
//       this.winButton.x + this.winButtonBackground.width / 2 + 60;
//     this.exitButton.y = app.screen.height - 130;
//     this.exitButton.width = 100;
//     this.exitButton.height = 100;
//     this.addChild(this.exitButton);
//   }

//   public async show(): Promise<void> {
//     gsap.to(this, {
//       alpha: 1,
//       duration: 0.5,
//       ease: "power2.out",
//       onComplete: () => {
//         // Only start win animation if auto registration is enabled
//         if (
//           PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].autoRegisterInRematchOverlay
//         ) {
//           this.startWinAnimation();
//         }
//       },
//     });
//   }

//   public async hide(): Promise<void> {
//     gsap.to(this, {
//       alpha: 0,
//       duration: 0.5,
//       ease: "power2.in",
//       onComplete: () => {
//         this.destroy();
//       },
//     });
//   }

//   public resize(width: number, height: number): void {
//     // Update background to fill the entire screen
//     this.background.width = width;
//     this.background.height = height;

//     this.pokerChip.x = width / 2;
//     this.pokerChip.y = height / 2 + this.pokerChip.height / 2 + 80.5;

//     this.winButton.x = width / 2 - 50;
//     this.winButton.y = height - 120;

//     if (this.exitButton) {
//       this.exitButton.x =
//         this.winButton.x + this.winButtonBackground.width / 2 + 50;
//       this.exitButton.y = height - 130;
//     }
//   }

//   public destroy() {
//     // Clean up visibility change listener
//     document.removeEventListener(
//       "visibilitychange",
//       this.handleVisibilityChange,
//     );

//     // Kill any running animation
//     if (this.winAnimation) {
//       this.winAnimation.kill();
//       this.winAnimation = null;
//     }

//     // Destroy Graphics objects
//     if (this.background) {
//       this.background.destroy();
//     }

//     if (this.winButtonWhiteOverlay) {
//       this.winButtonWhiteOverlay.destroy();
//     }

//     super.destroy();
//   }
// }

import { Container, Sprite, Text } from "pixi.js";
import { app } from "../app";
import { ProfilePicture } from "../ui/ProfilePicture";
import { navigation } from "../utils/navigation";
import { InfoPopup } from "../popups/InfoPopup";
import { apiClient } from "../network/apis";
import {
  API_CONSTANTS,
  CURRENT_PARTNER,
  PARTNER_ID,
} from "../network/constants";
import { Logger } from "../utils/logger";
import { ClientEvent } from "../utils/clientEvent";
import gsap from "gsap";
import CONSTANTS, { GAME_MODES } from "../constants";
import { FONT_WEIGHTS } from "../constants/typography";
import { sfx } from "../utils/audio";
import { socketManager } from "../network/SocketManager";
import { MatchFoundData, Opponents } from "../store/storeTypes";
import { Logo } from "../components/Logo";
import { RequeueButton } from "../components/RequeueButton";
import { ButtonContainer } from "@pixi/ui";
import { registerInLobby } from "./base";
import { Lobby } from "../utils/winButtonText";
import { TipsDisplay } from "../ui/TipsDisplay";

export interface NewMatchMakingScreenOptions {
  remainingTime: number;
  fromRematchModel: boolean;
  username: string;
  playerProfilePicture: string;
  playerFallbackImageUrl: string;
  lobbyDetails: Lobby;
  isPracticeMode?: boolean; // Explicitly indicate if this is practice/FTUE mode
}

type AnimationPhase = "notInit" | "phase1" | "phase2" | "phase3" | "phase4";
type MatchStatus = "match_found" | "match_not_found" | "searching";

const MM_LOCKING_TIME_SECONDS = 5; // Locking period to avoid de-register conflicts

export class MatchMakingScreen extends Container {
  public static assetBundles = ["common", "player-profile", "game"];

  private background: Sprite;
  private circleSize: number;

  private circleContainer: Container;
  private circleElementsContainer: Container;
  private rotatingContainer: Container;
  private avatarRotatingContainer: Container;
  private matchmakingCircle: Sprite;
  private matchmakingArc: Sprite;
  private rotatingAvatars: Sprite[] = [];

  private playerProfile: ProfilePicture;
  private playerTextContainer: Container;
  private playerUsernameText: Text;
  private playerYouText: Text;
  private opponentProfile: ProfilePicture | null = null;
  private remainingOpponents: ProfilePicture[] = [];
  private opponentAngles: WeakMap<ProfilePicture, number> = new WeakMap();

  private counterText: Text;
  private matchStartingText: Text;

  private bottomSheet: Sprite;
  private tipsDisplay: TipsDisplay | null = null;

  private hustleLogo: Logo;

  private vsContainer: Container;
  private vsBackground: Sprite;
  private vsText: Text;
  private closeButton: ButtonContainer;

  private requeueButton: RequeueButton | null = null;

  private animationPhase: AnimationPhase = "notInit";
  private matchStatus: MatchStatus = "searching";
  private rotationValue: number = 0;
  private initialTimer: number;
  private remainingTimeTimer: NodeJS.Timeout | null = null;
  private mmRemainingTime: number;
  private continueAnimation: boolean = true;
  private waitingForMatchResult: boolean = false;
  private isPracticeMode: boolean = false;

  constructor(private screenOptions: NewMatchMakingScreenOptions) {
    super();

    // Detect if this is practice/FTUE mode
    // Check both the game mode AND if explicitly passed in options
    this.isPracticeMode =
      screenOptions.isPracticeMode === true ||
      API_CONSTANTS.GAME_MODES === GAME_MODES.PRACTICE;

    this.initialTimer = screenOptions.remainingTime - 3;
    this.mmRemainingTime = this.initialTimer;

    this.circleSize = app.screen.width * 0.7;
    this.background = Sprite.from("tournament_game_background");
    // this.background = Sprite.from("background");
    this.addChild(this.background);

    this.hustleLogo = new Logo();
    this.addChild(this.hustleLogo);

    this.bottomSheet = Sprite.from("mm-profile-background");
    this.addChild(this.bottomSheet);

    this.tipsDisplay = new TipsDisplay({
      width: app.screen.width,
      y: 0,
    });
    this.addChild(this.tipsDisplay);

    this.vsContainer = new Container();
    this.addChild(this.vsContainer);

    this.vsBackground = Sprite.from("mm-vs-background");
    this.vsContainer.addChild(this.vsBackground);

    this.vsText = new Text({
      text: " VS ",
      style: {
        fill: "#FFFFFF",
        fontSize: 170,
        fontFamily: "Pridi",
        fontWeight: "600",
      },
    });
    this.vsText.alpha = 0;
    this.addChild(this.vsText);

    this.circleContainer = new Container();
    this.addChild(this.circleContainer);

    this.circleElementsContainer = new Container();
    this.circleContainer.addChild(this.circleElementsContainer);

    this.rotatingContainer = new Container();
    this.circleElementsContainer.addChild(this.rotatingContainer);

    this.matchmakingArc = Sprite.from("mm-ring-dashed");
    this.rotatingContainer.addChild(this.matchmakingArc);

    this.matchmakingCircle = Sprite.from("mm-ring-solid");
    this.circleElementsContainer.addChild(this.matchmakingCircle);

    this.avatarRotatingContainer = new Container();
    this.circleContainer.addChild(this.avatarRotatingContainer);

    const avatarPositions = [
      { x: -this.circleSize / 2 - 3, y: 0 }, // left
      { x: this.circleSize / 2 + 3, y: 0 }, // right
      { x: 0, y: -this.circleSize / 2 - 3 }, // top
      { x: 0, y: this.circleSize / 2 + 3 }, // bottom
    ];

    avatarPositions.forEach(() => {
      const avatar = Sprite.from("avatar");
      this.rotatingAvatars.push(avatar);
      this.avatarRotatingContainer.addChild(avatar);
    });

    this.matchStartingText = new Text({
      text:
        screenOptions.remainingTime < 4
          ? "Finalizing a match"
          : "Finding Match...",
      style: {
        fill: "#9ca3af",
        fontSize: 16,
        fontFamily: "Inter",
        fontWeight: FONT_WEIGHTS.REGULAR,
      },
    });
    this.circleContainer.addChild(this.matchStartingText);

    this.counterText = new Text({
      text: "",
      style: {
        fill: "#FFFFFF",
        fontSize: 48,
        fontFamily: "Pridi",
        fontWeight: "800",
      },
    });
    this.circleContainer.addChild(this.counterText);

    this.playerProfile = new ProfilePicture({
      imageUrl: screenOptions.playerProfilePicture,
      fallbackImageUrl: screenOptions.playerFallbackImageUrl,
      isOpponent: false,
      useWhiteBorder: false,
      size: 100,
    });
    this.addChild(this.playerProfile);

    this.playerTextContainer = new Container();
    this.addChild(this.playerTextContainer);

    const truncatedUsername =
      screenOptions.username.length > 11
        ? screenOptions.username.substring(0, 11) + "..."
        : screenOptions.username;

    this.playerUsernameText = new Text({
      text: truncatedUsername,
      style: {
        fill: "#FFFFFF",
        fontSize: 14,
        fontFamily: "Inter",
        fontWeight: FONT_WEIGHTS.REGULAR,
      },
    });
    this.playerTextContainer.addChild(this.playerUsernameText);

    this.playerYouText = new Text({
      text: " (You)",
      style: {
        fill: "#e9c46a",
        fontSize: 14,
        fontFamily: "Inter",
        fontWeight: FONT_WEIGHTS.BOLD,
      },
    });
    this.playerTextContainer.addChild(this.playerYouText);

    this.closeButton = new ButtonContainer(
      new Text({
        text: "×",
        style: {
          fill: "#FFFFFF",
          fontSize: 40,
          fontFamily: "Inter",
          fontWeight: FONT_WEIGHTS.BOLD,
        },
      }),
    );
    this.addChild(this.closeButton);

    // if (screenOptions.remainingTime > 0) {
    //   const flooredTime = Math.floor(screenOptions.remainingTime);
    //   this.initialTimer = flooredTime;
    // }

    this.setLayout();

    this.continueAnimation = true;
    this.startAnimationBasedOnTimer();

    // this.handleSocketMatchFound({
    //   gameUserId: "123",
    //   opponents: [
    //     {
    //       gameUserId: "456",
    //       username: "John Doe",
    //       profilePicture: "https://d29i2jg7pajoz0.cloudfront.net/avatars/8.png",
    //     },
    //     {
    //       gameUserId: "789",
    //       username: "Jane Doe",
    //       profilePicture: "https://d29i2jg7pajoz0.cloudfront.net/avatars/2.png",
    //     },
    //     {
    //       gameUserId: "101",
    //       username: "Jim Beam",
    //       profilePicture: "https://d29i2jg7pajoz0.cloudfront.net/avatars/3.png",
    //     },
    //     {
    //       gameUserId: "102",
    //       username: "Jim Beam",
    //       profilePicture: "https://d29i2jg7pajoz0.cloudfront.net/avatars/4.png",
    //     },
    //     {
    //       gameUserId: "103",
    //       username: "Jim Beam",
    //       profilePicture: "https://d29i2jg7pajoz0.cloudfront.net/avatars/5.png",
    //     },
    //     {
    //       gameUserId: "104",
    //       username: "Jim Beam",
    //       profilePicture: "https://d29i2jg7pajoz0.cloudfront.net/avatars/6.png",
    //     },
    //     {
    //       gameUserId: "105",
    //       username: "Jim Beam",
    //       profilePicture: "https://d29i2jg7pajoz0.cloudfront.net/avatars/7.png",
    //     },
    //     {
    //       gameUserId: "106",
    //       username: "Jim Beam",
    //       profilePicture: "https://d29i2jg7pajoz0.cloudfront.net/avatars/8.png",
    //     },
    //     {
    //       gameUserId: "107",
    //       username: "Jim Beam",
    //       profilePicture: "https://d29i2jg7pajoz0.cloudfront.net/avatars/5.png",
    //     },
    //   ],
    // });

    // this.handleSocketMatchNotFound();
  }

  private startAnimationBasedOnTimer() {
    if (this.initialTimer > 0 && this.initialTimer > MM_LOCKING_TIME_SECONDS) {
      this.setAnimationPhase("phase1");
      this.startCountdownTimer(this.initialTimer);
    } else if (
      this.initialTimer > 0 &&
      this.initialTimer <= MM_LOCKING_TIME_SECONDS
    ) {
      this.setAnimationPhase("phase2");
      this.startCountdownTimer(this.initialTimer);
    } else {
      this.setAnimationPhase("phase3");
    }
  }

  private setLayout() {
    const appWidth = app.screen.width;
    const appHeight = app.screen.height;

    this.background.width = appWidth;
    this.background.height = appHeight;

    this.hustleLogo.width /= 1.5;
    this.hustleLogo.height /= 1.5;
    this.hustleLogo.x = appWidth / 2 - this.hustleLogo.width / 2;
    this.hustleLogo.y = 40;

    this.circleContainer.x = appWidth / 2;
    this.circleContainer.y = appHeight / 2;
    if (this.animationPhase === "notInit") {
      this.circleContainer.scale.set(0);
    }

    this.matchmakingArc.anchor.set(0.5);
    // const arcScale = this.circleSize / this.matchmakingArc.texture.width;
    // this.matchmakingArc.scale.set(arcScale * 1.06);

    this.matchmakingCircle.anchor.set(0.5);
    // const circleScale =
    //     this.circleSize / this.matchmakingCircle.texture.width;
    // this.matchmakingCircle.scale.set(circleScale);

    const avatarPositions = [
      { x: -this.circleSize / 2 - 3, y: 0 }, // left
      { x: this.circleSize / 2 + 3, y: 0 }, // right
      { x: 0, y: -this.circleSize / 2 - 3 }, // top
      { x: 0, y: this.circleSize / 2 + 3 }, // bottom
    ];

    this.rotatingAvatars.forEach((avatar, index) => {
      avatar.anchor.set(0.5);
      avatar.width = 100;
      avatar.height = 100;
      avatar.x = avatarPositions[index].x;
      avatar.y = avatarPositions[index].y;
    });

    const profileCenterY = appHeight / 2 + (this.circleSize * 1.7) / 2;

    this.playerProfile.x = appWidth / 2 - 50; // Center horizontally
    this.playerProfile.y =
      this.animationPhase === "notInit" ? appHeight : profileCenterY - 50;

    this.bottomSheet.x = appWidth / 2 - this.bottomSheet.width / 2;
    this.bottomSheet.y =
      this.animationPhase === "notInit" ? appHeight : profileCenterY;

    if (this.tipsDisplay) {
      this.tipsDisplay.x = appWidth / 2 - this.tipsDisplay.width / 2;
      this.tipsDisplay.y = appHeight - 50;
    }

    this.matchStartingText.anchor.set(0.5);
    this.matchStartingText.y = -20;

    this.counterText.anchor.set(0.5);
    this.counterText.y = 20;

    this.playerUsernameText.x = 0;
    this.playerUsernameText.y = 0;

    this.playerYouText.x = this.playerUsernameText.width;
    this.playerYouText.y = 0;

    this.playerTextContainer.x =
      appWidth / 2 - this.playerTextContainer.width / 2;
    this.playerTextContainer.y = profileCenterY + 65;

    this.vsContainer.alpha = 0;
    this.vsBackground.x = appWidth / 2 - this.vsBackground.width / 2 + 35;
    this.vsBackground.y = -120;

    this.vsText.anchor.set(0.5);
    this.vsText.x = appWidth / 2;
    this.vsText.y = appHeight / 2;

    const closeText = this.closeButton.children[0] as Text;
    closeText.anchor.set(0.5);

    this.closeButton.x = appWidth - 40;
    this.closeButton.y = 60;
  }

  private onTimeUpdateCallback(remainingTime: number) {
    this.mmRemainingTime = remainingTime;

    if (remainingTime <= MM_LOCKING_TIME_SECONDS) {
      this.closeButton.alpha = 0.5;
    } else {
      this.closeButton.alpha = 1;
    }
  }

  private handleQuitCall = async () => {
    try {
      if (this.matchStatus === "match_not_found") {
        if (
          CURRENT_PARTNER === PARTNER_ID.fw ||
          CURRENT_PARTNER === PARTNER_ID.bt
        ) {
          navigation.closeWebView();
        } else {
          navigation.goBackToLobby(true);
        }

        return;
      }

      if (
        this.mmRemainingTime &&
        this.mmRemainingTime <= MM_LOCKING_TIME_SECONDS
      ) {
        navigation.presentPopup(InfoPopup, {
          message:
            "Unable to proceed leave game, match making locking period is active",
          showLoader: true,
          showOkButton: true,
          onOkPress: () => {
            navigation.dismissPopup();
          },
        });
        Logger.warn(
          "Unable to proceed leave game, match making locking period is active",
        );
        return;
      }

      const leaveResponse = await apiClient.post(
        `${API_CONSTANTS.BASE_URL}/game/de-register`,
        {},
      );
      if (leaveResponse.status === 200) {
        ClientEvent.CancelRegister();
        if (
          CURRENT_PARTNER === PARTNER_ID.fw ||
          CURRENT_PARTNER === PARTNER_ID.bt
        ) {
          navigation.closeWebView();
        } else {
          navigation.goBackToLobby(true);
        }
      } else {
        throw new Error("Failed to leave the game");
      }
    } catch (error) {
      Logger.error("Error leaving the game", error);
      navigation.presentPopup(InfoPopup, {
        message: "Failed to leave the game, please try again",
        showLoader: false,
        showOkButton: true,
        onOkPress: () => {
          navigation.dismissPopup();
        },
      });
    }
  };

  private startPhase1Animation() {
    const appWidth = app.screen.width;
    const appHeight = app.screen.height;

    const profileCenterY = appHeight / 2 + (this.circleSize * 1.7) / 2;

    this.playerProfile.x = appWidth / 2 - 50; // Center horizontally
    this.playerProfile.y = profileCenterY - 50;
    gsap.to(this.playerProfile, {
      y: profileCenterY - 50,
      duration: 0.8,
      delay: 0.5,
      ease: "expo.out",
    });
    gsap.to(this.bottomSheet, {
      y: profileCenterY,
      duration: 0.8,
      delay: 0.5,
      ease: "expo.out",
    });

    gsap.to(this.circleContainer.scale, {
      x: 1.2,
      y: 1.2,
      duration: 0.4,
      delay: 1.2,
      ease: "power2.out",
      onComplete: () => {
        gsap.to(this.circleContainer.scale, {
          x: 1,
          y: 1,
          duration: 0.2,
          ease: "power2.out",
        });
      },
    });

    gsap.to(this.closeButton, {
      alpha: 1,
      duration: 1,
      delay: 0.5,
    });

    setTimeout(() => {
      this.runPhase1Rotation();
    }, 1200);
  }

  private runPhase1Rotation() {
    if (this.animationPhase !== "phase1") return;

    const nextRotation = this.rotationValue + 90;

    this.rotatingAvatars.forEach((avatar) => {
      gsap.to(avatar, {
        rotation: -(nextRotation * Math.PI) / 180,
        duration: 1.5,
        ease: "power2.inOut",
      });
    });

    gsap.to(this.rotatingContainer, {
      rotation: (nextRotation * Math.PI) / 180,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => {
        this.rotationValue = (this.rotatingContainer.rotation * 180) / Math.PI;
      },
      onComplete: () => {
        this.rotationValue = nextRotation;
        this.checkContinuePhase1();
      },
    });

    gsap.to(this.avatarRotatingContainer, {
      rotation: (nextRotation * Math.PI) / 180,
      duration: 1.5,
      ease: "power2.inOut",
    });
  }

  private checkContinuePhase1() {
    if (this.animationPhase === "phase1") {
      this.runPhase1Rotation();
    } else if (this.animationPhase === "phase2") {
      this.startPhase2Animation();
    }
  }

  /*
   * Phase 2: Smooth Rotation Animation
   * Uses GSAP with cubic bezier easing to match the "Reanimated" feel
   */
  private startPhase2Animation() {
    const appHeight = app.screen.height;
    // hide bottom sheet
    gsap.to(this.bottomSheet, {
      y: appHeight + 300,
      duration: 0.5,
      ease: "expo.in",
    });

    if (this.animationPhase !== "phase2") return;

    const currentRotationDeg =
      (this.rotatingContainer.rotation * 180) / Math.PI;
    const nextRotationDeg = Math.ceil(currentRotationDeg / 90) * 90;

    // Determine available time similarly to user snippet
    // We use mmRemainingTime or initialTimer.
    // Default to ~4s if not available, just like the snippet logic
    const availableTime = Math.max(0.5, this.mmRemainingTime - 1);

    const speed = 200; // degrees per second
    const approxDegrees = availableTime * speed;

    // Ensure we do at least "approxDegrees" but land on a multiple of 90, plus extra turns if needed
    // The snippet logic: (Math.ceil(approxDegrees / 90) * 90) + ((initialTimerRef.current || 4) > 4 ? 180 : 0);
    const extra = this.initialTimer > 4 ? 180 : 0;
    const totalDegrees = Math.ceil(approxDegrees / 90) * 90 + extra;

    const finalRotationDeg = nextRotationDeg + totalDegrees + 90;
    const finalRotationRad = (finalRotationDeg * Math.PI) / 180;

    // Use a custom easing that mimics Easing.bezier(0.42, 0, 0.58, 1)
    // GSAP's CustomEase or just a similar standard ease.
    // "power2.inOut" is close, but "cubic-bezier(0.42, 0, 0.58, 1)" is basically "sine.inOut" or "power1.inOut" roughly.
    // Actually (0.42, 0, 0.58, 1) is very close to a standard ease-in-out.
    // Let's use CustomEase string format for GSAP or just a standard ease that looks smooth.
    // Since we don't have CustomEase plugin registered explicitly shown, we can use "power1.inOut" or string form.
    // GSAP supports "cubic-bezier(a,b,c,d)" string if the plugin is there, but standard eases are safer.
    // (0.42, 0, 0.58, 1) is almost linear in middle, smooth ends. "power2.inOut" is good match.

    const duration = availableTime + 0.5;

    // Animate the containers
    gsap.to(this.rotatingContainer, {
      rotation: finalRotationRad,
      duration: duration,
      ease: "power2.inOut",
      onUpdate: () => {
        // Keep updated rotation value in sync
        this.rotationValue = (this.rotatingContainer.rotation * 180) / Math.PI;
      },
    });

    gsap.to(this.avatarRotatingContainer, {
      rotation: finalRotationRad,
      duration: duration,
      ease: "power2.inOut",
      onUpdate: () => {
        // Counter-rotate avatars to keep them upright
        const currentRot = this.avatarRotatingContainer.rotation;
        this.rotatingAvatars.forEach((avatar) => {
          avatar.rotation = -currentRot;
        });
      },
      onComplete: () => {
        // Check if we need to proceed to next phase or hold
        // If match found/not found happened during animation, we might need to handle it.
        // The current logic in startCountdownTimer handles transition to phase 3 when timer hits 0.
        // But visually we are now at `finalRotationRad`.
      },
    });
  }

  /*
   * Phase 3: Transition to match result
   * Stops rotation at nearest cardinal point and zooms/fades based on match result
   */
  private startPhase3Animation() {
    // Calculate target rotation to align avatars properly
    // We want to align to the nearest cardinal position (0, 90, 180, 270 degrees)
    const currentRotation = this.avatarRotatingContainer.rotation;
    const quarterTurn = Math.PI / 2; // 90 degrees
    const normalizedRotation = currentRotation % (Math.PI * 2);
    const nearestCardinal =
      Math.round(normalizedRotation / quarterTurn) * quarterTurn;
    const targetRotation =
      currentRotation - normalizedRotation + nearestCardinal;

    // Check if phase 2 was the previous phase
    const wasPhase2Running = this.animationPhase === "phase2";

    // If coming from Phase 2, we need to smoothly stop/snap to the target cardinal rotation
    // Since Phase 2 is now a GSAP tween that might be in progress or just finished,
    // we kill it and tween to the target.
    if (wasPhase2Running) {
      gsap.killTweensOf(this.avatarRotatingContainer);
      gsap.killTweensOf(this.rotatingContainer);

      const stopDuration = 0.5;

      gsap.to(this.rotatingContainer, {
        rotation: targetRotation,
        duration: stopDuration,
        ease: "power2.out",
      });

      gsap.to(this.avatarRotatingContainer, {
        rotation: targetRotation,
        duration: stopDuration,
        ease: "power2.out",
        onUpdate: () => {
          const currentRot = this.avatarRotatingContainer.rotation;
          this.rotatingAvatars.forEach((avatar) => {
            avatar.rotation = -currentRot;
          });
        },
      });
    }

    // Account for stop rotation duration in delay
    // If wasPhase2Running, we animate to stop for 0.5s.
    const baseDelay = this.initialTimer && this.initialTimer > 3 ? 0.5 : 0.1;
    const delay = baseDelay + (wasPhase2Running ? 0.5 : 0);

    setTimeout(() => {
      gsap.to([this.hustleLogo, this.closeButton], {
        y: -200,
        duration: 0.5,
        ease: "expo.in",
      });

      // Scale circle based on match status
      // Zoom in for match found, scale down for match not found
      const targetScale = this.matchStatus === "match_not_found" ? 0.3 : 1.7;
      const scaleEase =
        this.matchStatus === "match_not_found" ? "expo.in" : "expo.out";
      gsap.to(this.circleContainer.scale, {
        x: targetScale,
        y: targetScale,
        alpha: this.matchStatus === "match_not_found" ? 0 : 1,
        duration: 1.5,
        ease: scaleEase,
      });

      // Fade out left, right, top avatars (indices 0, 1, 2)
      for (let i = 0; i < 3; i++) {
        gsap.to(this.rotatingAvatars[i], {
          alpha: 0,
          duration: 1,
          ease: "cubic.out",
        });
      }

      // Fade out bottom avatar (index 3) and fade in static player profile
      if (this.rotatingAvatars[3]) {
        gsap.to(this.rotatingAvatars[3], {
          alpha: 0,
          duration: 0.8,
          ease: "cubic.out",
        });
      }

      // Show opponent profile if match found
      if (this.matchStatus === "match_found" && this.opponentProfile) {
        // Step 1: Center opponent profile zoom out animation
        gsap.fromTo(
          this.opponentProfile.scale,
          {
            x: 0.3,
            y: 0.3,
          },
          {
            x: 1,
            y: 1,
            duration: 0.6,
            delay: 0.3,
            ease: "back.out(1.7)",
          },
        );
        gsap.to(this.opponentProfile, {
          alpha: 1,
          duration: 0.5,
          delay: 0.3,
          ease: "cubic.out",
        });

        // Step 2: Remaining opponents come from center and move to their positions
        if (this.remainingOpponents.length > 0) {
          const centerOpponentX = this.opponentProfile.x;
          const centerOpponentY = this.opponentProfile.y;

          // VARIANT 1: Clockwise animation (staggered)
          // const sortedProfiles = [...this.remainingOpponents].sort((a, b) => {
          //   const angleA = this.opponentAngles.get(a) || 0;
          //   const angleB = this.opponentAngles.get(b) || 0;
          //   return angleA - angleB;
          // });
          //
          // sortedProfiles.forEach((profile, index) => {
          //   const finalX = profile.x;
          //   const finalY = profile.y;
          //   const staggerDelay = 0.9 + index * 0.08;
          //
          //   gsap.fromTo(
          //     profile,
          //     {
          //       x: centerOpponentX,
          //       y: centerOpponentY,
          //       alpha: 0,
          //     },
          //     {
          //       x: finalX,
          //       y: finalY,
          //       alpha: 1,
          //       duration: 0.5,
          //       delay: staggerDelay,
          //       ease: "power2.out",
          //     },
          //   );
          //
          //   gsap.fromTo(
          //     profile.scale,
          //     {
          //       x: 0.2,
          //       y: 0.2,
          //     },
          //     {
          //       x: 1,
          //       y: 1,
          //       duration: 0.5,
          //       delay: staggerDelay,
          //       ease: "back.out(1.5)",
          //     },
          //   );
          // });

          // VARIANT 2: All opponents move simultaneously from center
          this.remainingOpponents.forEach((profile) => {
            const finalX = profile.x;
            const finalY = profile.y;

            gsap.fromTo(
              profile,
              {
                x: centerOpponentX,
                y: centerOpponentY,
                alpha: 0,
              },
              {
                x: finalX,
                y: finalY,
                alpha: 1,
                duration: 0.6,
                delay: 0.9,
                ease: "power2.out",
              },
            );

            gsap.fromTo(
              profile.scale,
              {
                x: 0.2,
                y: 0.2,
              },
              {
                x: 1,
                y: 1,
                duration: 0.6,
                delay: 0.9,
                ease: "back.out(1.5)",
              },
            );
          });
        }

        gsap.to(this.matchStartingText, {
          alpha: 0,
          duration: 0.4,
          delay: 0.3,
          ease: "cubic.out",
        });
      }

      // Navigate to phase 4 after animations complete
      setTimeout(() => {
        if (this.matchStatus !== "searching") {
          this.setAnimationPhase("phase4");
        }
      }, 1000);
    }, delay * 1000);
  }

  private startPhase4Animation() {
    // Zoom out the circles only (not avatars/profiles)
    gsap.to(this.circleElementsContainer.scale, {
      x: this.matchStatus === "match_not_found" ? 1 : 3,
      y: this.matchStatus === "match_not_found" ? 1 : 3,
      duration: 0.5,
      ease: "power2.in",
    });

    // Fade out circles
    gsap.to(this.circleElementsContainer, {
      alpha: 0,
      duration: 0.5,
      ease: "power2.in",
    });

    // // Show VS screen with zoom effect after circles zoom out
    setTimeout(() => {
      this.vsContainer.scale.set(9);
      gsap.to(this.vsContainer, {
        alpha: 1,
        duration: 0.6,
        ease: "expo.out",
      });
      gsap.to(this.vsContainer.scale, {
        x: 1,
        y: 1,
        duration: 0.6,
        ease: "expo.out",
      });

      this.vsText.alpha = 0;
      this.vsText.scale.set(2.5, 2.5); // Start with larger scale for punch effect
      gsap.to(this.vsText, {
        alpha: 1,
        duration: 0.15,
        ease: "power2.in",
      });
      gsap.to(this.vsText.scale, {
        x: 1.18,
        y: 1.18,
        duration: 0.23,
        ease: "expo.out",
        onComplete: () => {
          gsap.to(this.vsText.scale, {
            x: 1,
            y: 1,
            duration: 0.22,
            ease: "back.out(2.5)",
          });
        },
      });

      sfx.play("common/transition_to_gameplay_phase_.wav", {
        delay: 0.5,
      });

      // Screen shake effect
      const originalX = this.vsContainer.x;
      gsap
        .timeline({ delay: 0.3 })
        .to(this.vsContainer, { x: originalX + 25, duration: 0.05 })
        .to(this.vsContainer, { x: originalX - 25, duration: 0.05 })
        .to(this.vsContainer, { x: originalX + 30, duration: 0.05 })
        .to(this.vsContainer, { x: originalX - 30, duration: 0.05 })
        .to(this.vsContainer, { x: originalX + 20, duration: 0.05 })
        .to(this.vsContainer, { x: originalX, duration: 0.05 });
    }, 300);

    // Update VS text and close button visibility based on match status
    if (this.matchStatus === "match_not_found") {
      this.matchStartingText.alpha = 0;
      this.vsText.text = "Matchmaker Took \n a Coffee Break ☕";
      this.vsText.style.fontSize = 40;
      this.vsText.style.align = "center";

      // Hide player profile with animation
      gsap.to(this.playerProfile, {
        alpha: 0,
        scale: 0.5,
        duration: 0.5,
        ease: "power2.in",
      });

      gsap.to(this.playerYouText, {
        alpha: 0,
        duration: 0.3,
        ease: "power2.in",
      });

      // Keep close button visible for navigation back to lobby
      gsap.to(this.closeButton, {
        y: 60,
        duration: 0.3,
        delay: 0.9,
      });

      gsap.to(this.hustleLogo, {
        y: 40,
        duration: 0.3,
        delay: 0.9,
      });

      gsap.to([this.hustleLogo, this.closeButton], {
        alpha: 1,
        duration: 0.3,
        delay: 0.9,
      });

      // Show requeue button
      this.showRequeueButton();
    }
  }

  private showRequeueButton() {
    if (!this.requeueButton) {
      const buttonWidth = 340;

      this.requeueButton = new RequeueButton({
        width: buttonWidth,
        height: 80,
      });
      this.requeueButton.onPress.connect(this.handleRequeuePress.bind(this));

      this.requeueButton.x = (app.screen.width - buttonWidth) / 2;
      this.requeueButton.y = app.screen.height - 130;
      this.requeueButton.alpha = 0;

      this.addChild(this.requeueButton);

      // Animate button in
      gsap.to(this.requeueButton, {
        alpha: 1,
        duration: 0.5,
        delay: 1.2,
        ease: "back.out(1.7)",
      });
    }
  }

  private handleRequeuePress = async () => {
    Logger.info("Requeue button pressed");

    // Disable button to prevent multiple taps
    if (this.requeueButton) {
      this.requeueButton.alpha = 0.5;
      this.requeueButton.onPress.disconnect(this.handleRequeuePress.bind(this));
    }

    try {
      // Disable button to prevent rage tapping

      if (this.screenOptions.lobbyDetails) {
        await registerInLobby(this.screenOptions.lobbyDetails);
      } else {
        Logger.warn("No lobby details found on requeue");
        navigation.goBackToLobby(false);
      }
    } catch (error) {
      Logger.error("Error in handleRequeuePress", error);
    } finally {
      if (this.requeueButton) {
        this.requeueButton.alpha = 1;
        this.requeueButton.onPress.connect(this.handleRequeuePress.bind(this));
      }
    }
  };

  private setPhase1ValuesWithoutAnimation() {
    // Set circle scale to final value
    this.circleContainer.scale.set(1, 1);

    const appHeight = app.screen.height;
    const profileCenterY = appHeight / 2 + (this.circleSize * 1.7) / 2;

    // Set player profile and bottom sheet positions
    this.playerProfile.y = profileCenterY - 50;
    this.bottomSheet.y = profileCenterY;

    // Set close button visibility
    this.closeButton.alpha = 1;

    // Set rotation to a value that would have been reached in phase1
    // Phase1 rotates by 90 degrees each cycle, so we set it to a clean 90-degree position
    const initialRotation = 90;
    this.rotationValue = initialRotation;
    this.rotatingContainer.rotation = (initialRotation * Math.PI) / 180;
    this.avatarRotatingContainer.rotation = (initialRotation * Math.PI) / 180;

    // Set avatar rotations to match the container rotation
    this.rotatingAvatars.forEach((avatar) => {
      avatar.rotation = -(initialRotation * Math.PI) / 180;
    });
  }

  private setAnimationPhase(phase: AnimationPhase) {
    const oldAnimationPhase = this.animationPhase;
    this.animationPhase = phase;

    switch (phase) {
      case "phase1":
        this.startPhase1Animation();
        break;
      case "phase2":
        if (oldAnimationPhase === "notInit") {
          // If we're starting from notInit, set all phase1 values instantly
          this.setPhase1ValuesWithoutAnimation();
          this.startPhase2Animation();
        }
        break;
      case "phase3":
        this.startPhase3Animation();
        break;
      case "phase4":
        this.startPhase4Animation();
        break;
    }
  }

  // ========== TIMER MANAGEMENT ==========

  private startCountdownTimer(initialTime: number) {
    if (!initialTime) return;

    let countdown = initialTime;
    this.counterText.text = countdown.toString();

    // Start tips display at the beginning
    if (this.tipsDisplay && countdown > 4) {
      this.tipsDisplay.start();
    }

    const updateCountdown = () => {
      if (!this.continueAnimation) return;

      countdown -= 1;
      this.counterText.text = countdown > 0 ? countdown.toString() : "";
      this.onTimeUpdateCallback(countdown);

      if (countdown === 4) {
        this.matchStartingText.text = "Finalizing a match";
        this.setAnimationPhase("phase2");
        // Stop tips display when we reach 3 seconds
        if (this.tipsDisplay) {
          this.tipsDisplay.stop();
        }
      }

      if (countdown > 3) {
        sfx.play("common/countdown_timer.wav");
      } else if (countdown > 0) {
        sfx.play("common/3_sec_count.wav");
      }

      if (countdown === 0) {
        // Timer reached 0, but wait for match result before moving to phase 3
        this.waitingForMatchResult = true;
        this.matchStartingText.text = "Finalizing a match";

        // Check if we already have a match result
        if (this.matchStatus !== "searching") {
          this.setAnimationPhase("phase3");
        }
        // Otherwise, continue phase 2 rotation until match result arrives
      } else if (countdown > 0) {
        setTimeout(updateCountdown, 1000);
      }
    };

    // Start countdown after 1 second
    setTimeout(updateCountdown, 1000);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resize(width: number, _height: number) {
    // Recalculate circle size based on new width
    this.circleSize = width * 0.7;
    this.setLayout();
  }

  public async show() {
    const appHeight = app.screen.height;
    const profileCenterY = appHeight / 2 + (this.circleSize * 1.7) / 2;

    // Set initial off-screen positions
    gsap.set(this.playerProfile, {
      y: appHeight + 100,
      alpha: 0,
    });

    gsap.set(this.bottomSheet, {
      y: appHeight + 100,
      alpha: 0,
    });

    gsap.set(this.playerTextContainer, {
      y: appHeight + 100,
      alpha: 0,
    });

    if (this.tipsDisplay) {
      gsap.set(this.tipsDisplay, {
        y: appHeight + 50,
        alpha: 0,
      });
    }

    gsap.set(this.hustleLogo, {
      y: -100,
      alpha: 0,
    });

    gsap.set(this.closeButton, {
      alpha: 0,
    });

    // Animation timeline
    const timeline = gsap.timeline();

    // Step 1: Logo comes down from top
    timeline.to(
      this.hustleLogo,
      {
        y: 40,
        alpha: 1,
        duration: 0.6,
        ease: "back.out(1.5)",
      },
      0,
    );

    // Step 2: Profile bars and bottom sheet slide up from bottom
    timeline.to(
      this.playerProfile,
      {
        y: profileCenterY - 50,
        alpha: 1,
        duration: 0.7,
        ease: "back.out(1.5)",
      },
      0.2,
    );

    timeline.to(
      this.bottomSheet,
      {
        y: profileCenterY,
        alpha: 1,
        duration: 0.7,
        ease: "back.out(1.5)",
      },
      0.2,
    );

    timeline.to(
      this.playerTextContainer,
      {
        y: profileCenterY + 65,
        alpha: 1,
        duration: 0.7,
        ease: "back.out(1.5)",
      },
      0.3,
    );

    // Step 3: Tips display slides up
    if (this.tipsDisplay) {
      timeline.to(
        this.tipsDisplay,
        {
          y: appHeight - 50,
          alpha: 1,
          duration: 0.6,
          ease: "back.out(1.2)",
        },
        0.4,
      );
    }

    // Step 5: Close button fades in
    timeline.to(
      this.closeButton,
      {
        alpha: 1,
        duration: 0.5,
      },
      0.7,
    );

    // Wait for timeline to complete
    await timeline.then();

    this.addCloseButtonListener();
    this.addWebviewListeners();
  }

  private addCloseButtonListener() {
    this.closeButton.onPress.connect(this.handleQuitCall.bind(this));
  }

  private removeCloseButtonListener() {
    this.closeButton.onPress.disconnect(this.handleQuitCall.bind(this));
  }

  public async hide() {
    this.removeWebviewListeners();
    this.removeCloseButtonListener();

    this.continueAnimation = false;

    if (this.tipsDisplay) {
      this.tipsDisplay.stop();
    }

    // Kill all GSAP animations
    gsap.killTweensOf(this.bottomSheet);
    gsap.killTweensOf(this.circleContainer);
    gsap.killTweensOf(this.circleContainer.scale);
    gsap.killTweensOf(this.circleElementsContainer);
    gsap.killTweensOf(this.circleElementsContainer.scale);
    gsap.killTweensOf(this.rotatingContainer);
    gsap.killTweensOf(this.avatarRotatingContainer);
    gsap.killTweensOf(this.playerProfile);
    gsap.killTweensOf(this.playerYouText);
    gsap.killTweensOf(this.playerTextContainer);
    gsap.killTweensOf(this.hustleLogo);
    gsap.killTweensOf(this.matchStartingText);
    if (this.opponentProfile) {
      gsap.killTweensOf(this.opponentProfile);
      gsap.killTweensOf(this.opponentProfile.scale);
    }
    this.remainingOpponents.forEach((profile) => {
      gsap.killTweensOf(profile);
      gsap.killTweensOf(profile.scale);
    });
    gsap.killTweensOf(this.closeButton);
    gsap.killTweensOf(this.vsContainer);
    gsap.killTweensOf(this.vsContainer.scale);
    gsap.killTweensOf(this.vsText);
    gsap.killTweensOf(this.vsText.scale);
    gsap.killTweensOf(this);
    this.rotatingAvatars.forEach((avatar) => {
      gsap.killTweensOf(avatar);
    });
    if (this.requeueButton) {
      gsap.killTweensOf(this.requeueButton);
    }
    if (this.tipsDisplay) {
      gsap.killTweensOf(this.tipsDisplay);
      this.tipsDisplay.stop();
    }

    if (this.remainingTimeTimer) {
      clearTimeout(this.remainingTimeTimer);
    }
  }

  private handleAppMessage = async (event: MessageEvent) => {
    const { type } = event.data;

    // Handle quit game event
    if (type === "QUIT_GAME" || type === "GAME_LEAVE") {
      Logger.info("QUIT_GAME or GAME_LEAVE called", event.data);
      navigation.presentPopup(InfoPopup, {
        showLoader: true,
        message: "",
      });
      await this.handleQuitCall();
      navigation.dismissPopup();
    }
  };

  public handleSocketMatchFound(data: MatchFoundData) {
    Logger.info("Socket MATCH_FOUND", data);

    this.matchStatus = "match_found";

    // Filter out current player and get opponents
    const opponents = (data?.opponents || []).filter(
      (opponent) => opponent.gameUserId !== data.gameUserId,
    );

    // Check if it's 1v1 mode
    const isTournament =
      this.screenOptions.lobbyDetails.lobbyType?.toLowerCase() !== "tournament";

    // Create remaining opponents first (up to 9 more opponents)
    if (isTournament && opponents.length > 1) {
      const remainingOpponentData = opponents.slice(1, 10); // Max 9 additional opponents
      this.createRemainingOpponents(remainingOpponentData);
    }

    // Create main opponent profile last (first opponent) so it has highest z-index
    if (opponents.length > 0 && opponents[0]) {
      const opponent = opponents[0];

      if (!this.opponentProfile) {
        this.opponentProfile = new ProfilePicture({
          imageUrl: opponent.profilePicture || "",
          fallbackImageUrl: "",
          isOpponent: false,
          useWhiteBorder: false,
          size: 100,
        });

        // Position opponent profile at top (absolute position)
        const appWidth = app.screen.width;
        const appHeight = app.screen.height;
        const opponentCenterY = appHeight / 2 - (this.circleSize * 1.7) / 2;
        this.opponentProfile.x = appWidth / 2 - 50;
        this.opponentProfile.y = opponentCenterY - 50;
        this.opponentProfile.alpha = 0; // Hidden initially, revealed in phase 3

        // Add as last child to have highest z-index
        this.addChild(this.opponentProfile);
      }
    }

    // Transition based on current animation phase
    if (this.animationPhase === "phase1") {
      // If still in phase1, jump to phase3
      this.setAnimationPhase("phase3");
    } else if (this.waitingForMatchResult && this.animationPhase === "phase2") {
      // Transition to phase 3 if we're waiting for match result
      this.setAnimationPhase("phase3");
    } else if (this.animationPhase === "phase3") {
      this.setAnimationPhase("phase4");
    }
  }

  private createRemainingOpponents(opponents: Opponents) {
    // Configuration for opponent positions around the circle
    const opponentsConfig = [
      { angle: 255, size: 60, delay: 0, radiusOffset: 70, rotation: 15 },
      {
        angle: 285,
        size: 60,
        delay: 100,
        radiusOffset: 60,
        rotation: -10,
      },
      {
        angle: 247,
        size: 55,
        delay: 200,
        radiusOffset: -50,
        rotation: 0,
      },
      {
        angle: 295,
        size: 55,
        delay: 300,
        radiusOffset: -60,
        rotation: -10,
      },
      {
        angle: 230,
        size: 70,
        delay: 400,
        radiusOffset: 0,
        rotation: -15,
      },
      { angle: 310, size: 70, delay: 500, radiusOffset: 0, rotation: 15 },
      {
        angle: 242,
        size: 45,
        delay: 600,
        radiusOffset: 50,
        rotation: -5,
      },
      {
        angle: 275,
        size: 45,
        delay: 700,
        radiusOffset: 100,
        rotation: 25,
      },
      {
        angle: 260,
        size: 50,
        delay: 800,
        radiusOffset: -40,
        rotation: 10,
      },
    ];

    const appWidth = app.screen.width;
    const appHeight = app.screen.height;
    const radius = (this.circleSize * 1.7) / 2;
    const centerX = appWidth / 2;
    const centerY = appHeight / 2;

    opponents.forEach((opponent, index) => {
      if (index >= opponentsConfig.length) return;

      const config = opponentsConfig[index];
      const angleRad = (config.angle * Math.PI) / 180;
      const finalRadius = radius + config.radiusOffset;
      const x = centerX + finalRadius * Math.cos(angleRad) - config.size / 2;
      const y = centerY + finalRadius * Math.sin(angleRad) - config.size / 2;

      const profile = new ProfilePicture({
        imageUrl: opponent.profilePicture || "",
        fallbackImageUrl: "",
        isOpponent: false,
        useWhiteBorder: false,
        size: config.size,
      });

      profile.x = x;
      profile.y = y;
      profile.alpha = 0;
      profile.scale.set(0);
      profile.rotation = (config.rotation * Math.PI) / 180;

      // Store angle for clockwise animation ordering
      this.opponentAngles.set(profile, config.angle);

      this.addChild(profile);
      this.remainingOpponents.push(profile);

      // Animate in with delay during phase 3
      // setTimeout(() => {
      //     if (
      //         this.animationPhase === "phase3" ||
      //         this.animationPhase === "phase4"
      //     ) {
      //
      //     }
      // }, 800 + config.delay); // 800ms = time when main opponent animation starts - 500ms overlap
    });
  }

  private handleSocketMatchNotFound() {
    Logger.info("Socket MATCH_NOT_FOUND");

    this.matchStatus = "match_not_found";

    // Enable close button for navigation back to lobby
    // (bypassing de-register since match was not found)
    this.closeButton.alpha = 1;

    // Transition based on current animation phase
    if (this.animationPhase === "phase1") {
      // If still in phase1, jump to phase3
      this.setAnimationPhase("phase3");
    } else if (this.waitingForMatchResult && this.animationPhase === "phase2") {
      // Transition to phase 3 if we're waiting for match result
      this.setAnimationPhase("phase3");
    } else if (this.animationPhase === "phase3") {
      this.setAnimationPhase("phase4");
    }
  }

  private addWebviewListeners() {
    // Window message listeners (for app communication)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.addEventListener("appMessage", this.handleAppMessage);
    window.addEventListener("message", this.handleAppMessage);

    // Socket listeners (only for events that happen AFTER screen is shown)
    // Skip socket listeners in practice/FTUE mode
    if (!this.isPracticeMode) {
      socketManager.on(
        CONSTANTS.EVENTS.MATCH_FOUND,
        this.handleSocketMatchFound.bind(this),
      );
      socketManager.on(
        CONSTANTS.EVENTS.MATCH_NOT_FOUND,
        this.handleSocketMatchNotFound.bind(this),
      );
    }
  }

  private removeWebviewListeners() {
    // Window message listeners
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.removeEventListener("appMessage", this.handleAppMessage);
    window.removeEventListener("message", this.handleAppMessage);

    // Socket listeners - Skip in practice/FTUE mode since they were never added
    if (!this.isPracticeMode) {
      socketManager.off(CONSTANTS.EVENTS.MATCH_FOUND);
      socketManager.off(CONSTANTS.EVENTS.MATCH_NOT_FOUND);
    }
  }

  public blur() {
    // Placeholder for any blur logic needed
  }
}

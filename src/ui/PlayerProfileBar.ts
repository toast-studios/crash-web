import {
  Container,
  FillGradient,
  Graphics,
  Sprite,
  Texture,
  Text,
  NineSliceSprite,
} from "pixi.js";
import gsap from "gsap";
import { app } from "../app";
import { StoreData } from "../store/storeTypes";
import { ActionButton } from "./ActionButton";
import { actionButtonCoordinations } from "./Cards/CardPlacementHolder";
import { ProfilePicture } from "./ProfilePicture";
import { sfx } from "../utils/audio";
import { VIEW_MODE } from "../constants";
import { RadialProgressTimer } from "./RadialProgressTimer";
import { CURRENT_PARTNER, PARTNER_ID } from "../network/constants";

export class PlayerProfileBar extends Container {
  private timerProgressBar!: RadialProgressTimer;
  public playerProfilePicture: ProfilePicture;
  private actionButtonHolder: Container;
  private buttonContainer: Container;
  private buttonMask: Graphics | null = null;
  private shimmerOverlay: Sprite | null = null;
  private shimmerAnimation: gsap.core.Timeline | null = null;
  private shimmerTimeout: NodeJS.Timeout | null = null;
  private viewMode = import.meta.env.VITE_VIEW_MODE;
  public phaseOne: boolean = false;

  public hitActionButton: ActionButton;
  public standActionButton: ActionButton;

  private hitActionCallback: (() => void) | null = null;
  private standActionCallback: (() => void) | null = null;

  private ProfileBarPadding = 20;

  private expiring_timer: NodeJS.Timeout | null = null;
  private expiring_timer_active = false;
  private originalHitButtonY: number = 0;
  private originalStandButtonY: number = 0;
  private youText: Text;
  constructor({
    profilePictureUrl,
    fallbackImageUrl,
    turnInfo,
  }: {
    profilePictureUrl: string;
    fallbackImageUrl: string;
    turnInfo?: NonNullable<StoreData["turnInfo"]>["ownTurnInfo"];
  }) {
    super();

    // 1. Create Main Background (NineSliceSprite)
    const bgTexture = Texture.from("player_section_container_background");

    this.actionButtonHolder = new NineSliceSprite({
      texture: bgTexture,
      leftWidth: bgTexture.height / 2,
      topHeight: bgTexture.height / 2,
      rightWidth: bgTexture.height / 2,
      bottomHeight: bgTexture.height / 2,
      height: bgTexture.height / 2,
    });
    this.addChild(this.actionButtonHolder);

    this.timerProgressBar = new RadialProgressTimer({
      size: 55 + 8,
      value: 0,
    });
    this.addChild(this.timerProgressBar);

    this.playerProfilePicture = new ProfilePicture({
      imageUrl: profilePictureUrl,
      fallbackImageUrl,
      isOpponent: false,
      size: 55,
      borderOffset: 0,
    });
    this.addChild(this.playerProfilePicture);

    this.youText = new Text({
      text: "You",
      style: {
        fontFamily: "Pridi",
        fontSize: 16,
        fill: 0xffffff,
        fontWeight: "500",
      },
    });
    this.addChild(this.youText);

    // 3. Right Side: Action Buttons
    const hitTextGradient = new FillGradient(0, 0, 0, 30);
    if (CURRENT_PARTNER === PARTNER_ID.em) {
      hitTextGradient.addColorStop(1, 0xff7426);
    } else {
      hitTextGradient.addColorStop(0.13, 0xffffff);
      hitTextGradient.addColorStop(0.6, 0xe7e7e7);
      hitTextGradient.addColorStop(1, 0xbebebe);
    }

    this.hitActionButton = new ActionButton({
      text: "HIT",
      image: "hit-action-button",
      style: {
        fill: hitTextGradient,
        fontWeight: "500",
        dropShadow:
          CURRENT_PARTNER === PARTNER_ID.em
            ? undefined
            : {
                color: 0x000000,
                alpha: 0.6,
                distance: 2,
                blur: 2,
                angle: 0,
              },
      },
    });

    const standTextGradient = new FillGradient(0, 0, 0, 30);
    if (CURRENT_PARTNER === PARTNER_ID.em) {
      standTextGradient.addColorStop(1, 0x1a1c1e);
    } else {
      standTextGradient.addColorStop(0, 0xc096db);
      standTextGradient.addColorStop(0.57, 0x603b77);
      standTextGradient.addColorStop(1, 0x34253e);
    }

    this.standActionButton = new ActionButton({
      text: "STAND!",
      image: "stand-action-button",
      style: {
        fill: standTextGradient,
        dropShadow:
          CURRENT_PARTNER === PARTNER_ID.em
            ? undefined
            : {
                color: 0xffffff,
                alpha: 0.3,
                distance: 2,
                blur: 3,
                angle: 0,
              },
      },
    });

    // Create container for buttons and mask it
    this.buttonContainer = new Container();
    this.buttonContainer.addChild(this.hitActionButton);
    this.buttonContainer.addChild(this.standActionButton);

    const containerWidth = app.screen.width - 30;
    const containerHeight = 70;
    // Create Graphics mask for button container
    this.buttonMask = new Graphics();
    this.buttonMask.roundRect(0, 0, containerWidth, containerHeight, 0);
    this.buttonMask.fill(0xffffff);
    this.addChild(this.buttonMask);
    this.buttonContainer.mask = this.buttonMask;
    this.addChild(this.buttonContainer);

    // 4. Timer
    if (turnInfo) {
      this.timerProgressBar.progress = turnInfo
        ? (turnInfo.remainingTurnTime / turnInfo.turnTime) * 100
        : 100;
    }

    // Set up button callbacks
    this.hitActionButton.onPress.connect(() => {
      this.setButtonsVisible(false);
      //sfx.play("common/hit.wav");
      this.clearExpiringTimer();
      //  sfx.play("common/click_on_hit.wav",{delay:0.2});
      this.clearShimmerTimeout();
      this.hideButtonsAnimated();
      this.hitActionCallback?.();
    });

    this.standActionButton.onPress.connect(() => {
      this.setButtonsVisible(false);
      // sfx.play("common/stand.wav");
      this.clearExpiringTimer();
      sfx.play("common/click_on_stand.wav");
      this.clearShimmerTimeout();
      this.hideButtonsAnimated();
      this.standActionCallback?.();
    });

    // Initially hide action buttons
    this.hitActionButton.visible = false;
    this.hitActionButton.interactive = false;
    this.standActionButton.visible = false;
    this.standActionButton.interactive = false;

    this.initialize();
  }

  private startShimmerTimeout() {
    // Clear any existing timeout
    if (this.shimmerTimeout) {
      clearTimeout(this.shimmerTimeout);
    }
  }

  private clearShimmerTimeout() {
    if (this.shimmerTimeout) {
      clearTimeout(this.shimmerTimeout);
      this.shimmerTimeout = null;
    }
    this.stopShimmerAnimation();
  }

  public clearExpiringTimer() {
    if (this.expiring_timer) {
      clearTimeout(this.expiring_timer);
      this.expiring_timer = null;
      this.expiring_timer_active = false;
    }
  }

  public showShimmerAnimation() {
    return;
  }

  public stopShimmerAnimation() {
    if (this.shimmerAnimation) {
      this.shimmerAnimation.kill();
      this.shimmerAnimation = null;
    }

    if (this.shimmerOverlay) {
      this.shimmerOverlay.parent?.removeChild(this.shimmerOverlay);
      this.shimmerOverlay = null;
    }
  }

  public bindHitAction(callback: () => void) {
    this.hitActionCallback = callback;
  }

  public bindStandAction(callback: () => void) {
    this.standActionCallback = callback;
  }

  public initialize() {
    // Set Dimensions
    const containerWidth = app.screen.width - 30;
    const containerHeight = 70;

    this.actionButtonHolder.width = containerWidth;
    this.actionButtonHolder.height = containerHeight;

    // Update button mask to match container bounds
    if (this.buttonMask) {
      this.buttonMask.clear();
      this.buttonMask.roundRect(0, 0, containerWidth, containerHeight, 0);
      this.buttonMask.fill(0xffffff);
    }

    // Position Buttons (Right)
    const buttonY = containerHeight / 2 - this.hitActionButton.height / 2 - 2;
    const padding = 10;

    this.playerProfilePicture.x = 5;
    this.playerProfilePicture.y =
      this.actionButtonHolder.height / 2 -
      this.playerProfilePicture.height / 2 -
      2;

    this.youText.x = this.playerProfilePicture.width + 15;
    this.youText.y =
      this.actionButtonHolder.height / 2 - this.youText.height / 2 - 2;

    this.standActionButton.x =
      containerWidth - this.standActionButton.width - padding;
    this.standActionButton.y = buttonY;
    this.originalStandButtonY = buttonY;

    this.hitActionButton.x =
      this.standActionButton.x - this.hitActionButton.width - padding;
    this.hitActionButton.y = buttonY;
    this.originalHitButtonY = buttonY;

    // Position Timer
    this.timerProgressBar.x =
      this.playerProfilePicture.x + this.playerProfilePicture.width / 2;
    this.timerProgressBar.y =
      this.playerProfilePicture.y + this.playerProfilePicture.height / 2;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resize(__width: number, __height: number) {
    // Implement if needed
  }

  public async show(animated = false) {
    this.visible = true;
    if (animated) {
      gsap.killTweensOf(this);
      const originalY = this.y;
      this.y = app.screen.height;
      await gsap.to(this, {
        y: originalY,
        duration: 0.5,
        ease: "back.out(1.7)",
      });
    }
  }

  public async hide(animated = false) {
    this.clearShimmerTimeout();
    if (animated) {
      gsap.killTweensOf(this);
      await gsap.to(this, {
        y: app.screen.height,
        duration: 0.3,
        ease: "back.in",
      });
    } else {
      this.y = app.screen.height;
    }
    this.visible = false;
  }

  public setFinalLeftPosition() {
    if (this.viewMode == VIEW_MODE.WEB_VIEW) {
      this.x = app.screen.width / 2 - 175;
      this.y = app.screen.height - 215;
    } else {
      this.x = 30 + this.ProfileBarPadding;
      this.y = app.screen.height - this.height - 5;
    }
  }

  public startTimer(
    turnInfo: NonNullable<NonNullable<StoreData["turnInfo"]>["ownTurnInfo"]>,
  ) {
    if (this.timerProgressBar) {
      gsap.killTweensOf(this.timerProgressBar);
    }
    this.timerProgressBar.progress = turnInfo
      ? (turnInfo.remainingTurnTime / turnInfo.turnTime) * 100
      : 100;

    if (turnInfo.remainingTurnTime > 3) {
      this.clearExpiringTimer();
      this.expiring_timer_active = true;
      this.expiring_timer = setTimeout(
        () => {
          if (!this.expiring_timer_active) return;
          sfx.play("common/player_time_about_to_expire.wav");
        },
        (turnInfo.remainingTurnTime - 2.3) * 1000,
      );
    }

    this.timerProgressBar.extraTurnTimer = turnInfo.isExtraTurnTime;
    // Animate the progress from 100 to 0 over the remaining turn time
    gsap.to(this.timerProgressBar, {
      progress: 0,
      duration: turnInfo.remainingTurnTime,
      ease: "linear",
      onComplete: () => {
        this.stopTimer();
      },
    });

    if (!turnInfo.isExtraTurnTime)
      sfx.play("common/turn-start.wav", {
        delay: 0.2,
      });
  }

  public stopTimer() {
    this.clearExpiringTimer();
    if (this.timerProgressBar) {
      gsap.killTweensOf(this.timerProgressBar);
      this.timerProgressBar.progress = 0;
    }
  }

  public setButtonsVisible(visible: boolean) {
    if (visible) {
      // Use animated show if buttons are hidden
      if (!this.hitActionButton.visible || !this.standActionButton.visible) {
        this.showButtonsAnimated();
      }
    } else {
      this.hideButtonsAnimated();
    }
  }

  public hideButtonsAnimated() {
    // Kill any existing animations on the buttons
    gsap.killTweensOf(this.hitActionButton);
    gsap.killTweensOf(this.standActionButton);

    // Animate both buttons sliding down and fading out
    const slideDistance = 30;
    const animationDuration = 0.3;

    gsap.to(this.hitActionButton, {
      y: this.originalHitButtonY + slideDistance,
      alpha: 0,
      duration: animationDuration,
      ease: "power2.in",
      onComplete: () => {
        this.hitActionButton.visible = false;
        this.hitActionButton.interactive = false;
      },
    });

    gsap.to(this.standActionButton, {
      y: this.originalStandButtonY + slideDistance,
      alpha: 0,
      duration: animationDuration,
      ease: "power2.in",
      onComplete: () => {
        this.standActionButton.visible = false;
        this.standActionButton.interactive = false;
      },
    });
  }

  public showButtonsAnimated() {
    // Only show if buttons are currently hidden
    if (!this.hitActionButton.visible || !this.standActionButton.visible) {
      // Kill any existing animations on the buttons
      gsap.killTweensOf(this.hitActionButton);
      gsap.killTweensOf(this.standActionButton);

      // Set initial state (below and transparent)
      const slideDistance = 30;
      this.hitActionButton.y = this.originalHitButtonY + slideDistance;
      this.hitActionButton.alpha = 0;
      this.hitActionButton.visible = true;
      this.hitActionButton.interactive = true;

      this.standActionButton.y = this.originalStandButtonY + slideDistance;
      this.standActionButton.alpha = 0;
      this.standActionButton.visible = true;
      this.standActionButton.interactive = true;

      // Animate both buttons sliding up and fading in
      const animationDuration = 0.3;

      gsap.to(this.hitActionButton, {
        y: this.originalHitButtonY,
        alpha: 1,
        duration: animationDuration,
        ease: "power2.out",
        onComplete: () => {
          const hitGlobalPositions = this.hitActionButton.getGlobalPosition();
          actionButtonCoordinations.push({
            x: hitGlobalPositions.x + this.hitActionButton.width / 2,
            y: hitGlobalPositions.y,
            buttonId: "hit",
          });

          // Start shimmer timeout after buttons are visible
          this.startShimmerTimeout();
        },
      });

      gsap.to(this.standActionButton, {
        y: this.originalStandButtonY,
        alpha: 1,
        duration: animationDuration,
        ease: "power2.out",
        onComplete: () => {
          const standGlobalPositions =
            this.standActionButton.getGlobalPosition();
          actionButtonCoordinations.push({
            x: standGlobalPositions.x + this.standActionButton.width / 2,
            y: standGlobalPositions.y,
            buttonId: "stand",
          });
        },
      });
    }
  }

  public animateToLeft() {
    const targetX = 30 + this.ProfileBarPadding;

    if (this.viewMode == VIEW_MODE.WEB_VIEW) {
      gsap.to(this, {
        x: app.screen.width / 2 - 175,
        y: app.screen.height - 215,
        duration: 1,
        ease: "power2.out",
      });
    } else {
      gsap.to(this, {
        x: targetX,
        duration: 1,
        ease: "power2.out",
      });
    }
  }

  public destroy() {
    this.clearExpiringTimer();
    this.clearShimmerTimeout();
    super.destroy();
  }

  public setPhaseOneReference(): void {
    this.phaseOne = true;
  }
}

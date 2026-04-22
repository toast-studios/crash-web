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

export class TournamentPlayerProfileBar extends Container {
  private timerProgressBar!: RadialProgressTimer;
  public playerProfilePicture: ProfilePicture;
  private actionButtonHolder: Container;
  private buttonContainer: Container;
  private buttonMask: Graphics | null = null;
  private shimmerOverlay: Sprite | null = null;
  private shimmerAnimation: gsap.core.Timeline | null = null;
  private shimmerTimeout: NodeJS.Timeout | null = null;
  private viewMode = import.meta.env.VITE_VIEW_MODE;

  public hitActionButton: ActionButton;
  public standActionButton: ActionButton;

  private hitActionCallback: (() => void) | null = null;
  private standActionCallback: (() => void) | null = null;

  private ProfileBarPadding = 20;

  private expiring_timer: NodeJS.Timeout | null = null;
  private expiring_timer_active = false;
  private originalHitButtonY: number = 0;
  private originalStandButtonY: number = 0;
  private scoreText: Text;
  private scoreValueText: Text;
  private houseText: Text | null = null;
  private isOpponent: boolean;
  constructor({
    profilePictureUrl,
    fallbackImageUrl,
    turnInfo,
    isOpponent = false,
  }: {
    profilePictureUrl: string;
    fallbackImageUrl: string;
    turnInfo?: NonNullable<StoreData["turnInfo"]>["ownTurnInfo"];
    isOpponent?: boolean;
  }) {
    super();
    this.isOpponent = isOpponent;

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

    if (this.isOpponent) {
      this.houseText = new Text({
        text: "DEALER",
        style: {
          fontFamily: "Pridi",
          fontSize: 42,
          fill: 0xffffff,
          fontWeight: "700",
          letterSpacing: 4,
          align: "center",
          dropShadow: {
            color: 0x000000,
            alpha: 0.4,
            distance: 3,
            blur: 4,
            angle: Math.PI / 4,
          },
        },
      });
      this.houseText.alpha = 0.15;
      this.addChild(this.houseText);
    }

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

    this.scoreText = new Text({
      text: "Score",
      style: {
        fontFamily: "Pridi",
        fontSize: 14,
        fill: 0xaaaaaa,
        fontWeight: "400",
      },
    });
    this.scoreText.visible = !this.isOpponent;
    this.addChild(this.scoreText);

    this.scoreValueText = new Text({
      text: "0",
      style: {
        fontFamily: "Pridi",
        fontSize: 20,
        fill: 0xffffff,
        fontWeight: "600",
      },
    });
    this.scoreValueText.visible = !this.isOpponent;
    this.addChild(this.scoreValueText);

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

    this.buttonContainer = new Container();
    this.buttonContainer.addChild(this.hitActionButton);
    this.buttonContainer.addChild(this.standActionButton);

    const containerWidth = app.screen.width - 30;
    const containerHeight = 70;
    this.buttonMask = new Graphics();
    this.buttonMask.roundRect(0, 0, containerWidth, containerHeight, 0);
    this.buttonMask.fill(0xffffff);
    // Do NOT add buttonMask/buttonContainer to the scene here.
    // They are only attached when entering Phase Two via attachActionButtons().
    this.buttonContainer.mask = this.buttonMask;

    if (turnInfo) {
      this.timerProgressBar.progress = turnInfo
        ? (turnInfo.remainingTurnTime / turnInfo.turnTime) * 100
        : 100;
    }

    this.hitActionButton.onPress.connect(() => {
      // Immediately kill interactivity to prevent double-tap while the
      // action callback (hitAction) decides whether to gray-out or hide.
      this.hitActionButton.interactive = false;
      this.standActionButton.interactive = false;
      this.clearExpiringTimer();
      this.clearShimmerTimeout();
      this.hitActionCallback?.();
    });

    this.standActionButton.onPress.connect(() => {
      // Immediately kill interactivity to prevent double-tap while the
      // action callback (standAction) decides the visual state.
      this.hitActionButton.interactive = false;
      this.standActionButton.interactive = false;
      this.clearExpiringTimer();
      sfx.play("common/click_on_stand.wav");
      this.clearShimmerTimeout();
      this.standActionCallback?.();
    });

    this.hitActionButton.visible = false;
    this.hitActionButton.interactive = false;
    this.standActionButton.visible = false;
    this.standActionButton.interactive = false;

    this.initialize();
  }

  private startShimmerTimeout() {
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
    const containerWidth = app.screen.width - 30;
    const containerHeight = 70;

    this.actionButtonHolder.width = containerWidth;
    this.actionButtonHolder.height = containerHeight;

    if (this.buttonMask) {
      this.buttonMask.clear();
      this.buttonMask.roundRect(0, 0, containerWidth, containerHeight, 0);
      this.buttonMask.fill(0xffffff);
    }

    const buttonY = containerHeight / 2 - this.hitActionButton.height / 2 - 2;
    const padding = 10;

    this.playerProfilePicture.x = 5;
    this.playerProfilePicture.y =
      this.actionButtonHolder.height / 2 -
      this.playerProfilePicture.height / 2 -
      2;

    this.scoreText.x = this.playerProfilePicture.width + 15;
    this.scoreText.y =
      this.actionButtonHolder.height / 2 - this.scoreText.height / 2 - 12;

    this.scoreValueText.x = this.playerProfilePicture.width + 15;
    this.scoreValueText.y = this.scoreText.y + this.scoreText.height + 2;

    if (this.houseText) {
      this.houseText.x = containerWidth / 2 - this.houseText.width / 2 - 150;
      this.houseText.y =
        this.actionButtonHolder.height / 2 - this.houseText.height / 2 - 2;
    }

    this.standActionButton.x =
      containerWidth - this.standActionButton.width - padding;
    this.standActionButton.y = buttonY;
    this.originalStandButtonY = buttonY;

    this.hitActionButton.x =
      this.standActionButton.x - this.hitActionButton.width - padding;
    this.hitActionButton.y = buttonY;
    this.originalHitButtonY = buttonY;

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

  public updateScore(score: number, animated: boolean = true) {
    if (this.isOpponent) return;

    const newText = score.toString();

    if (animated && this.scoreValueText.text !== newText) {
      gsap.fromTo(
        this.scoreValueText,
        { scale: 1.2, alpha: 0.7 },
        { scale: 1, alpha: 1, duration: 0.3, ease: "back.out(1.7)" },
      );
    }

    this.scoreValueText.text = newText;
  }

  public setButtonsVisible(visible: boolean) {
    if (visible) {
      if (!this.hitActionButton.visible || !this.standActionButton.visible) {
        this.showButtonsAnimated(); // hidden → slide in
      } else {
        this.enableButtons(); // grayed → restore (defensive fallback)
      }
    } else {
      this.hideButtonsAnimated();
    }
  }

  /**
   * Instantly hide buttons without animation - use for Phase One initialization
   * to prevent flash of buttons
   */
  public hideButtonsInstantly() {
    gsap.killTweensOf(this.hitActionButton);
    gsap.killTweensOf(this.standActionButton);

    this.hitActionButton.visible = false;
    this.hitActionButton.interactive = false;
    this.hitActionButton.alpha = 0;

    this.standActionButton.visible = false;
    this.standActionButton.interactive = false;
    this.standActionButton.alpha = 0;
  }

  /**
   * Add buttonMask and buttonContainer to the scene graph.
   * Called when transitioning into Phase Two. Ensures buttons start in a
   * clean hidden state so showButtonsAnimated() drives the reveal.
   */
  public attachActionButtons(): void {
    if (this.buttonContainer.parent) return; // already in scene
    this.hideButtonsInstantly(); // reset any stale tween state before parenting
    this.addChild(this.buttonMask!);
    this.addChild(this.buttonContainer);
  }

  /**
   * Remove buttonMask and buttonContainer from the scene graph.
   * Called when entering (or staying in) Phase One so the buttons cannot
   * be rendered or accidentally made visible by any pending tweens.
   */
  public detachActionButtons(): void {
    gsap.killTweensOf(this.hitActionButton);
    gsap.killTweensOf(this.standActionButton);
    if (this.buttonContainer.parent) {
      this.removeChild(this.buttonContainer);
    }
    if (this.buttonMask?.parent) {
      this.removeChild(this.buttonMask);
    }
  }

  public hideButtonsAnimated() {
    this.hitActionButton.interactive = false;
    this.standActionButton.interactive = false;

    gsap.killTweensOf(this.hitActionButton);
    gsap.killTweensOf(this.standActionButton);

    const slideDistance = 30;
    const animationDuration = 0.3;

    gsap.to(this.hitActionButton, {
      y: this.originalHitButtonY + slideDistance,
      alpha: 0,
      duration: animationDuration,
      ease: "power2.in",
      onComplete: () => {
        this.hitActionButton.visible = false;
      },
    });

    gsap.to(this.standActionButton, {
      y: this.originalStandButtonY + slideDistance,
      alpha: 0,
      duration: animationDuration,
      ease: "power2.in",
      onComplete: () => {
        this.standActionButton.visible = false;
      },
    });
  }

  public setButtonsProcessing() {
    this.hitActionButton.interactive = false;
    this.standActionButton.interactive = false;

    gsap.killTweensOf(this.hitActionButton);
    gsap.killTweensOf(this.standActionButton);

    gsap.to(this.hitActionButton, { alpha: 0.4, duration: 0.15 });
    gsap.to(this.standActionButton, { alpha: 0.4, duration: 0.15 });
  }

  /**
   * Gray out buttons in-place without hiding them.
   * Used after a HIT action so buttons remain visible but non-interactive
   * while awaiting the server response. Unlike hideButtonsAnimated(), there
   * is no async "still-visible during tween" window that can conflict with
   * a fast enableButtons() call.
   */
  public disableButtons() {
    this.hitActionButton.interactive = false;
    this.standActionButton.interactive = false;
    gsap.killTweensOf(this.hitActionButton);
    gsap.killTweensOf(this.standActionButton);
    gsap.to(this.hitActionButton, { alpha: 0.4, duration: 0.15 });
    gsap.to(this.standActionButton, { alpha: 0.4, duration: 0.15 });
  }

  /**
   * Restore grayed-out buttons to full opacity and re-enable interaction.
   * Only acts when buttons are visible (grayed state); a no-op if hidden.
   * Used when the server confirms a HIT and the player can still act.
   */
  public enableButtons() {
    if (!this.hitActionButton.visible || !this.standActionButton.visible)
      return;
    gsap.killTweensOf(this.hitActionButton);
    gsap.killTweensOf(this.standActionButton);
    this.hitActionButton.interactive = true;
    this.standActionButton.interactive = true;
    gsap.to(this.hitActionButton, { alpha: 1, duration: 0.15 });
    gsap.to(this.standActionButton, { alpha: 1, duration: 0.15 });
  }

  public showButtonsAnimated() {
    if (!this.hitActionButton.visible || !this.standActionButton.visible) {
      gsap.killTweensOf(this.hitActionButton);
      gsap.killTweensOf(this.standActionButton);

      const slideDistance = 30;
      this.hitActionButton.y = this.originalHitButtonY + slideDistance;
      this.hitActionButton.alpha = 0;
      this.hitActionButton.visible = true;
      this.hitActionButton.interactive = true;

      this.standActionButton.y = this.originalStandButtonY + slideDistance;
      this.standActionButton.alpha = 0;
      this.standActionButton.visible = true;
      this.standActionButton.interactive = true;

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
}

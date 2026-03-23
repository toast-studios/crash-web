import { Container, NineSliceSprite, Texture } from "pixi.js";
import gsap from "gsap";
import { app } from "../app";
import { StoreData } from "../store/storeTypes";
import { ProfilePicture } from "./ProfilePicture";
import { sfx } from "../utils/audio";
import { RadialProgressTimer } from "./RadialProgressTimer";
import { CircleButton } from "./CircleButton";

export class OpponentProfileBar extends Container {
  private timerProgressBar: RadialProgressTimer;
  public opponentProfilePicture: ProfilePicture;
  private actionButtonHolder: NineSliceSprite;
  private buttonContainer: Container;
  private exitButton: CircleButton | null = null;
  private settingButton: CircleButton | null = null;
  private enableExitButton: boolean;
  private enableSettingButton: boolean;
  private expiring_timer: NodeJS.Timeout | null = null;

  constructor({
    profilePictureUrl,
    fallbackImageUrl,
    turnInfo,
    enableExitButton = false,
    onExitButtonPress,
    enableSettingButton = false,
    onSettingButtonPress,
  }: {
    profilePictureUrl: string;
    fallbackImageUrl: string;
    turnInfo?: NonNullable<StoreData["turnInfo"]>["opponentTurnInfo"];
    animateOpponentProfilePicture: boolean;
    enableExitButton?: boolean;
    onExitButtonPress?: () => void;
    enableSettingButton?: boolean;
    onSettingButtonPress?: () => void;
  }) {
    super();

    this.enableExitButton = enableExitButton;
    this.enableSettingButton = enableSettingButton;

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

    // 2. Create button container for left side
    this.buttonContainer = new Container();
    this.addChild(this.buttonContainer);

    // 3. Add exit button if enabled
    if (this.enableExitButton) {
      this.exitButton = new CircleButton({ iconName: "exit-icon" });
      if (onExitButtonPress) {
        this.exitButton.onPress.connect(onExitButtonPress);
      }
      this.buttonContainer.addChild(this.exitButton);
    }

    // 4. Add setting button if enabled
    if (this.enableSettingButton) {
      this.settingButton = new CircleButton({ iconName: "setting" });
      if (onSettingButtonPress) {
        this.settingButton.onPress.connect(onSettingButtonPress);
      }
      this.buttonContainer.addChild(this.settingButton);
    }

    this.timerProgressBar = new RadialProgressTimer({
      size: 55 + 8,
      value: 0,
    });

    this.addChild(this.timerProgressBar);

    this.opponentProfilePicture = new ProfilePicture({
      imageUrl: profilePictureUrl,
      fallbackImageUrl,
      size: 55,
      borderOffset: 0,
    });
    this.addChild(this.opponentProfilePicture);

    // 6. Timer
    if (turnInfo) {
      this.timerProgressBar.progress = turnInfo
        ? (turnInfo.remainingTurnTime / turnInfo.turnTime) * 100
        : 100;
    }

    this.initialize();
  }

  public initialize() {
    const containerWidth = app.screen.width - 30;
    const containerHeight = 70;

    this.actionButtonHolder.width = containerWidth;
    this.actionButtonHolder.height = containerHeight;

    // Position button container
    this.buttonContainer.y =
      containerHeight / 2 - this.buttonContainer.height / 2 - 2;

    // Position buttons on left side
    const padding = 5;
    let currentX = padding;

    // Position exit button first if enabled, otherwise position setting button first
    if (this.exitButton) {
      this.exitButton.x = currentX;
      currentX += this.exitButton.width + 10;
    }

    if (this.settingButton) {
      this.settingButton.x = currentX;
    }

    this.opponentProfilePicture.x =
      this.actionButtonHolder.width - this.opponentProfilePicture.width - 5;
    this.opponentProfilePicture.y =
      (containerHeight - this.opponentProfilePicture.height) / 2 - 2;

    // Position Timer
    this.timerProgressBar.x =
      this.opponentProfilePicture.x + this.opponentProfilePicture.width / 2;
    this.timerProgressBar.y =
      this.opponentProfilePicture.y + this.opponentProfilePicture.height / 2;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resize(__width: number, __height: number) {
    this.initialize();
  }

  public async show(animated = false) {
    this.visible = true;
    if (animated) {
      sfx.play("common/opponent_profile_pops.wav", { delay: 0.5 });
      gsap.killTweensOf(this);
      const originalY = this.y;
      this.y = -this.height;
      await gsap.to(this, {
        y: originalY,
        duration: 0.5,
        ease: "back.out(1.7)",
      });
    }
  }

  public async hide(animated = false) {
    if (animated) {
      gsap.killTweensOf(this);
      await gsap.to(this, {
        y: -this.height,
        duration: 0.3,
        ease: "back.in",
      });
    } else {
      this.y = -this.height;
    }
    this.visible = false;
  }

  public clearExpiringTimer() {
    if (this.expiring_timer) {
      clearTimeout(this.expiring_timer);
      this.expiring_timer = null;
    }
  }

  public startTimer(
    turnInfo: NonNullable<
      NonNullable<StoreData["turnInfo"]>["opponentTurnInfo"]
    >,
  ) {
    this.timerProgressBar.progress = turnInfo
      ? (turnInfo.remainingTurnTime / turnInfo.turnTime) * 100
      : 100;

    this.timerProgressBar.extraTurnTimer = turnInfo.isExtraTurnTime;

    gsap.to(this.timerProgressBar, {
      progress: 0,
      duration: turnInfo.remainingTurnTime,
      ease: "linear",
      onComplete: () => {
        this.stopTimer();
      },
    });
  }

  public stopTimer() {
    this.clearExpiringTimer();
    if (this.timerProgressBar) {
      gsap.killTweensOf(this.timerProgressBar);
      this.timerProgressBar.progress = 0;
    }
  }

  public showActionInfo() {
    // Implementation for action info if needed
  }

  public hideExitButton() {
    if (this.exitButton) {
      gsap.to(this.exitButton, {
        alpha: 0,
        duration: 0.3,
        ease: "power2.out",
        onComplete: () => {
          if (this.exitButton) {
            this.exitButton.visible = false;
          }
        },
      });
    }
  }

  public hideSettingButton() {
    if (this.settingButton) {
      gsap.to(this.settingButton, {
        alpha: 0,
        duration: 0.3,
        ease: "power2.out",
        onComplete: () => {
          if (this.settingButton) {
            this.settingButton.visible = false;
          }
        },
      });
    }
  }

  public destroy() {
    this.clearExpiringTimer();
    super.destroy();
  }
}

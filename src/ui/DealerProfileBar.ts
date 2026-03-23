import {
  Container,
  FillGradient,
  Graphics,
  NineSliceSprite,
  Sprite,
  Text,
  Texture,
} from "pixi.js";
import gsap from "gsap";
import { app } from "../app";
import { StoreData } from "../store/storeTypes";
import { sfx } from "../utils/audio";
import { RadialProgressTimer } from "./RadialProgressTimer";
import { CircleButton } from "./CircleButton";

/** Texture key for the hardcoded dealer avatar (dealer-pfp.png from common atlas). */
const DEALER_PFP_TEXTURE = "dealer-pfp";
const DEALER_PFP_SIZE = 55;

export class DealerProfileBar extends Container {
  private timerProgressBar: RadialProgressTimer;
  /** Container holding the circular dealer avatar (hardcoded sprite + border). */
  public dealerProfilePicture: Container;
  private actionButtonHolder: NineSliceSprite;
  private buttonContainer: Container;
  private exitButton: CircleButton | null = null;
  private settingButton: CircleButton | null = null;
  private enableExitButton: boolean;
  private enableSettingButton: boolean;
  private expiring_timer: NodeJS.Timeout | null = null;
  private houseRulesContainer: Container;

  constructor({
    turnInfo,
    enableExitButton = false,
    onExitButtonPress,
    enableSettingButton = false,
    onSettingButtonPress,
  }: {
    profilePictureUrl?: string;
    fallbackImageUrl?: string;
    turnInfo?: NonNullable<StoreData["turnInfo"]>["opponentTurnInfo"];
    animateOpponentProfilePicture?: boolean;
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

    // 2. Add house rules text in the center
    this.houseRulesContainer = this.createHouseRulesText();
    this.addChild(this.houseRulesContainer);

    // 3. Create button container for left side
    this.buttonContainer = new Container();
    this.addChild(this.buttonContainer);

    // 4. Add exit button if enabled
    if (this.enableExitButton) {
      this.exitButton = new CircleButton({ iconName: "exit-icon" });
      if (onExitButtonPress) {
        this.exitButton.onPress.connect(onExitButtonPress);
      }
      this.buttonContainer.addChild(this.exitButton);
    }

    // 5. Add setting button if enabled
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

    // Hardcoded dealer avatar from dealer-pfp.png (common atlas)
    this.dealerProfilePicture = this.createDealerAvatar();
    this.addChild(this.dealerProfilePicture);

    // 6. Timer
    if (turnInfo) {
      this.timerProgressBar.progress = turnInfo
        ? (turnInfo.remainingTurnTime / turnInfo.turnTime) * 100
        : 100;
    }

    this.initialize();
  }

  /** Builds the circular dealer avatar using the hardcoded dealer-pfp sprite. */
  private createDealerAvatar(): Container {
    const size = DEALER_PFP_SIZE;
    const container = new Container();

    const mask = new Graphics();
    mask.roundRect(0, 0, size, size, size / 2);
    mask.fill({ color: 0xffffff, alpha: 1 });

    const border = Sprite.from("border");
    border.width = size;
    border.height = size;
    container.addChild(border);
    container.addChild(mask);

    const sprite = Sprite.from(DEALER_PFP_TEXTURE);
    sprite.width = size;
    sprite.height = size;
    sprite.mask = mask;
    container.addChildAt(sprite, 0);

    return container;
  }

  /** Creates the house rules text display with two lines. */
  private createHouseRulesText(): Container {
    const container = new Container();

    const textGradient = new FillGradient(0, 0, 0, 30);
    textGradient.addColorStop(0, 0xffffff);
    textGradient.addColorStop(0.5, 0xeeeeee);
    textGradient.addColorStop(1, 0xcccccc);

    const lineOneText = new Text({
      text: "DEALER STANDS ON 17",
      style: {
        fontFamily: "Pridi",
        fontSize: 18,
        fill: textGradient,
        fontWeight: "700",
        align: "center",
        dropShadow: {
          color: 0x000000,
          alpha: 0.5,
          distance: 2,
          blur: 3,
          angle: Math.PI / 4,
        },
      },
    });
    lineOneText.alpha = 0.55;

    const lineTwoText = new Text({
      text: "DRAWS TO 16",
      style: {
        fontFamily: "Pridi",
        fontSize: 18,
        fill: textGradient,
        fontWeight: "600",
        align: "center",
        dropShadow: {
          color: 0x000000,
          alpha: 0.5,
          distance: 2,
          blur: 3,
          angle: Math.PI / 4,
        },
      },
    });
    lineTwoText.alpha = 0.55;
    lineTwoText.x = lineOneText.width / 2 - lineTwoText.width / 2 - 5;
    lineTwoText.y = lineOneText.height + 2;

    container.addChild(lineOneText);
    container.addChild(lineTwoText);

    return container;
  }

  public initialize() {
    const containerWidth = app.screen.width - 30;
    const containerHeight = 70;

    this.actionButtonHolder.width = containerWidth;
    this.actionButtonHolder.height = containerHeight;

    // Position house rules text in center
    this.houseRulesContainer.x =
      containerWidth / 2 -
      this.houseRulesContainer.width / 2 +
      (this.settingButton?.width ?? 0) / 2;
    this.houseRulesContainer.y =
      containerHeight / 2 - this.houseRulesContainer.height / 2 - 2;

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

    this.dealerProfilePicture.x =
      this.actionButtonHolder.width - this.dealerProfilePicture.width - 5;
    this.dealerProfilePicture.y =
      (containerHeight - this.dealerProfilePicture.height) / 2 - 2;

    // Position Timer
    this.timerProgressBar.x =
      this.dealerProfilePicture.x + this.dealerProfilePicture.width / 2;
    this.timerProgressBar.y =
      this.dealerProfilePicture.y + this.dealerProfilePicture.height / 2;
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

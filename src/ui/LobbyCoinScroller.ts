import { Container, Sprite, FederatedPointerEvent, Graphics } from "pixi.js";
import gsap from "gsap";
import { PokerChip } from "./PokerChip";
// import { formatNumberToShortScale } from "../utils/lobby";
import { sfx } from "../utils/audio";
import {
  LOCAL_STORAGE_KEYS,
  localStorageUtil,
} from "../utils/localStorageUtil";
import { CURRENT_PARTNER, PARTNER_ID } from "../network/constants";
import { Lobby } from "../utils/winButtonText";
import { formatCurrency } from "../utils/currency";

interface CoinData {
  lobbyData: Lobby;
  scale: number;
  isActive: boolean;
  chip: PokerChip;
}

export class LobbyCoinScroller extends Container {
  private coins: CoinData[] = [];
  private coinsContainer: Container;
  private background: Sprite;
  private maskContainer: Container;
  private isDragging: boolean = false;
  private startDragX: number = 0;
  private lastPointerX: number = 0;
  private activeIndex: number = -1;
  private COIN_SPACING: number;
  private isClick: boolean = true;

  private readonly ACTIVE_SCALE = 1.1;
  private readonly INACTIVE_SCALE = 0.7;
  private readonly TRANSITION_DURATION = 0.3;
  private readonly DRAG_THRESHOLD = 5;

  constructor(values: Lobby[], selectedLobby: Lobby | undefined) {
    super();

    let activeIndex = 0;
    if (selectedLobby) {
      const foundIndex = values.findIndex((v) => v._id === selectedLobby._id);
      if (foundIndex !== -1) {
        activeIndex = foundIndex;
      }
    }
    this.background = Sprite.from("game_action_button_holder");
    this.background.width = 300;
    this.background.height = 80;
    this.background.anchor.set(0.5);
    if (CURRENT_PARTNER !== PARTNER_ID.em) {
      this.addChild(this.background);
    }

    // Create mask container
    this.maskContainer = new Container();

    this.addChild(this.maskContainer);

    // Create a graphics mask matching background dimensions
    const mask = new Graphics();
    mask.roundRect(
      -this.background.width / 2 + 5,
      -this.background.height / 2 - 25,
      this.background.width - 10,
      this.background.height + 50,
      200,
    );
    mask.fill({ color: 0xffffff });

    this.maskContainer.mask = mask;
    this.maskContainer.addChild(mask);

    this.coinsContainer = new Container();
    this.coinsContainer.x = 0;
    this.coinsContainer.y = 0;
    this.maskContainer.addChild(this.coinsContainer);

    this.COIN_SPACING = 75;

    // Set initial container position to center the first coin
    this.coinsContainer.x = (this.COIN_SPACING * (values.length - 1)) / 2;

    values.forEach((value, index) => {
      const displayValue = formatCurrency(
        value.entryFee,
        value.currencyCode,
        value.currencySymbol,
        false,
      );
      const chip = new PokerChip({
        currencySymbol: value.currencySymbol,
        currencyCode: value.currencyCode,
        value: value.entryFee,
        displayValue,
        isActive: index === activeIndex,
      });

      chip.scale.set(
        index === activeIndex ? this.ACTIVE_SCALE : this.INACTIVE_SCALE,
      );

      chip.eventMode = "static";
      chip.cursor = "pointer";
      chip.on("pointerdown", (event: FederatedPointerEvent) =>
        this.onChipClick(event, index),
      );

      const coinData: CoinData = {
        lobbyData: value,
        scale: index === activeIndex ? this.ACTIVE_SCALE : this.INACTIVE_SCALE,
        isActive: index === activeIndex,
        chip,
      };

      this.coins.push(coinData);
      this.coinsContainer.addChild(chip);
    });

    this.activeIndex = activeIndex;
    this.updateActiveState(activeIndex);
    this.snapToClosest();
    this.setupInteraction();
  }

  private setupInteraction(): void {
    this.eventMode = "static";
    this.cursor = "pointer";

    this.on("pointerdown", this.onPointerDown);
    this.on("pointermove", this.onPointerMove);
    this.on("pointerup", this.onPointerUp);
    this.on("pointerupoutside", this.onPointerUp);
    this.on("pointercancel", this.onPointerUp);
  }

  private onPointerDown = (event: FederatedPointerEvent): void => {
    this.isDragging = true;
    this.isClick = true;
    this.startDragX = event.globalX;
    this.lastPointerX = event.globalX;

    gsap.killTweensOf(this.coinsContainer);
  };

  private onPointerMove = (event: FederatedPointerEvent): void => {
    if (!this.isDragging) return;

    const deltaX = event.globalX - this.lastPointerX;

    if (Math.abs(event.globalX - this.startDragX) > this.DRAG_THRESHOLD) {
      this.isClick = false;
      this.lastPointerX = event.globalX;
      this.coinsContainer.x += deltaX;

      // Calculate boundaries relative to center
      const totalWidth = this.COIN_SPACING * (this.coins.length - 1);
      const minX = -totalWidth / 2;
      const maxX = totalWidth / 2;

      // Clamp the container position
      this.coinsContainer.x = Math.min(
        maxX,
        Math.max(minX, this.coinsContainer.x),
      );

      this.updateActiveBasedOnPosition();
    }
  };

  private onPointerUp = (): void => {
    if (!this.isDragging) return;

    this.isDragging = false;

    if (!this.isClick) {
      this.snapToClosest();
    }
  };

  private updateActiveBasedOnPosition(): void {
    const centerX = 0;
    let minDistance = Infinity;
    let newActiveIndex = this.activeIndex;

    this.coins.forEach((coin, index) => {
      const coinGlobalX = this.coinsContainer.x + coin.chip.x;
      const distance = Math.abs(coinGlobalX - centerX);

      if (distance < minDistance) {
        minDistance = distance;
        newActiveIndex = index;
      }
    });

    if (newActiveIndex !== this.activeIndex) {
      this.updateActiveState(newActiveIndex);
    }
  }

  private updateActiveState(newActiveIndex: number): void {
    const currentActive = this.coins[this.activeIndex];
    if (!currentActive) {
      return;
    }
    gsap.to(currentActive.chip.scale, {
      x: this.INACTIVE_SCALE,
      y: this.INACTIVE_SCALE,
      duration: this.TRANSITION_DURATION,
      ease: "power2.out",
    });
    // Move current active chip up (inactive position)
    gsap.to(currentActive.chip, {
      y: 0,
      duration: this.TRANSITION_DURATION,
      ease: "power2.out",
    });
    currentActive.chip.setActive(false);
    currentActive.isActive = false;

    const newActive = this.coins[newActiveIndex];
    gsap.to(newActive.chip.scale, {
      x: this.ACTIVE_SCALE,
      y: this.ACTIVE_SCALE,
      duration: this.TRANSITION_DURATION,
      ease: "power2.out",
      onComplete: () => {
        // Recalculate and update positions after scale animation completes
        this.updateCoinPositions();
        this.snapToClosest();
      },
    });
    // Move new active chip to bottom (active position)
    gsap.to(newActive.chip, {
      y: -15,
      duration: this.TRANSITION_DURATION,
      ease: "power2.out",
    });
    newActive.chip.setActive(true);
    newActive.isActive = true;

    // Update text gradients for all coins
    this.coins.forEach((coin, index) => {
      coin.chip.updateTextGradient(index === newActiveIndex);
    });

    this.activeIndex = newActiveIndex;

    // Play sound when lobby amount is selected
    sfx.play("common/select_lobby_bet.mp3");

    this.emit("selection-changed", newActive.lobbyData);
  }

  private snapToClosest(): void {
    const centerX = 0;
    const activeChip = this.coins[this.activeIndex];
    if (!activeChip) {
      return;
    }
    const targetX = centerX - activeChip.chip.x;

    gsap.to(this.coinsContainer, {
      x: targetX,
      duration: this.TRANSITION_DURATION,
      ease: "power2.out",
    });
  }

  public getCurrentLobby(): Lobby {
    return this.coins[this.activeIndex].lobbyData;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resize(__width: number, __height: number): void {
    // this.COIN_SPACING = Math.min(
    //   this.background.width / (this.coins.length + 1),
    //   60
    // )
    this.updateCoinPositions();

    this.snapToClosest();

    // Update mask dimensions
    const mask = new Graphics()
      .rect(
        -this.background.width / 2 + 5,
        -this.background.height / 2 + 5,
        this.background.width - 10,
        this.background.height - 10,
      )
      .fill({ color: 0xffffff });

    this.maskContainer.mask = mask;
    this.maskContainer.addChild(mask);
  }

  updateCoinPositions(): void {
    // Recalculate spacing before updating positions
    this.coins.forEach((coin, index) => {
      coin.chip.x =
        index * this.COIN_SPACING -
        (this.COIN_SPACING * (this.coins.length - 1)) / 2;
    });
  }

  public destroy(): void {
    this.off("pointerdown", this.onPointerDown);
    this.off("pointermove", this.onPointerMove);
    this.off("pointerup", this.onPointerUp);
    this.off("pointerupoutside", this.onPointerUp);
    this.off("pointercancel", this.onPointerUp);

    gsap.killTweensOf(this.coinsContainer);
    this.coins.forEach((coin) => {
      gsap.killTweensOf(coin.chip.scale);
    });

    super.destroy();
  }

  private onChipClick = (event: FederatedPointerEvent, index: number): void => {
    if (!this.isClick) {
      return;
    }

    if (index === this.activeIndex) {
      return;
    }

    const centerX = 0;
    const clickedChip = this.coins[index].chip;
    const targetX = centerX - clickedChip.x;

    gsap.to(this.coinsContainer, {
      x: targetX,
      duration: this.TRANSITION_DURATION,
      ease: "power2.out",
      onComplete: () => {
        this.updateActiveState(index);
      },
    });

    event.stopPropagation();
  };

  public updateValues(values: Lobby[]): void {
    // Kill all ongoing animations before destroying chips
    gsap.killTweensOf(this.coinsContainer);

    // Clear existing coins
    this.coins.forEach((coinData) => {
      // Kill chip ongoing animations before destroying chips
      gsap.killTweensOf(coinData.chip);
      gsap.killTweensOf(coinData.chip.scale);
      this.coinsContainer.removeChild(coinData.chip);
      coinData.chip.destroy();
    });
    this.coins = [];

    // Find the active index based on stored preference
    const defaultLobbyId = localStorageUtil.getItem(
      LOCAL_STORAGE_KEYS.DEFAULT_COIN_LOBBY_ID,
    );
    let activeIndex = 0;
    if (defaultLobbyId) {
      const foundIndex = values.findIndex((v) => v._id === defaultLobbyId);
      if (foundIndex !== -1) {
        activeIndex = foundIndex;
      }
    }

    // Update container position for new values
    this.coinsContainer.x = (this.COIN_SPACING * (values.length - 1)) / 2;

    // Create new coins
    values.forEach((value, index) => {
      const chip = new PokerChip({
        currencySymbol: value.currencySymbol,
        currencyCode: value.currencyCode,
        value: value.entryFee,
        isActive: index === activeIndex,
      });

      chip.scale.set(
        index === activeIndex ? this.ACTIVE_SCALE : this.INACTIVE_SCALE,
      );
      chip.eventMode = "static";
      chip.cursor = "pointer";
      chip.on("pointerdown", (event: FederatedPointerEvent) =>
        this.onChipClick(event, index),
      );

      const coinData: CoinData = {
        lobbyData: value,
        scale: index === activeIndex ? this.ACTIVE_SCALE : this.INACTIVE_SCALE,
        isActive: index === activeIndex,
        chip,
      };

      this.coins.push(coinData);
      this.coinsContainer.addChild(chip);
    });

    this.activeIndex = activeIndex;
    this.updateActiveState(activeIndex);
    this.snapToClosest();
  }
}

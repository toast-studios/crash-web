import { Container, Sprite, Text, Ticker, type DestroyOptions } from "pixi.js";
import gsap from "gsap";
import { CRASH_EVENTS, CRASH_ACTIONS, GAME_MODES } from "../constants";
import {
  CRASH_ASSETS,
  CRASH_LAYOUT,
  CRASH_LOTTIE_PATHS,
  CRASH_LOTTIE_LAYOUT,
} from "../constants/crashLayout";

// Extend Performance interface for non-standard memory property (Chrome/Chromium only)
interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

declare global {
  interface Performance {
    memory?: MemoryInfo;
  }
}
import { socketManager } from "../network/SocketManager";
import {
  CrashGameSessionState,
  type GameTableInfoPayload,
  type GameStartPayload,
  type GameStateSyncPayload,
  type CrashPlayerActionPayload,
  type RoundOverPayload,
  type CrashActionAckResponse,
  type CrashGameResultPayload,
} from "../types/crashGame";
import { LOBBY_FORMAT, CURRENCY_CODES } from "../types";
import { Logger } from "../utils/logger";
import { sfx } from "../utils/audio";
import { SpaceBackground } from "../ui/SpaceBackground";
import { HeatProgressBar } from "../ui/crash/HeatProgressBar";
import { CrashActionButton } from "../ui/crash/CrashActionButton";
import { CrossButton } from "../ui/crash/CrossButton";
import { PlayerBox } from "../ui/crash/PlayerBox";
import { LottiePlayer } from "../ui/crash/LottiePlayer";
import { SurviveTimer } from "../ui/crash/SurviveTimer";
import { CrashFeed } from "../ui/crash/CrashFeed";
import { PlayerCountHeader } from "../ui/crash/PlayerCountHeader";
import { ActionBubbleEffect } from "../ui/crash/ActionBubbleEffect";
import { ShipSpeedLabel } from "../ui/crash/ShipSpeedLabel";
import { app } from "../app";
import { navigation } from "../utils/navigation";
import { getCurrentGameUserId } from "../network/eventListeners";
import { CrashResultScreen } from "./CrashResultScreen";
import { CRASH_TIMING } from "../constants/crashTiming";
import { InfoPopup } from "../popups/InfoPopup";
import { ClientEvent } from "../utils/clientEvent";
import { isMetaFreeWin, isFreeWin } from "../utils/game";
import {
  API_CONSTANTS,
  CURRENT_PARTNER,
  PARTNER_ID,
  PARTNER_SPECIFIC_CONFIG,
} from "../network/constants";
import { FONTS, FONT_WEIGHTS } from "../constants/typography";

/** Padding from screen edge for top-left logo and top-right cross button. */
const TOP_EDGE_PADDING = 10;

/** Critical siren audio path and volume settings */
const CRITICAL_AUDIO = {
  PATH: "common/critical_siren.mp3",
  VOLUME: 0.3,
} as const;

/** Critical haptic feedback configuration */
const CRITICAL_HAPTIC = {
  INTERVAL_MS: 500,
  MAX_DURATION_MS: 30000,
} as const;

const HEAT_SCROLL = {
  MAX_SPEED: 10,
  K: 3,
} as const;

const CRITICAL_SHAKE = {
  LOGO_INTENSITY: 3,
  LOGO_CYCLE_MS: 30,
  BG_INTENSITY: 1.5,
  BG_CYCLE_MS: 40,
  SETTLE_DURATION: 0.1,
} as const;

const SHIP_SPEED_LABEL_Y_OFFSET = -30;

const SPACESHIP_ANIMATION = {
  INIT_TO_TRAIL_DURATION_S: 1.5,
} as const;

enum CrashAction {
  COOL = "cool",
  BOOST = "boost",
  EXIT_SHIP = "exit_ship",
}

export interface CrashGameScreenOptions {
  matchId: string;
  gameUserId: string;
  isReconnection: boolean;
  gameConfig: GameTableInfoPayload["gameConfig"];
  players: GameTableInfoPayload["players"];
  gameStateSync?: GameStateSyncPayload;
}

/** Vertical gap between progress bar bottom and player box. */
const PROGRESS_BAR_TO_PLAYER_BOX_GAP = 8;
/** Height of the heat progress bar (matches HeatProgressBar bar height). */
const PROGRESS_BAR_HEIGHT = 30;

/**
 * Main crash game screen. Owns all screen-scoped socket listeners for the
 * running game phase: gameStateSync, playerAction, roundOver, gameError.
 *
 * Bottom area contains the dashboard: glow bg, heat progress bar, and action buttons.
 */
export class CrashGameScreen extends Container {
  public static assetBundles = ["common", "game"];

  private matchId: string;
  private state: CrashGameSessionState;
  private isReconnection: boolean;
  private animateShow: boolean;
  private isReady = false;
  private hasTriggeredBlast = false;
  private isAnimatingToTrail = false;
  private isCriticalBackgroundVisible = false;
  private criticalHapticIntervalId: number | null = null;
  private criticalHapticStartTime: number | null = null;

  private background: SpaceBackground;
  private criticalBackground: Sprite;
  private trail: Sprite;
  private crossButton: CrossButton;
  private logo: Sprite;
  private playerBox: PlayerBox;
  private dashboardContainer: Container;
  private glowBg: Sprite;
  private progressBar: HeatProgressBar;
  public coolButton: CrashActionButton;
  public cashoutButton: CrashActionButton;
  public heatButton: CrashActionButton;
  private surviveTimer: SurviveTimer;
  private playerCountHeader: PlayerCountHeader;
  private feed: CrashFeed;
  private bubbleEffect: ActionBubbleEffect;
  public spaceshipLottie: LottiePlayer;
  private shipSpeedLabel: ShipSpeedLabel;
  private tooLateLabel: Text | null = null;

  private logoShakeTl: gsap.core.Timeline | null = null;
  private bgShakeTl: gsap.core.Timeline | null = null;
  private logoBaseX = TOP_EDGE_PADDING;
  private logoBaseY = TOP_EDGE_PADDING;

  // --- Screen-scoped socket handler references (arrow functions for stable `this`) ---

  private readonly handleGameStateSync = (data: GameStateSyncPayload) => {
    if (this.destroyed) return;

    // Flicker prevention: if we're waiting on an exit verdict and the round
    // just ended, buffer the sync instead of showing the bust/blast visuals.
    // The buffered sync is applied once the ack resolves the exit.
    if (
      this.state.exitUxState === "exit_pending" &&
      data.phase === "roundOver"
    ) {
      this.state.pendingRoundOverSync = data;
      Logger.info(
        "[CrashGameScreen] Buffering roundOver sync — waiting for exit verdict",
      );
      return;
    }

    this.state.applyGameStateSync(data);
    this.syncScrollSpeed();
    this.syncShakeEffect();
    this.syncCriticalBackground();
    this.checkAndTriggerBlast();
    this.updateDisplay();
  };

  private readonly handlePlayerAction = (data: CrashPlayerActionPayload) => {
    if (this.destroyed || !this.isReady) return;

    if (data.action === CrashAction.COOL || data.action === CrashAction.BOOST) {
      const delta = this.state.computeHeatDelta(data.action);
      this.state.heatDeltaEvent = {
        delta,
        id: `${Date.now()}-${Math.random()}`,
      };
    }
  };

  private readonly handleRoundOver = (data: RoundOverPayload) => {
    if (this.destroyed) return;
    Logger.info("CrashGameScreen: roundOver", data);
    this.state.applyRoundOver(data);
    this.hideCriticalBackground();

    // Explicitly stop haptic loop on round over
    this.stopCriticalHapticLoop();

    // Stop background scrolling animation
    this.background.setScrollSpeed(0);

    this.shipSpeedLabel.visible = false;
    this.shipSpeedLabel.alpha = 0;
    gsap.killTweensOf(this.shipSpeedLabel);
    this.updateDisplay();

    // Disable cashout button on round over
    this.cashoutButton.setEnabled(false);
  };

  private readonly handleGameStart = (data: GameStartPayload) => {
    if (this.destroyed) return;
    Logger.info(
      "[CrashGameScreen] gameStart received — enabling gameplay",
      data,
    );
    this.state.applyGameStart(data);
    this.syncScrollSpeed();
    this.updateDisplay();
  };

  private readonly handleAppMessage = (event: MessageEvent) => {
    if (this.destroyed) return;
    const { type } = event.data;
    if (type === "QUIT_GAME" || type === "GAME_LEAVE") {
      Logger.info("CrashGameScreen: QUIT_GAME or GAME_LEAVE", event.data);
      this.executeLeaveGame();
    }
  };

  private readonly handleGameResultScreen = async (
    data: CrashGameResultPayload,
  ) => {
    if (this.destroyed) return;

    // Guard: Ignore result events for different matches
    if (data.matchId !== this.matchId) {
      Logger.warn(
        "CrashGameScreen: Ignoring GAME_RESULT_SCREEN for different matchId",
        { received: data.matchId, expected: this.matchId },
      );
      return;
    }

    Logger.info("CrashGameScreen: GAME_RESULT_SCREEN", data);

    this.cashoutButton.setEnabled(false);

    ClientEvent.GameStateChange({ gameState: "ResultScreen" });

    await new Promise<void>((resolve) =>
      setTimeout(resolve, CRASH_TIMING.ROUND_OVER_RESULT_DELAY_MS),
    );
    if (this.destroyed) return;

    await this.hideWithAnimation();
    if (this.destroyed) return;

    await this.showGameOverOverlay();
    if (this.destroyed) return;

    await new Promise<void>((resolve) =>
      setTimeout(resolve, CRASH_TIMING.GAME_OVER_HOLD_DURATION_MS),
    );
    if (this.destroyed) return;

    const myPlayerId = this.state.myPlayerId ?? "";
    const isWinner = data.winnerId === myPlayerId;
    const isLoser = data.looserId === myPlayerId;

    this.buildAndSendGameEndedEvent(data, myPlayerId, isWinner, isLoser);
    ClientEvent.GameClose();

    const onNextRound =
      isFreeWin() || CURRENT_PARTNER === PARTNER_ID.bt
        ? () => navigation.closeWebView()
        : () => navigation.goBackToLobby(true);

    if (API_CONSTANTS.GAME_MODES !== GAME_MODES.PLAYABLE) {
      Logger.info(
        "CrashGameScreen: skipping CrashResultScreen (non-playable mode)",
        { gameMode: API_CONSTANTS.GAME_MODES },
      );
      if (API_CONSTANTS.GAME_MODES === GAME_MODES.PRACTICE) {
        navigation.closeWebView();
      } else {
        onNextRound();
      }
      return;
    }

    try {
      await navigation.showScreen(CrashResultScreen, {
        matchId: data.matchId,
        yourRank: data.yourRank,
        yourPrize: data.yourPrize,
        yourSurvivalTime: data.yourSurvivalTime,
        players: data.players,
        myPlayerId,
        didWin: isWinner,
        onNextRound,
      });
    } catch (error) {
      Logger.error(
        "CrashGameScreen: error navigating to CrashResultScreen",
        error,
        data,
      );
    }
  };

  constructor(options: CrashGameScreenOptions) {
    super();

    this.matchId = options.matchId;
    this.isReconnection = options.isReconnection;
    this.animateShow = !options.isReconnection;

    this.state = new CrashGameSessionState();
    this.state.myPlayerId = getCurrentGameUserId();
    this.state.applyGameTableInfo(options);

    if (this.isReconnection && options.gameStateSync) {
      this.state.applyGameStateSync(options.gameStateSync);
      this.state.computeClockOffset(options.gameStateSync.serverTime);

      const myStatus = this.state.getMyPlayer()?.status;
      if (myStatus === "exited") {
        this.state.exitUxState = "exit_success";
      }
    }

    this.background = new SpaceBackground();
    this.addChild(this.background);

    this.criticalBackground = Sprite.from(CRASH_ASSETS.CRITICAL_BACKGROUND);
    this.criticalBackground.anchor.set(0.5);
    this.criticalBackground.alpha = 0;
    this.addChild(this.criticalBackground);

    this.trail = Sprite.from(CRASH_ASSETS.TRAIL);
    this.trail.anchor.set(0.5);
    this.trail.scale.set(0.5);
    this.trail.alpha = this.isReconnection ? 1 : 0;
    this.addChild(this.trail);

    this.crossButton = new CrossButton({
      textureAlias: CRASH_ASSETS.CROSS_BUTTON,
      onPress: () => this.handleCrossPress(),
    });
    this.crossButton.visible =
      !PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].disableExitButtonInGameScreen;
    this.addChild(this.crossButton);

    this.logo = Sprite.from(CRASH_ASSETS.CRASH_WARS_LOGO);
    this.logo.anchor.set(0, 0);
    this.logo.scale.set(0.15);
    this.addChild(this.logo);

    this.playerCountHeader = new PlayerCountHeader();
    this.addChild(this.playerCountHeader);

    this.feed = new CrashFeed();
    this.addChild(this.feed);

    this.playerBox = new PlayerBox({ aliveNo: 0, dippedNo: 0 });

    this.dashboardContainer = new Container();
    this.glowBg = Sprite.from(CRASH_ASSETS.DASHBOARD_GLOW);
    this.glowBg.anchor.set(0.5);
    this.dashboardContainer.addChild(this.glowBg);

    this.dashboardContainer.addChild(this.playerBox);

    this.surviveTimer = new SurviveTimer();
    this.dashboardContainer.addChild(this.surviveTimer);

    this.progressBar = new HeatProgressBar();
    this.dashboardContainer.addChild(this.progressBar);

    this.bubbleEffect = new ActionBubbleEffect();
    this.dashboardContainer.addChild(this.bubbleEffect);

    const { coolMaxUses, boostMaxUses } = options.gameConfig;

    this.coolButton = new CrashActionButton({
      textureAlias: CRASH_ASSETS.COOL_BUTTON,
      onPress: () => this.sendCool(),
      maxUses: coolMaxUses,
    });
    this.coolButton.setButtonScale(0.85);
    this.dashboardContainer.addChild(this.coolButton);

    this.cashoutButton = new CrashActionButton({
      textureAlias: CRASH_ASSETS.CASHOUT_BUTTON,
      onPress: () => this.sendExit(),
      labelText: "EXIT SHIP",
    });
    this.dashboardContainer.addChild(this.cashoutButton);

    this.heatButton = new CrashActionButton({
      textureAlias: CRASH_ASSETS.HEAT_BUTTON,
      onPress: () => this.sendBoost(),
      maxUses: boostMaxUses,
    });
    this.heatButton.setButtonScale(0.85);
    this.dashboardContainer.addChild(this.heatButton);

    this.addChild(this.dashboardContainer);

    this.spaceshipLottie = new LottiePlayer({
      initialPath: CRASH_LOTTIE_PATHS.SPACESHIP_FLAME,
      width: CRASH_LOTTIE_LAYOUT.WIDTH,
      height: CRASH_LOTTIE_LAYOUT.HEIGHT,
      loop: true,
      zIndex: CRASH_LOTTIE_LAYOUT.Z_INDEX,
    });

    this.shipSpeedLabel = new ShipSpeedLabel({
      rightGapPx: -60,
    });
    this.addChild(this.shipSpeedLabel);

    this.startSocketEventListeners();
  }

  public async show(): Promise<void> {
    Logger.info(
      `[CrashGameScreen] show() - isReconnection=${this.isReconnection}, animateShow=${this.animateShow}`,
    );
    this.isReady = true;
    this.spaceshipLottie.setVisible(true);
    this.shipSpeedLabel.visible = true;
    this.spaceshipLottie.play();

    if (this.animateShow) {
      this.shipSpeedLabel.alpha = 0;
      this.animateSpaceshipToTrail();
    } else {
      this.repositionSpaceshipLottie();
      this.repositionShipSpeedLabelFinal();
      this.shipSpeedLabel.alpha = 1;
      this.setSpaceshipRotationInstant();
      this.trail.alpha = 1;
      this.syncScrollSpeed();
      this.syncShakeEffect();
      this.syncCriticalBackground();
    }

    this.addWebviewListeners();
    this.updateDisplay();
  }

  public async hide(): Promise<void> {
    this.isReady = false;
    this.isAnimatingToTrail = false;
    this.spaceshipLottie.setVisible(false);
    this.shipSpeedLabel.visible = false;
    this.spaceshipLottie.stop();
    const lottieContainer = this.spaceshipLottie.getContainerElement();
    if (lottieContainer) {
      gsap.killTweensOf(lottieContainer);
    }
    gsap.killTweensOf(this.shipSpeedLabel);
    this.removeWebviewListeners();
    this.stopSocketEventListeners();
    this.stopShakeEffect();

    // Stop haptic feedback loop
    this.stopCriticalHapticLoop();

    // Hide critical background, stop critical siren, and kill its tweens
    if (this.criticalBackground && !this.criticalBackground.destroyed) {
      gsap.killTweensOf(this.criticalBackground);
      this.criticalBackground.alpha = 0;
      this.isCriticalBackgroundVisible = false;
      sfx.stop(CRITICAL_AUDIO.PATH);
    }

    // Clean up exit UX elements
    if (this.tooLateLabel && !this.tooLateLabel.destroyed) {
      gsap.killTweensOf(this.tooLateLabel);
      gsap.killTweensOf(this.tooLateLabel.scale);
    }
    this.progressBar.unfreeze();
    this.state.pendingRoundOverSync = null;

    gsap.killTweensOf(this);
    gsap.killTweensOf(this.children);

    if (this.trail && !this.trail.destroyed) {
      this.trail.alpha = 0;
    }
  }

  /**
   * Animates all HUD components off-screen in parallel before the game-over sequence.
   * Uses only translation and scale (GPU-accelerated). Resolves in ~0.4s.
   */
  public hideWithAnimation(): Promise<void> {
    return new Promise<void>((resolve) => {
      const screenHeight = app.renderer.height;
      const dashboardSlideDistance =
        screenHeight - this.dashboardContainer.y + 50;

      const lottieContainer = this.spaceshipLottie.getContainerElement();

      const tl = gsap.timeline({ onComplete: resolve });

      // Dashboard slides down off the bottom edge
      tl.to(
        this.dashboardContainer,
        { y: `+=${dashboardSlideDistance}`, duration: 0.4, ease: "power2.in" },
        0,
      );

      // Logo slides up and fades
      tl.to(
        this.logo,
        { y: `-=80`, alpha: 0, duration: 0.35, ease: "power2.in" },
        0,
      );

      // Cross button slides up and fades
      tl.to(
        this.crossButton,
        { y: `-=60`, alpha: 0, duration: 0.3, ease: "power2.in" },
        0,
      );

      // Player count header slides left and fades
      tl.to(
        this.playerCountHeader,
        { x: `-=100`, alpha: 0, duration: 0.35, ease: "power2.in" },
        0,
      );

      // Feed slides left and fades
      tl.to(
        this.feed,
        { x: `-=130`, alpha: 0, duration: 0.35, ease: "power2.in" },
        0,
      );

      // Ship speed label scales to zero and fades
      tl.to(this.shipSpeedLabel.scale, { x: 0, y: 0, duration: 0.3 }, 0);
      tl.to(
        this.shipSpeedLabel,
        { alpha: 0, duration: 0.3, ease: "power2.in" },
        0,
      );

      // Trail fades out
      if (this.trail && !this.trail.destroyed) {
        tl.to(this.trail, { alpha: 0, duration: 0.4, ease: "power2.in" }, 0);
      }

      // Spaceship lottie DOM element scales and fades out
      if (lottieContainer) {
        tl.to(
          lottieContainer,
          { scale: 0, opacity: 0, duration: 0.35, ease: "power2.in" },
          0,
        );
      }
    });
  }

  /**
   * Animates the GAME OVER sprite with a two-stage bounce: 0 → overshoot → final scale.
   * SpaceBackground remains visible underneath.
   */
  private showGameOverOverlay(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.destroyed) {
        resolve();
        return;
      }

      const { width, height } = app.renderer;

      const gameOverSprite = Sprite.from(CRASH_ASSETS.GAME_OVER);
      gameOverSprite.anchor.set(0.5);
      gameOverSprite.x = width / 2;
      gameOverSprite.y = height / 2;
      // Keep GAME OVER art responsive so it always fits on screen.
      const spriteWidth = Math.max(gameOverSprite.width, 1);
      const spriteHeight = Math.max(gameOverSprite.height, 1);
      const maxWidthScale = (width * 0.78) / spriteWidth;
      const maxHeightScale = (height * 0.4) / spriteHeight;
      const finalScale = Math.min(maxWidthScale, maxHeightScale, 1);
      const overshootScale = finalScale * 1.15;

      gameOverSprite.scale.set(0);
      gameOverSprite.alpha = 1;
      this.addChild(gameOverSprite);

      const tl = gsap.timeline({ onComplete: resolve });

      // Stage 1: Pop from 0 to overshoot
      tl.to(
        gameOverSprite.scale,
        {
          x: overshootScale,
          y: overshootScale,
          duration: 0.4,
          ease: "power2.out",
        },
        0,
      );

      // Stage 2: Settle from overshoot to final scale
      tl.to(
        gameOverSprite.scale,
        {
          x: finalScale,
          y: finalScale,
          duration: 0.3,
          ease: "back.out(1.5)",
        },
        "+=0",
      );
    });
  }

  public update(ticker: Ticker): void {
    if (this.destroyed) return;
    this.background.update(ticker.deltaTime);
  }

  public resize(width: number, height: number): void {
    const centerX = width / 2;

    this.background.resize(width, height);

    this.criticalBackground.x = centerX;
    this.criticalBackground.y = height / 2;
    this.criticalBackground.width = width;
    this.criticalBackground.height = height;

    this.trail.x = centerX;
    this.trail.y = (5 * height) / 8 + 50; // Moved down by 50px

    this.logoBaseX = TOP_EDGE_PADDING - 10;
    this.logoBaseY = TOP_EDGE_PADDING;
    this.logo.x = this.logoBaseX;
    this.logo.y = this.logoBaseY;

    this.playerCountHeader.x = TOP_EDGE_PADDING;
    this.playerCountHeader.y = this.logo.y + this.logo.height + 15;

    this.feed.x = TOP_EDGE_PADDING;
    this.feed.y =
      this.playerCountHeader.y +
      this.playerCountHeader.getComponentHeight() +
      15;

    this.crossButton.x = width - TOP_EDGE_PADDING - 40;
    this.crossButton.y = TOP_EDGE_PADDING + 40;

    if (!this.isAnimatingToTrail) {
      Logger.info(
        `[CrashGameScreen] 📐 Resize - repositioning lottie (not animating)`,
      );
      this.repositionSpaceshipLottie();
      this.repositionShipSpeedLabelFinal();
    } else {
      Logger.info(
        `[CrashGameScreen] 📐 Resize - skipping lottie reposition (animation in progress)`,
      );
    }

    this.progressBar.x = (width - this.progressBar.getBarWidth()) / 2;
    this.progressBar.y = 110;

    this.bubbleEffect.x = width / 2;
    this.bubbleEffect.y = this.progressBar.y + PROGRESS_BAR_HEIGHT;

    this.surviveTimer.x = width / 2;
    this.surviveTimer.y = this.progressBar.y - 25;

    this.playerBox.x = centerX;
    this.playerBox.y =
      95 + PROGRESS_BAR_HEIGHT + PROGRESS_BAR_TO_PLAYER_BOX_GAP;

    // Position buttons - customize these values as needed
    // Cool button (left)
    this.coolButton.x = width * 0.37;
    this.coolButton.y = 195;

    // Cashout button (center)
    this.cashoutButton.x = width * 0.5;
    this.cashoutButton.y = 230;

    // Heat button (right)
    this.heatButton.x = width * 0.63;
    this.heatButton.y = 195;

    const dashboardHeight = CRASH_LAYOUT.DASHBOARD_FIXED_HEIGHT;
    this.glowBg.x = width / 2;
    this.glowBg.y = dashboardHeight / 2;
    this.glowBg.width = width;
    this.glowBg.height = dashboardHeight;

    const scale = CRASH_LAYOUT.DASHBOARD_SCALE;
    this.dashboardContainer.scale.set(scale);
    this.dashboardContainer.x = (width - width * scale) / 2;
    this.dashboardContainer.y =
      height -
      dashboardHeight * scale -
      CRASH_LAYOUT.DASHBOARD_BOTTOM_PADDING +
      CRASH_LAYOUT.DASHBOARD_EXTRA_DOWN_OFFSET;
  }

  public destroy(options?: DestroyOptions): void {
    this.hide();

    // Kill any in-flight GSAP tweens targeting the lottie DOM container BEFORE
    // the container element is removed from the DOM by spaceshipLottie.destroy().
    // Without this, an onUpdate/onComplete callback fires against a null element
    // and throws "Cannot read properties of null (reading 'style')".
    const lottieContainer = this.spaceshipLottie.getContainerElement();
    if (lottieContainer) {
      gsap.killTweensOf(lottieContainer);
    }

    this.bubbleEffect.destroy();
    this.spaceshipLottie.destroy();
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }

  // --- Public action methods (to be wired to UI buttons) ---

  public sendCool(): void {
    if (!this.state.isMyPlayerAlive() || this.state.coolUsesLeft <= 0) return;

    ClientEvent.HapticFeedback("impactMedium");
    this.state.optimisticCoolCount++;
    this.state.coolUsesLeft =
      this.state.coolMaxUses - this.state.optimisticCoolCount;
    this.updateDisplay();

    socketManager.emit<CrashActionAckResponse>(
      CRASH_ACTIONS.CRASH_ACTION,
      { action: CrashAction.COOL },
      (response) => {
        if (this.destroyed) return;
        if (response.error) {
          Logger.error(
            "CrashGameScreen: cool action rejected",
            response.message,
          );
          this.state.optimisticCoolCount--;
          this.state.coolUsesLeft =
            this.state.coolMaxUses - this.state.optimisticCoolCount;
          this.updateDisplay();
        } else {
          this.bubbleEffect.trigger("cool");
        }
      },
    );
  }

  public sendBoost(): void {
    if (!this.state.isMyPlayerAlive() || this.state.boostUsesLeft <= 0) return;

    ClientEvent.HapticFeedback("impactMedium");
    this.state.optimisticBoostCount++;
    this.state.boostUsesLeft =
      this.state.boostMaxUses - this.state.optimisticBoostCount;
    this.updateDisplay();

    socketManager.emit<CrashActionAckResponse>(
      CRASH_ACTIONS.CRASH_ACTION,
      { action: CrashAction.BOOST },
      (response) => {
        if (this.destroyed) return;
        if (response.error) {
          Logger.error(
            "CrashGameScreen: boost action rejected",
            response.message,
          );
          this.state.optimisticBoostCount--;
          this.state.boostUsesLeft =
            this.state.boostMaxUses - this.state.optimisticBoostCount;
          this.updateDisplay();
        } else {
          this.bubbleEffect.trigger("heat");
        }
      },
    );
  }

  public sendExit(): void {
    if (!this.state.isMyPlayerAlive() || this.state.exitUxState !== "none") {
      return;
    }

    ClientEvent.HapticFeedback("notificationSuccess");
    Logger.info("[CrashGameScreen] Sending exit_ship action to server");

    this.state.exitUxState = "exit_pending";
    this.coolButton.setEnabled(false);
    this.heatButton.setEnabled(false);
    this.showExitingLabel();
    this.progressBar.freeze();

    const correctedExitTime = this.state.getCorrectedTimestamp();

    socketManager.emit<CrashActionAckResponse>(
      CRASH_ACTIONS.CRASH_ACTION,
      { action: CrashAction.EXIT_SHIP, exitTime: correctedExitTime },
      (response) => {
        if (this.destroyed) return;
        Logger.info(
          "[CrashGameScreen] Server response for exit_ship:",
          response,
        );

        if (response.error) {
          this.resolveExitFailed();
        } else {
          this.resolveExitSuccess();
        }
      },
    );
  }

  public getState(): Readonly<CrashGameSessionState> {
    return this.state;
  }

  // --- Exit UX state resolution ---

  private resolveExitSuccess(): void {
    Logger.info("[CrashGameScreen] Exit confirmed — EXIT_SUCCESS");
    this.state.exitUxState = "exit_success";
    this.cashoutButton.setLabelText("EXITED");
    this.cashoutButton.setEnabled(false);
    this.progressBar.unfreeze();
    this.applyBufferedSync();
    this.updateDisplay();
  }

  private resolveExitFailed(): void {
    Logger.info("[CrashGameScreen] Exit too late — EXIT_FAILED");
    this.state.exitUxState = "exit_failed";
    this.hideExitingLabel();
    this.progressBar.unfreeze();
    ClientEvent.HapticFeedback("notificationError");
    this.showStatusOverlay("Exit Failed!");
    this.applyBufferedSync();
    // If roundOver already set the phase (via handleRoundOver) but blast was
    // deferred because we were in EXIT_PENDING, trigger it now.
    this.checkAndTriggerBlast();
    this.updateDisplay();
  }

  private applyBufferedSync(): void {
    const buffered = this.state.pendingRoundOverSync;
    if (!buffered) return;

    this.state.pendingRoundOverSync = null;
    this.state.applyGameStateSync(buffered);
    this.syncScrollSpeed();
    this.syncShakeEffect();
    this.syncCriticalBackground();
    this.checkAndTriggerBlast();
    this.updateDisplay();
  }

  private showExitingLabel(): void {
    this.cashoutButton.setLabelText("EXITING...");
  }

  private hideExitingLabel(): void {
    this.cashoutButton.setLabelText("EXIT SHIP");
  }

  /**
   * Displays a bounce-in text overlay in the center of the screen, then
   * auto-fades after TOO_LATE_DISPLAY_DURATION_MS. Uses the same two-stage
   * bounce pattern as showGameOverOverlay.
   */
  private showStatusOverlay(text: string, color: number = 0xff4444): void {
    if (this.destroyed) return;

    const { width, height } = app.renderer;

    const label = new Text({
      text,
      style: {
        fontFamily: FONTS.PRIMARY,
        fontSize: 48,
        fontWeight: FONT_WEIGHTS.BOLD,
        fill: color,
        align: "center",
        stroke: { color: 0x000000, width: 4 },
        dropShadow: {
          color: 0x000000,
          blur: 8,
          distance: 2,
          alpha: 0.8,
        },
      },
    });
    label.anchor.set(0.5);
    label.x = width / 2;
    label.y = height / 2;
    label.scale.set(0);
    label.alpha = 1;
    this.addChild(label);
    this.tooLateLabel = label;

    const finalScale = 1;
    const overshootScale = finalScale * 1.2;
    const bounceDur = CRASH_TIMING.TOO_LATE_BOUNCE_DURATION_S;
    const holdMs = CRASH_TIMING.TOO_LATE_DISPLAY_DURATION_MS;

    const tl = gsap.timeline();
    tl.to(label.scale, {
      x: overshootScale,
      y: overshootScale,
      duration: bounceDur,
      ease: "power2.out",
    });
    tl.to(label.scale, {
      x: finalScale,
      y: finalScale,
      duration: bounceDur * 0.6,
      ease: "back.out(1.5)",
    });
    tl.to(label, {
      alpha: 0,
      duration: 0.4,
      ease: "power2.in",
      delay: holdMs / 1000,
      onComplete: () => {
        if (!label.destroyed) {
          label.destroy();
        }
        if (this.tooLateLabel === label) {
          this.tooLateLabel = null;
        }
      },
    });
  }

  private handleCrossPress(): void {
    if (this.destroyed) return;

    ClientEvent.HapticFeedback("selection");

    if (isMetaFreeWin()) {
      ClientEvent.ShowQuitPopupModal();
      return;
    }

    navigation.presentPopup(InfoPopup, {
      message: "Are you sure you want to go back to lobby?",
      showLoader: false,
      showOkButton: true,
      showCancelButton: true,
      onOkPress: () => {
        this.executeLeaveGame();
      },
      onCancelPress: () => {
        navigation.dismissPopup();
      },
      ...(CURRENT_PARTNER === PARTNER_ID.em && {
        textColor: 0xfefff9,
        backgroundColor: 0x121212,
      }),
    });
  }

  /**
   * Executes the actual leave-game flow: emits leave game socket event,
   * then routes to lobby or closes webview per partner config.
   */
  private executeLeaveGame(): void {
    Logger.info("executeLeaveGame called");

    if (API_CONSTANTS.GAME_MODES === GAME_MODES.PRACTICE) {
      Logger.info("CrashGameScreen: Closing web view for practice mode");
      navigation.closeWebView();
      return;
    }

    socketManager.emit<CrashActionAckResponse>(
      CRASH_ACTIONS.LEAVE_GAME,
      {},
      (response) => {
        if (response.error) {
          Logger.error(
            "CrashGameScreen: leave game rejected",
            response.message,
          );
          navigation.presentPopup(InfoPopup, {
            message: response.message,
          });
          return;
        }

        if (isFreeWin() || CURRENT_PARTNER === PARTNER_ID.bt) {
          Logger.info("CrashGameScreen: Closing web view");
          navigation.closeWebView();
        } else {
          navigation.goBackToLobby(true);
        }
      },
    );
  }

  /**
   * Builds and fires the GameEnded ClientEvent for both DUEL and TOURNAMENT formats.
   * Extracted so the async handler stays readable.
   */
  private buildAndSendGameEndedEvent(
    data: CrashGameResultPayload,
    myPlayerId: string,
    isWinner: boolean,
    isLoser: boolean,
  ): void {
    if (data.lobbyFormat === LOBBY_FORMAT.DUEL) {
      const opponentPlayer = data.players.find((p) => p.id !== myPlayerId);

      ClientEvent.GameEnded({
        matchId: data.matchId,
        lobbyFormat: LOBBY_FORMAT.DUEL,
        gameResult: isWinner ? "player_won" : isLoser ? "player_lost" : "draw",
        amount: data.yourPrize,
        user: {
          username: data.yourUsername,
          score: data.yourSurvivalTime,
          profilePicture: data.yourProfilePicture,
          rank: data.yourRank,
          winAmount: data.yourPrize,
          isTie: data.gameEndType === "DRAW",
        },
        opponent: {
          username: opponentPlayer?.username ?? "",
          score: opponentPlayer?.survivalTime ?? 0,
          profilePicture: opponentPlayer?.profilePicture ?? "",
          rank: opponentPlayer?.rank,
          winAmount: opponentPlayer?.prize,
          isTie: data.gameEndType === "DRAW",
        },
        currencyCode: data.currencyCode as CURRENCY_CODES,
      });
    } else if (data.lobbyFormat === LOBBY_FORMAT.TOURNAMENT) {
      const opponents = data.players
        .filter((p) => p.id !== myPlayerId)
        .map((p) => ({
          username: p.username,
          score: p.survivalTime,
          profilePicture: p.profilePicture,
          rank: p.rank,
          winAmount: p.prize,
          isTie: false,
        }));

      ClientEvent.GameEnded({
        matchId: data.matchId,
        lobbyFormat: LOBBY_FORMAT.TOURNAMENT,
        gameResult: data.yourRank === 1 ? "player_won" : "player_lost",
        amount: data.yourPrize,
        user: {
          username: data.yourUsername,
          score: data.yourSurvivalTime,
          profilePicture: data.yourProfilePicture,
          rank: data.yourRank,
          winAmount: data.yourPrize,
          isTie: false,
        },
        opponent: opponents,
        currencyCode: data.currencyCode as CURRENCY_CODES,
      });
    }
  }

  /**
   * Computes the final CSS position where the spaceship lottie's bottom edge
   * should coincide with the trail sprite's top tip, for any screen size / DPR.
   *
   * Coordinate model:
   *  - PixiJS stores coordinates in physical pixels when resolution = devicePixelRatio.
   *  - scaleX/scaleY convert PixiJS coords → CSS viewport pixels.
   *  - trail anchor is (0.5), so its top tip in PixiJS = trail.y − trail.height/2.
   *  - Converting that tip to CSS and subtracting lottieH gives the lottie's top (CSS).
   */
  private computeLottieFinalPosition(): { x: number; y: number } {
    const canvas = app.renderer.canvas as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const pixiWidth = app.renderer.width;
    const pixiHeight = app.renderer.height;

    const lottieW = CRASH_LOTTIE_LAYOUT.WIDTH;
    const lottieH = CRASH_LOTTIE_LAYOUT.HEIGHT;

    const scaleX = rect.width / pixiWidth;
    const scaleY = rect.height / pixiHeight;

    // Trail center in CSS pixels (anchor is 0.5, positioned at pixiHeight / 1.6 + 50px offset)
    const trailCenterCssY = (pixiHeight / 1.6 + 50) * scaleY + rect.top;

    // Trail top tip in CSS pixels: center minus half the PixiJS height converted to CSS
    const trailTopTipCssY = trailCenterCssY - (this.trail.height / 2) * scaleY;

    // Fine-tune final lottie position relative to trail tip (CSS pixels)
    const DIAGONAL_OFFSET_X = 25; // positive = right, lower = more left
    const DIAGONAL_OFFSET_Y = 60; // positive = down

    // Lottie top (CSS) = trail tip − lottie height + diagonal offsets
    const finalX =
      (pixiWidth / 2) * scaleX + rect.left - lottieW / 2 + DIAGONAL_OFFSET_X;
    const finalY = trailTopTipCssY - lottieH + DIAGONAL_OFFSET_Y;

    return { x: finalX, y: finalY };
  }

  /**
   * Animates the spaceship lottie in a straight line from center to above the trail.
   * Uses ease-in (slow start → fast end) and keeps rotation fixed at the final angle.
   */
  private animateSpaceshipToTrail(): void {
    Logger.info(
      `[CrashGameScreen] 🚀 Starting straight-line animation to trail`,
    );

    const canvas = app.renderer.canvas as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const pixiWidth = app.renderer.width;
    const pixiHeight = app.renderer.height;

    const lottieW = CRASH_LOTTIE_LAYOUT.WIDTH;
    const lottieH = CRASH_LOTTIE_LAYOUT.HEIGHT;

    const scaleX = rect.width / pixiWidth;
    const scaleY = rect.height / pixiHeight;

    const startX = (pixiWidth / 2) * scaleX + rect.left - lottieW / 2 + 60;
    const startY = (pixiHeight / 2) * scaleY + rect.top - lottieH / 2 + 120;

    const { x: endX, y: endY } = this.computeLottieFinalPosition();

    Logger.info(`[CrashGameScreen] 📍 Animation path:`, {
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      rotation: CRASH_LAYOUT.SPACESHIP_ROTATION,
      duration: SPACESHIP_ANIMATION.INIT_TO_TRAIL_DURATION_S,
    });

    this.spaceshipLottie.reposition(startX, startY, lottieW, lottieH);
    this.repositionShipSpeedLabelFinal();

    const lottieContainer = this.spaceshipLottie.getContainerElement();
    if (!lottieContainer) return;

    this.isAnimatingToTrail = true;

    // Keep the rotation angle constant throughout the move (no rotation tween).
    // GSAP's `rotation` property would animate from the current angle to the target.
    lottieContainer.style.transform = `rotate(${CRASH_LAYOUT.SPACESHIP_ROTATION}deg)`;
    lottieContainer.style.transformOrigin = "center center";

    gsap.to(lottieContainer, {
      left: endX,
      top: endY,
      duration: SPACESHIP_ANIMATION.INIT_TO_TRAIL_DURATION_S,
      ease: "power2.in",
      onComplete: () => {
        Logger.info(
          `[CrashGameScreen] ✅ Straight-line animation complete - lottie at final position`,
        );
        this.isAnimatingToTrail = false;

        if (!this.destroyed && this.trail) {
          Logger.info(`[CrashGameScreen] 🌟 Fading in trail sprite`);
          gsap.to(this.trail, {
            alpha: 1,
            duration: 0.8,
            ease: "power2.out",
          });
        }

        this.repositionShipSpeedLabelFinal();
        gsap.to(this.shipSpeedLabel, {
          alpha: 1,
          duration: 0.35,
          ease: "power2.out",
        });
      },
    });
  }

  /**
   * Repositions the spaceship lottie overlay so its bottom edge coincides with
   * the trail sprite's top tip, accounting for current screen dimensions and DPR.
   * Parameters are kept for call-site compatibility but are unused — the helper
   * reads from the renderer directly to ensure fresh values.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private repositionSpaceshipLottie(): void {
    const { x: finalX, y: finalY } = this.computeLottieFinalPosition();
    this.spaceshipLottie.reposition(
      finalX,
      finalY,
      CRASH_LOTTIE_LAYOUT.WIDTH,
      CRASH_LOTTIE_LAYOUT.HEIGHT,
    );
  }

  private repositionShipSpeedLabelFinal(): void {
    // Convert lottie's CSS position back to PixiJS coordinates
    const canvas = app.renderer.canvas as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const pixiWidth = app.renderer.width;
    const pixiHeight = app.renderer.height;

    const scaleX = rect.width / pixiWidth;
    const scaleY = rect.height / pixiHeight;

    // Get the lottie's final CSS position
    const { x: lottieCssX, y: lottieCssY } = this.computeLottieFinalPosition();

    // Convert CSS coordinates back to PixiJS coordinates
    const lottiePixiX = (lottieCssX - rect.left) / scaleX;
    const lottiePixiY = (lottieCssY - rect.top) / scaleY;

    // Position speed label to the right of the lottie container
    this.shipSpeedLabel.repositionToLottieBox(
      lottiePixiX,
      lottiePixiY,
      CRASH_LOTTIE_LAYOUT.WIDTH / scaleX, // Convert CSS width to PixiJS
      CRASH_LOTTIE_LAYOUT.HEIGHT / scaleY, // Convert CSS height to PixiJS
    );
    this.shipSpeedLabel.y += SHIP_SPEED_LABEL_Y_OFFSET;
  }

  /** Instantly sets the spaceship lottie rotation without animation (used on reconnection). */
  private setSpaceshipRotationInstant(): void {
    const lottieContainer = this.spaceshipLottie.getContainerElement();
    if (lottieContainer) {
      lottieContainer.style.transform = `rotate(${CRASH_LAYOUT.SPACESHIP_ROTATION}deg)`;
      lottieContainer.style.transformOrigin = "center center";
    }
  }

  /**
   * Update player box counts based on current game state
   */
  public updatePlayerCounts(aliveNo: number, dippedNo: number): void {
    if (this.destroyed) return;
    this.playerBox.updateCounts(aliveNo, dippedNo);
  }

  /** Set star-field scroll speed (e.g. for demo or heat). Default ~0.5. */
  public setScrollSpeed(speed: number): void {
    if (!this.destroyed && this.background)
      this.background.setScrollSpeed(speed);
  }

  // --- Socket event lifecycle ---

  private startSocketEventListeners(): void {
    socketManager.on<GameStartPayload>(
      CRASH_EVENTS.GAME_START,
      this.handleGameStart,
    );
    socketManager.on<GameStateSyncPayload>(
      CRASH_EVENTS.GAME_STATE_SYNC,
      this.handleGameStateSync,
    );
    socketManager.on<CrashPlayerActionPayload>(
      CRASH_EVENTS.PLAYER_ACTION,
      this.handlePlayerAction,
    );
    socketManager.on<RoundOverPayload>(
      CRASH_EVENTS.ROUND_OVER,
      this.handleRoundOver,
    );
    socketManager.on<CrashGameResultPayload>(
      CRASH_EVENTS.GAME_RESULT_SCREEN,
      this.handleGameResultScreen,
    );
  }

  private stopSocketEventListeners(): void {
    socketManager.off(CRASH_EVENTS.GAME_START, this.handleGameStart);
    socketManager.off(CRASH_EVENTS.GAME_STATE_SYNC, this.handleGameStateSync);
    socketManager.off(CRASH_EVENTS.PLAYER_ACTION, this.handlePlayerAction);
    socketManager.off(CRASH_EVENTS.ROUND_OVER, this.handleRoundOver);
    socketManager.off(
      CRASH_EVENTS.GAME_RESULT_SCREEN,
      this.handleGameResultScreen,
    );
  }

  private addWebviewListeners(): void {
    // @ts-expect-error -- appMessage is a custom event dispatched by native bridge injection
    window.addEventListener("appMessage", this.handleAppMessage);
    window.addEventListener("message", this.handleAppMessage);
  }

  private removeWebviewListeners(): void {
    // @ts-expect-error -- appMessage is a custom event dispatched by native bridge injection
    window.removeEventListener("appMessage", this.handleAppMessage);
    window.removeEventListener("message", this.handleAppMessage);
  }

  /**
   * Triggers shake effect when heat >= 90% to signal imminent danger.
   * The shake applies to both the logo and background for maximum impact.
   */
  private syncShakeEffect(): void {
    const heat = this.state.heat;
    const shouldShake = heat >= 90;
    const isShaking = this.bgShakeTl !== null;

    if (shouldShake && !isShaking) {
      Logger.info(
        `[CrashGameScreen] 🔥 Starting shake effect at heat=${heat.toFixed(1)}%`,
      );
      this.startShakeEffect();
    } else if (!shouldShake && isShaking) {
      Logger.info(
        `[CrashGameScreen] ✅ Stopping shake effect at heat=${heat.toFixed(1)}%`,
      );
      this.stopShakeEffect();
    }
  }

  /**
   * Shows or hides the critical background based on heat zone.
   * Animates opacity smoothly when transitioning between states.
   */
  private syncCriticalBackground(): void {
    const isCritical = this.state.heatZone === "critical";

    if (isCritical && !this.isCriticalBackgroundVisible) {
      Logger.info(
        `[CrashGameScreen] 🔴 Showing critical background (heat zone: critical)`,
      );
      this.showCriticalBackground();
    } else if (!isCritical && this.isCriticalBackgroundVisible) {
      Logger.info(
        `[CrashGameScreen] ✅ Hiding critical background (heat zone: ${this.state.heatZone})`,
      );
      this.hideCriticalBackground();
    }
  }

  /**
   * Animates the critical background to full opacity and starts the critical siren sound.
   */
  private showCriticalBackground(): void {
    if (this.destroyed || !this.criticalBackground) return;

    this.isCriticalBackgroundVisible = true;
    gsap.killTweensOf(this.criticalBackground);
    gsap.to(this.criticalBackground, {
      alpha: 1,
      duration: 0.5,
      ease: "power2.out",
    });

    // Trigger initial haptic feedback
    ClientEvent.HapticFeedback("notificationError");

    // Start continuous haptic feedback loop
    this.startCriticalHapticLoop();

    // Play critical siren sound effect in loop with reduced volume
    sfx.play(CRITICAL_AUDIO.PATH, {
      loop: true,
      volume: CRITICAL_AUDIO.VOLUME,
    });
  }

  /**
   * Starts continuous haptic feedback loop during critical heat zone.
   * Pulses every 500ms with multiple safety checks to prevent leaks.
   */
  private startCriticalHapticLoop(): void {
    // Clear any existing interval first (prevents multiple intervals)
    this.stopCriticalHapticLoop();

    this.criticalHapticStartTime = Date.now();

    this.criticalHapticIntervalId = window.setInterval(() => {
      // Safety check: Component destroyed
      if (this.destroyed) {
        this.stopCriticalHapticLoop();
        return;
      }

      // Safety check: No longer in critical state
      if (
        !this.isCriticalBackgroundVisible ||
        this.state.heatZone !== "critical"
      ) {
        this.stopCriticalHapticLoop();
        return;
      }

      // Safety check: Time limit exceeded (30 seconds)
      const elapsed = Date.now() - (this.criticalHapticStartTime || 0);
      if (elapsed > CRITICAL_HAPTIC.MAX_DURATION_MS) {
        Logger.info(
          "[CrashGameScreen] Critical haptic loop stopped - 30s time limit reached",
        );
        this.stopCriticalHapticLoop();
        return;
      }

      // Trigger haptic pulse
      ClientEvent.HapticFeedback("notificationError");
    }, CRITICAL_HAPTIC.INTERVAL_MS);

    Logger.info("[CrashGameScreen] 🔴 Started critical haptic feedback loop");
  }

  /**
   * Stops the continuous haptic feedback loop and clears interval state.
   */
  private stopCriticalHapticLoop(): void {
    if (this.criticalHapticIntervalId !== null) {
      clearInterval(this.criticalHapticIntervalId);
      this.criticalHapticIntervalId = null;
      this.criticalHapticStartTime = null;
      Logger.info("[CrashGameScreen] ⏹️ Stopped critical haptic feedback loop");
    }
  }

  /**
   * Animates the critical background to zero opacity and stops the critical siren sound.
   */
  private hideCriticalBackground(): void {
    if (this.destroyed || !this.criticalBackground) return;

    this.isCriticalBackgroundVisible = false;
    gsap.killTweensOf(this.criticalBackground);
    gsap.to(this.criticalBackground, {
      alpha: 0,
      duration: 0.5,
      ease: "power2.in",
    });

    // Stop haptic feedback loop
    this.stopCriticalHapticLoop();

    // Stop critical siren sound effect
    sfx.stop(CRITICAL_AUDIO.PATH);
  }

  private startShakeEffect(): void {
    this.stopShakeEffect();

    const { LOGO_INTENSITY, LOGO_CYCLE_MS, BG_INTENSITY, BG_CYCLE_MS } =
      CRITICAL_SHAKE;
    const logoSec = LOGO_CYCLE_MS / 1000;
    const bgSec = BG_CYCLE_MS / 1000;

    this.logoShakeTl = gsap.timeline({ repeat: -1 });
    this.logoShakeTl.to(this.logo, {
      x: this.logoBaseX + LOGO_INTENSITY,
      y: this.logoBaseY - LOGO_INTENSITY * 0.5,
      duration: logoSec,
      ease: "none",
    });
    this.logoShakeTl.to(this.logo, {
      x: this.logoBaseX - LOGO_INTENSITY,
      y: this.logoBaseY + LOGO_INTENSITY * 0.5,
      duration: logoSec,
      ease: "none",
    });
    this.logoShakeTl.to(this.logo, {
      x: this.logoBaseX,
      y: this.logoBaseY,
      duration: logoSec,
      ease: "none",
    });

    this.bgShakeTl = gsap.timeline({ repeat: -1 });
    this.bgShakeTl.to(this.background, {
      x: BG_INTENSITY,
      y: -BG_INTENSITY * 0.5,
      duration: bgSec,
      ease: "none",
    });
    this.bgShakeTl.to(this.background, {
      x: -BG_INTENSITY,
      y: BG_INTENSITY * 0.5,
      duration: bgSec,
      ease: "none",
    });
    this.bgShakeTl.to(this.background, {
      x: 0,
      y: 0,
      duration: bgSec,
      ease: "none",
    });
  }

  private stopShakeEffect(): void {
    if (this.logoShakeTl) {
      this.logoShakeTl.kill();
      this.logoShakeTl = null;
    }
    if (this.bgShakeTl) {
      this.bgShakeTl.kill();
      this.bgShakeTl = null;
    }

    if (!this.logo.destroyed) {
      this.logo.x = this.logoBaseX;
      this.logo.y = this.logoBaseY;
    }
    if (!this.background.destroyed) {
      this.background.x = 0;
      this.background.y = 0;
    }
  }

  private checkAndTriggerBlast(): void {
    if (this.hasTriggeredBlast || this.destroyed) return;

    if (this.state.phase === "roundOver") {
      Logger.info(`[CrashGameScreen] 💥 BLAST triggered - round is over`);
      this.hasTriggeredBlast = true;

      // Stop background scrolling animation
      this.background.setScrollSpeed(0);

      this.shipSpeedLabel.visible = false;
      this.shipSpeedLabel.alpha = 0;
      gsap.killTweensOf(this.shipSpeedLabel);
      this.spaceshipLottie.loadAnimation(
        CRASH_LOTTIE_PATHS.SPACESHIP_BLAST,
        false,
      );
      this.spaceshipLottie.play();
      Logger.info(
        "CrashGameScreen: Triggered ship blast animation (roundOver)",
      );

      // Fade trail quickly on blast
      if (this.trail && !this.trail.destroyed) {
        Logger.info(`[CrashGameScreen] 💥 Blast - fading trail quickly`);
        gsap.to(this.trail, {
          alpha: 0,
          duration: 0.4,
          ease: "power2.in",
        });
      }
    }
  }

  /**
   * Updates background scroll speed based on heat using an exponential curve.
   * The relationship is exponential — slow at low heat, dramatic surge at high heat.
   *
   * Expected values at K=3, MAX_SPEED=10:
   * - Heat 0%:   speed = 0.00
   * - Heat 25%:  speed ≈ 1.27
   * - Heat 50%:  speed ≈ 3.16
   * - Heat 75%:  speed ≈ 6.20
   * - Heat 90%:  speed ≈ 8.57
   * - Heat 100%: speed = 10.00
   */
  private syncScrollSpeed(): void {
    const { MAX_SPEED, K } = HEAT_SCROLL;
    const heat = this.state.heat;

    let speed: number;
    if (heat <= 0) {
      speed = 0;
    } else if (heat >= 100) {
      speed = MAX_SPEED;
    } else {
      speed =
        (MAX_SPEED * (Math.exp((K * heat) / 100) - 1)) / (Math.exp(K) - 1);
    }

    this.background.setScrollSpeed(speed);
  }

  private updateDisplay(): void {
    if (!this.isReady || this.destroyed) return;

    const elapsed = Math.round(this.state.elapsed * 100) / 100;
    this.surviveTimer.setTime(elapsed);

    const alivePlayers = this.state.players.filter(
      (p) => p.status === "alive",
    ).length;
    const dippedPlayers = this.state.players.filter(
      (p) => p.status === "exited",
    ).length;
    this.playerBox.updateCounts(alivePlayers, dippedPlayers);

    this.progressBar.setProgress(this.state.heat);
    this.progressBar.setHeatZone(this.state.heatZone);
    this.coolButton.setUsesRemaining(this.state.coolUsesLeft);
    this.heatButton.setUsesRemaining(this.state.boostUsesLeft);
    this.playerCountHeader.setCount(this.state.players.length);
    this.feed.updateMessages(this.state.feedMessages, this.state.players);
    this.shipSpeedLabel.setSpeed(this.getShipSpeedForDisplay());

    const isAlive =
      this.state.isMyPlayerAlive() && this.state.exitUxState === "none";
    const baseEnabled = isAlive && this.state.phase === "running";
    this.coolButton.setEnabled(baseEnabled && this.state.coolUsesLeft > 0);
    const cashoutDisabled =
      this.state.exitUxState === "exit_success" ||
      this.state.phase === "roundOver";
    this.cashoutButton.setEnabled(!cashoutDisabled);
    this.heatButton.setEnabled(baseEnabled && this.state.boostUsesLeft > 0);
  }

  private getShipSpeedForDisplay(): number {
    if (this.state.shipSpeed > 0) {
      return this.state.shipSpeed;
    }
    return 0;
  }
}

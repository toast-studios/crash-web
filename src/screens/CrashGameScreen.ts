import { Container, Sprite, Ticker, type DestroyOptions } from "pixi.js";
import gsap from "gsap";
import { CRASH_EVENTS, CRASH_ACTIONS } from "../constants";
import {
  CRASH_ASSETS,
  CRASH_LAYOUT,
  CRASH_LOTTIE_PATHS,
  CRASH_LOTTIE_LAYOUT,
} from "../constants/crashLayout";
import { socketManager } from "../network/SocketManager";
import {
  CrashGameSessionState,
  type CrashGameConfig,
  type GameStartPayload,
  type GameStateSyncPayload,
  type CrashPlayerActionPayload,
  type RoundOverPayload,
  type CrashActionAckResponse,
  type HeatZone,
} from "../types/crashGame";
import { Logger } from "../utils/logger";
import { SpaceBackground } from "../ui/SpaceBackground";
import { HeatProgressBar } from "../ui/crash/HeatProgressBar";
import { CrashActionButton } from "../ui/crash/CrashActionButton";
import { CrossButton } from "../ui/crash/CrossButton";
import { PlayerBox } from "../ui/crash/PlayerBox";
import { LottiePlayer } from "../ui/crash/LottiePlayer";
import { SurviveTimer } from "../ui/crash/SurviveTimer";
import { CrashFeed } from "../ui/crash/CrashFeed";
import { PlayerCountHeader } from "../ui/crash/PlayerCountHeader";
import { HeatDeltaText } from "../ui/crash/HeatDeltaText";
import { app } from "../app";
import { navigation } from "../utils/navigation";
import { getCurrentGameUserId } from "../network/eventListeners";
import { InfoPopup } from "../popups/InfoPopup";
import { ClientEvent } from "../utils/clientEvent";
import { isMetaFreeWin, isFreeWin } from "../utils/game";
import {
  CURRENT_PARTNER,
  PARTNER_ID,
  PARTNER_SPECIFIC_CONFIG,
} from "../network/constants";

/** Padding from screen edge for top-left logo and top-right cross button. */
const TOP_EDGE_PADDING = 20;

const VELOCITY_SCROLL = {
  MIN_VELOCITY: 1.0,
  MAX_VELOCITY: 10.0,
  MIN_SCROLL_SPEED: 0.5,
  MAX_SCROLL_SPEED: 6.0,
} as const;

const CRITICAL_SHAKE = {
  LOGO_INTENSITY: 3,
  LOGO_CYCLE_MS: 30,
  BG_INTENSITY: 1.5,
  BG_CYCLE_MS: 40,
  SETTLE_DURATION: 0.1,
} as const;

export interface CrashGameScreenOptions extends GameStartPayload {
  gameConfig?: CrashGameConfig;
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

  private state: CrashGameSessionState;
  private isReady = false;
  private optimisticExited = false;
  private hasTriggeredBlast = false;
  private isAnimatingToTrail = false;

  private background: SpaceBackground;
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
  private heatDeltaText: HeatDeltaText;
  public spaceshipLottie: LottiePlayer;

  private prevHeatZone: HeatZone = "green";
  private logoShakeTl: gsap.core.Timeline | null = null;
  private bgShakeTl: gsap.core.Timeline | null = null;
  private logoBaseX = TOP_EDGE_PADDING;
  private logoBaseY = TOP_EDGE_PADDING;

  // --- Screen-scoped socket handler references (arrow functions for stable `this`) ---

  private readonly handleGameStateSync = (data: GameStateSyncPayload) => {
    if (this.destroyed) return;
    console.log(`[CrashGameScreen] 🔄 gameStateSync:`, {
      phase: data.phase,
      heat: data.heat,
      heatZone: data.heatZone,
      elapsed: data.elapsed,
    });
    this.state.applyGameStateSync(data);
    this.syncScrollSpeed();
    this.syncShakeEffect();
    this.checkAndTriggerBlast();
    this.updateDisplay();
  };

  private readonly handlePlayerAction = (data: CrashPlayerActionPayload) => {
    if (this.destroyed || !this.isReady) return;

    console.log(`[CrashGameScreen] 🎮 handlePlayerAction:`, {
      action: data.action,
      gameUserId: data.gameUserId,
      username: data.username,
      survivalTime: data.survivalTime,
      isMyPlayer: data.gameUserId === this.state.myPlayerId,
    });

    if (data.action === "cool" || data.action === "boost") {
      const delta = this.state.computeHeatDelta(data.action);
      this.state.heatDeltaEvent = {
        delta,
        id: `${Date.now()}-${Math.random()}`,
      };
      this.heatDeltaText.show(delta);
    }
  };

  private readonly handleRoundOver = (data: RoundOverPayload) => {
    if (this.destroyed) return;
    Logger.info("CrashGameScreen: roundOver", data);
    this.state.applyRoundOver(data);
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

  constructor(options: CrashGameScreenOptions) {
    super();

    this.state = new CrashGameSessionState();
    this.state.myPlayerId = getCurrentGameUserId();
    if (options.gameConfig) {
      this.state.gameConfig = options.gameConfig;
    }
    this.state.applyGameStart(options);

    this.background = new SpaceBackground();
    this.addChild(this.background);

    this.trail = Sprite.from(CRASH_ASSETS.TRAIL);
    this.trail.anchor.set(0.5);
    this.trail.scale.set(0.5);
    this.trail.alpha = 0;
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
    this.logo.scale.set(0.5);
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

    this.heatDeltaText = new HeatDeltaText();
    this.dashboardContainer.addChild(this.heatDeltaText);

    this.coolButton = new CrashActionButton({
      textureAlias: CRASH_ASSETS.COOL_BUTTON,
      onPress: () => this.sendCool(),
      maxUses: options.coolMaxUses,
    });
    this.coolButton.setButtonScale(0.85);
    this.dashboardContainer.addChild(this.coolButton);

    this.cashoutButton = new CrashActionButton({
      textureAlias: CRASH_ASSETS.CASHOUT_BUTTON,
      onPress: () => this.sendExit(),
    });
    this.dashboardContainer.addChild(this.cashoutButton);

    this.heatButton = new CrashActionButton({
      textureAlias: CRASH_ASSETS.HEAT_BUTTON,
      onPress: () => this.sendBoost(),
      maxUses: options.boostMaxUses,
    });
    this.heatButton.setButtonScale(0.85);
    this.dashboardContainer.addChild(this.heatButton);

    this.addChild(this.dashboardContainer);

    console.log(`[CrashGameScreen] 🚀 Initializing spaceship lottie with:`, {
      path: CRASH_LOTTIE_PATHS.SPACESHIP_FLAME,
      width: CRASH_LOTTIE_LAYOUT.WIDTH,
      height: CRASH_LOTTIE_LAYOUT.HEIGHT,
      loop: true,
    });

    this.spaceshipLottie = new LottiePlayer({
      initialPath: CRASH_LOTTIE_PATHS.SPACESHIP_FLAME,
      width: CRASH_LOTTIE_LAYOUT.WIDTH,
      height: CRASH_LOTTIE_LAYOUT.HEIGHT,
      loop: true,
      zIndex: CRASH_LOTTIE_LAYOUT.Z_INDEX,
    });

    this.startSocketEventListeners();
  }

  public async show(): Promise<void> {
    console.log(`[CrashGameScreen] 👁️ show() - Starting screen`);
    this.isReady = true;
    this.spaceshipLottie.setVisible(true);
    this.spaceshipLottie.play();
    console.log(
      `[CrashGameScreen] ▶️ Playing spaceship lottie and starting parabolic animation`,
    );
    this.animateSpaceshipToTrail();
    this.addWebviewListeners();
    this.updateDisplay();
  }

  public async hide(): Promise<void> {
    this.isReady = false;
    this.isAnimatingToTrail = false;
    this.spaceshipLottie.setVisible(false);
    this.spaceshipLottie.stop();
    const lottieContainer = this.spaceshipLottie.getContainerElement();
    if (lottieContainer) {
      gsap.killTweensOf(lottieContainer);
    }
    this.removeWebviewListeners();
    this.stopSocketEventListeners();
    this.stopShakeEffect();
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.children);

    if (this.trail && !this.trail.destroyed) {
      this.trail.alpha = 0;
    }
  }

  public update(ticker: Ticker): void {
    if (this.destroyed) return;
    this.background.update(ticker.deltaTime);
  }

  public resize(width: number, height: number): void {
    const centerX = width / 2;

    this.background.resize(width, height);

    this.trail.x = centerX;
    this.trail.y = height / 1.6;

    this.logoBaseX = TOP_EDGE_PADDING;
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

    const crossW = this.crossButton.getWidth();
    const crossH = this.crossButton.getHeight();
    this.crossButton.x = width - TOP_EDGE_PADDING - crossW / 2;
    this.crossButton.y = TOP_EDGE_PADDING + crossH / 2;

    if (!this.isAnimatingToTrail) {
      console.log(
        `[CrashGameScreen] 📐 Resize - repositioning lottie (not animating)`,
      );
      this.repositionSpaceshipLottie(width, height);
    } else {
      console.log(
        `[CrashGameScreen] 📐 Resize - skipping lottie reposition (animation in progress)`,
      );
    }

    this.progressBar.x = (width - this.progressBar.getBarWidth()) / 2;
    this.progressBar.y = 110;

    this.heatDeltaText.x = width / 2;
    this.heatDeltaText.y = this.progressBar.y - 16;

    this.surviveTimer.x = width / 2;
    this.surviveTimer.y = this.progressBar.y - 30;

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
    this.spaceshipLottie.destroy();
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }

  // --- Public action methods (to be wired to UI buttons) ---

  public sendCool(): void {
    if (!this.state.isMyPlayerAlive() || this.state.coolUsesLeft <= 0) return;

    this.state.coolUsesLeft--;
    this.updateDisplay();

    socketManager.emit<CrashActionAckResponse>(
      CRASH_ACTIONS.CRASH_ACTION,
      { action: "cool" },
      (response) => {
        if (this.destroyed) return;
        if (response.error) {
          Logger.error(
            "CrashGameScreen: cool action rejected",
            response.message,
          );
          this.state.coolUsesLeft++;
          this.updateDisplay();
        }
      },
    );
  }

  public sendBoost(): void {
    if (!this.state.isMyPlayerAlive() || this.state.boostUsesLeft <= 0) return;

    this.state.boostUsesLeft--;
    this.updateDisplay();

    socketManager.emit<CrashActionAckResponse>(
      CRASH_ACTIONS.CRASH_ACTION,
      { action: "boost" },
      (response) => {
        if (this.destroyed) return;
        if (response.error) {
          Logger.error(
            "CrashGameScreen: boost action rejected",
            response.message,
          );
          this.state.boostUsesLeft++;
          this.updateDisplay();
        }
      },
    );
  }

  public sendExit(): void {
    if (!this.state.isMyPlayerAlive() || this.optimisticExited) return;

    console.log(`[CrashGameScreen] 🚪 Sending exit_ship action to server`);
    this.optimisticExited = true;
    this.coolButton.setEnabled(false);
    this.cashoutButton.setEnabled(false);
    this.heatButton.setEnabled(false);

    socketManager.emit<CrashActionAckResponse>(
      CRASH_ACTIONS.CRASH_ACTION,
      { action: "exit_ship" },
      (response) => {
        if (this.destroyed) return;
        console.log(
          `[CrashGameScreen] 📨 Server response for exit_ship:`,
          response,
        );

        if (response.error) {
          Logger.error(
            "CrashGameScreen: exit action rejected",
            response.message,
          );
          this.optimisticExited = false;
          this.updateDisplay();
        } else {
          console.log(
            `[CrashGameScreen] 🛑 Exit confirmed by server - switching to SPACESHIP_STOP`,
          );
          Logger.info(
            "CrashGameScreen: Exit confirmed, showing Stop animation",
          );
          this.spaceshipLottie.loadAnimation(
            CRASH_LOTTIE_PATHS.SPACESHIP_STOP,
            true,
          );
          this.spaceshipLottie.play();
        }
      },
    );
  }

  public getState(): Readonly<CrashGameSessionState> {
    return this.state;
  }

  private handleCrossPress(): void {
    if (this.destroyed) return;

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
   * Executes the actual leave-game flow: shows a loading popup,
   * then routes to lobby or closes webview per partner config.
   */
  private executeLeaveGame(): void {
    navigation.presentPopup(InfoPopup, {
      showLoader: true,
      message: "",
      showCancelButton: false,
      showOkButton: false,
    });

    if (isFreeWin() || CURRENT_PARTNER === PARTNER_ID.bt) {
      navigation.closeWebView();
    } else {
      navigation.goBackToLobby(true);
    }
  }

  /**
   * Animates the spaceship lottie on a parabolic path from center to above the trail.
   * The spaceship tilts diagonally to the left during the animation.
   */
  private animateSpaceshipToTrail(): void {
    console.log(`[CrashGameScreen] 🌈 Starting parabolic animation to trail`);

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

    const trailY = (pixiHeight / 1.6) * scaleY + rect.top;
    const endX = (pixiWidth / 2) * scaleX + rect.left - lottieW / 2 + 35;
    const endY = trailY - lottieH - 190;

    console.log(`[CrashGameScreen] 📍 Animation path:`, {
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      rotation: -30,
      duration: 2,
    });

    this.spaceshipLottie.reposition(startX, startY, lottieW, lottieH);

    const lottieContainer = this.spaceshipLottie.getContainerElement();
    if (!lottieContainer) return;

    this.isAnimatingToTrail = true;

    gsap.to(lottieContainer, {
      left: endX,
      top: endY,
      rotation: -30,
      duration: 2,
      ease: "power2.inOut",
      transformOrigin: "center center",
      onUpdate: function () {
        const progress = this.progress();
        const arc = Math.sin(progress * Math.PI) * 100;
        const currentLeft = startX + (endX - startX) * progress + arc;
        lottieContainer.style.left = `${currentLeft}px`;
      },
      onComplete: () => {
        console.log(
          `[CrashGameScreen] ✅ Parabolic animation complete - lottie at final position`,
        );
        this.isAnimatingToTrail = false;

        if (!this.destroyed && this.trail) {
          console.log(`[CrashGameScreen] 🌟 Fading in trail sprite`);
          gsap.to(this.trail, {
            alpha: 1,
            duration: 0.8,
            ease: "power2.out",
          });
        }
      },
    });
  }

  /**
   * Converts PixiJS center-of-screen coordinates to CSS viewport pixels
   * and repositions the spaceship lottie overlay accordingly.
   */
  private repositionSpaceshipLottie(
    pixiWidth: number,
    pixiHeight: number,
  ): void {
    const canvas = app.renderer.canvas as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();

    const lottieW = CRASH_LOTTIE_LAYOUT.WIDTH;
    const lottieH = CRASH_LOTTIE_LAYOUT.HEIGHT;

    const scaleX = rect.width / pixiWidth;
    const scaleY = rect.height / pixiHeight;

    const trailY = (pixiHeight / 1.6) * scaleY + rect.top;
    const finalX = (pixiWidth / 2) * scaleX + rect.left - lottieW / 2;
    const finalY = trailY - lottieH - 40;

    this.spaceshipLottie.reposition(finalX, finalY, lottieW, lottieH);
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
  }

  private stopSocketEventListeners(): void {
    socketManager.off(CRASH_EVENTS.GAME_STATE_SYNC, this.handleGameStateSync);
    socketManager.off(CRASH_EVENTS.PLAYER_ACTION, this.handlePlayerAction);
    socketManager.off(CRASH_EVENTS.ROUND_OVER, this.handleRoundOver);
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

  private syncShakeEffect(): void {
    const zone = this.state.heatZone;
    if (zone === this.prevHeatZone) return;

    const wasCritical = this.prevHeatZone === "critical";
    const isCritical = zone === "critical";
    this.prevHeatZone = zone;

    if (isCritical && !wasCritical) {
      this.startShakeEffect();
    } else if (!isCritical && wasCritical) {
      this.stopShakeEffect();
    }
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
      console.log(`[CrashGameScreen] 💥 BLAST triggered - round is over`);
      this.hasTriggeredBlast = true;
      this.spaceshipLottie.loadAnimation(
        CRASH_LOTTIE_PATHS.SPACESHIP_BLAST,
        false,
      );
      this.spaceshipLottie.play();
      Logger.info(
        "CrashGameScreen: Triggered ship blast animation (roundOver)",
      );
    }
  }

  private syncScrollSpeed(): void {
    const { MIN_VELOCITY, MAX_VELOCITY, MIN_SCROLL_SPEED, MAX_SCROLL_SPEED } =
      VELOCITY_SCROLL;
    const normalized =
      (this.state.velocity - MIN_VELOCITY) / (MAX_VELOCITY - MIN_VELOCITY);
    const clamped = Math.max(0, Math.min(1, normalized));
    const speed =
      MIN_SCROLL_SPEED + clamped * (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED);
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

    const isAlive = this.state.isMyPlayerAlive() && !this.optimisticExited;
    const baseEnabled = isAlive && this.state.phase === "running";
    this.coolButton.setEnabled(baseEnabled && this.state.coolUsesLeft > 0);
    this.cashoutButton.setEnabled(baseEnabled);
    this.heatButton.setEnabled(baseEnabled && this.state.boostUsesLeft > 0);
  }
}

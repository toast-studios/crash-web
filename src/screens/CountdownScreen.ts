import { Container, Graphics, Text } from "pixi.js";
import gsap from "gsap";
import { CRASH_EVENTS } from "../constants";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../constants/typography";
import { socketManager } from "../network/SocketManager";
import type { CountdownPayload } from "../types/crashGame";
import { Logger } from "../utils/logger";
import { navigation } from "../utils/navigation";
import { isFreeWin } from "../utils/game";
import { CURRENT_PARTNER, PARTNER_ID } from "../network/constants";

const COLORS = {
  BACKDROP: 0x000000,
  BACKDROP_ALPHA: 0.85,
  COUNTDOWN_NUMBER: 0xffd700,
  TITLE_TEXT: 0xffffff,
  SUBTITLE_TEXT: 0xcccccc,
} as const;

const ANIMATION = {
  SCALE_START: 1.6,
  SCALE_END: 1,
  PULSE_DURATION: 0.4,
  PULSE_EASE: "back.out(1.7)",
} as const;

export interface CountdownScreenOptions {
  secondsRemaining: number;
}

export class CountdownScreen extends Container {
  public static assetBundles = ["common"];

  private backdrop: Graphics;
  private titleText: Text;
  private subtitleText: Text;
  private countdownText: Text;
  private secondsRemaining: number;

  private readonly handleCountdown = (data: CountdownPayload) => {
    if (this.destroyed) return;
    Logger.info("CountdownScreen: countdown tick", data);
    this.secondsRemaining = data.secondsRemaining;
    this.updateCountdownDisplay();
  };

  private readonly handleAppMessage = (event: MessageEvent) => {
    if (this.destroyed) return;
    const { type } = event.data;
    if (type === "QUIT_GAME" || type === "GAME_LEAVE") {
      Logger.info("CountdownScreen: QUIT_GAME or GAME_LEAVE", event.data);
      if (isFreeWin() || CURRENT_PARTNER === PARTNER_ID.bt) {
        navigation.closeWebView();
      } else {
        navigation.goBackToLobby(true);
      }
    }
  };

  constructor(options: CountdownScreenOptions) {
    super();
    this.secondsRemaining = options.secondsRemaining;

    this.backdrop = new Graphics();
    this.addChild(this.backdrop);

    this.titleText = new Text({
      text: "GET READY",
      style: {
        fontFamily: FONTS.PRIMARY,
        fontSize: FONT_SIZES.LARGE,
        fontWeight: FONT_WEIGHTS.BOLD,
        fill: COLORS.TITLE_TEXT,
        align: "center",
      },
    });
    this.titleText.anchor.set(0.5);
    this.addChild(this.titleText);

    this.subtitleText = new Text({
      text: "STARTING IN",
      style: {
        fontFamily: FONTS.PRIMARY,
        fontSize: FONT_SIZES.SMALL,
        fontWeight: FONT_WEIGHTS.REGULAR,
        fill: COLORS.SUBTITLE_TEXT,
        align: "center",
      },
    });
    this.subtitleText.anchor.set(0.5);
    this.addChild(this.subtitleText);

    this.countdownText = new Text({
      text: String(this.secondsRemaining),
      style: {
        fontFamily: FONTS.PRIMARY,
        fontSize: 90,
        fontWeight: FONT_WEIGHTS.BOLD,
        fill: COLORS.COUNTDOWN_NUMBER,
        align: "center",
      },
    });
    this.countdownText.anchor.set(0.5);
    this.addChild(this.countdownText);
  }

  public async show(): Promise<void> {
    this.startSocketEventListeners();
    this.addWebviewListeners();
    this.updateCountdownDisplay();
  }

  public async hide(): Promise<void> {
    this.removeWebviewListeners();
    this.stopSocketEventListeners();
    gsap.killTweensOf(this.countdownText.scale);
  }

  public resize(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    this.backdrop.clear();
    this.backdrop
      .rect(0, 0, width, height)
      .fill({ color: COLORS.BACKDROP, alpha: COLORS.BACKDROP_ALPHA });

    this.titleText.x = centerX;
    this.titleText.y = centerY - 80;

    this.subtitleText.x = centerX;
    this.subtitleText.y = centerY - 20;

    this.countdownText.x = centerX;
    this.countdownText.y = centerY + 60;
  }

  public destroy(): void {
    this.hide();
    super.destroy({ children: true });
  }

  private startSocketEventListeners(): void {
    socketManager.on<CountdownPayload>(
      CRASH_EVENTS.COUNTDOWN,
      this.handleCountdown,
    );
  }

  private stopSocketEventListeners(): void {
    socketManager.off(CRASH_EVENTS.COUNTDOWN, this.handleCountdown);
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

  private updateCountdownDisplay(): void {
    this.countdownText.text = String(this.secondsRemaining);
    this.animateCountdownPulse();
  }

  private animateCountdownPulse(): void {
    gsap.killTweensOf(this.countdownText.scale);
    gsap.fromTo(
      this.countdownText.scale,
      { x: ANIMATION.SCALE_START, y: ANIMATION.SCALE_START },
      {
        x: ANIMATION.SCALE_END,
        y: ANIMATION.SCALE_END,
        duration: ANIMATION.PULSE_DURATION,
        ease: ANIMATION.PULSE_EASE,
      },
    );
  }
}

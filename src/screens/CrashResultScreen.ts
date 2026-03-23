import {
  Container,
  Graphics,
  Text,
  Ticker,
  type DestroyOptions,
} from "pixi.js";
import gsap from "gsap";
import { SpaceBackground } from "../ui/SpaceBackground";
import type { CrashPlayerStatus } from "../types/crashGame";
import { navigation } from "../utils/navigation";
import { FONTS, FONT_WEIGHTS } from "../constants/typography";
import { Logger } from "../utils/logger";
import { isFreeWin } from "../utils/game";
import { CURRENT_PARTNER, PARTNER_ID } from "../network/constants";

const RESULT_COLORS = {
  SURFACE: 0x1a1a3e,
  ACCENT: 0xff6b35,
  TEXT: 0xffffff,
  TEXT_DIM: 0x888899,
  TEXT_MUTED: 0x555566,
  GOLD: 0xffd700,
  SILVER: 0xc0c0c0,
  BRONZE: 0xcd7f32,
  BUST: 0xff2222,
  ALIVE: 0x00dd66,
} as const;

const RANK_FILL = [
  RESULT_COLORS.GOLD,
  RESULT_COLORS.SILVER,
  RESULT_COLORS.BRONZE,
] as const;

const RESULT_LAYOUT = {
  PADDING: 20,
  CARD_RADIUS: 10,
  CARD_GAP: 6,
  RANK_CARD_HEIGHT: 48,
  BUTTON_HEIGHT: 48,
  BUTTON_RADIUS: 14,
  SUMMARY_ROW_HEIGHT: 28,
  SUMMARY_PADDING: 14,
  BANNER_HEIGHT: 60,
} as const;

export interface CrashResultPlayer {
  id: string;
  name: string;
  status: CrashPlayerStatus;
  survivalTime: number;
  boostCount: number;
  coolCount: number;
  prize: number;
  rank: number;
}

export interface CrashResultScreenConfig {
  matchId: string;
  elapsed?: number;
  yourRank: number;
  yourPrize: number;
  yourSurvivalTime: number;
  players: CrashResultPlayer[];
  myPlayerId: string;
  didWin: boolean;
  onNextRound?: () => void;
}

export class CrashResultScreen extends Container {
  public static assetBundles = ["common", "game"];

  private config: CrashResultScreenConfig;
  private background: SpaceBackground;

  private titleText: Text;
  private subtitleText: Text;

  private bannerContainer: Container;
  private bannerBg!: Graphics;
  private bannerAmount!: Text;
  private bannerLabel!: Text;

  private summaryContainer: Container;
  private summaryBg!: Graphics;
  private summaryRows: Array<{
    container: Container;
    label: Text;
    value: Text;
  }> = [];

  private rankingsTitle: Text;
  private ranksContainer: Container;
  private rankCardEntries: Array<{
    container: Container;
    bg: Graphics;
    rankText: Text;
    nameText: Text;
    scoreText: Text;
    prizeText: Text;
  }> = [];

  private buttonContainer: Container;
  private buttonBg: Graphics;
  private buttonLabel: Text;

  private readonly handleAppMessage = (event: MessageEvent) => {
    if (this.destroyed) return;
    const { type } = event.data;
    if (type === "QUIT_GAME" || type === "GAME_LEAVE") {
      Logger.info("CrashResultScreen: QUIT_GAME or GAME_LEAVE", event.data);
      if (isFreeWin() || CURRENT_PARTNER === PARTNER_ID.bt) {
        navigation.closeWebView();
      } else {
        navigation.goBackToLobby(true);
      }
    }
  };

  constructor(config: CrashResultScreenConfig) {
    super();
    this.config = config;

    this.background = new SpaceBackground();
    this.addChild(this.background);

    const titleText = config.didWin ? "YOU WIN!" : "YOU LOSE!";
    const titleColor = config.didWin ? RESULT_COLORS.ALIVE : RESULT_COLORS.BUST;
    this.titleText = this.txt(titleText, 28, titleColor, FONT_WEIGHTS.BOLD, 3);
    this.addChild(this.titleText);

    const elapsedTime = config.elapsed ?? 0;
    this.subtitleText = this.txt(
      elapsedTime > 0
        ? `Heat reached 100% at ${elapsedTime.toFixed(2)}s`
        : "Round Complete",
      12,
      RESULT_COLORS.TEXT_DIM,
    );
    this.addChild(this.subtitleText);

    this.bannerContainer = this.buildProfitBanner();
    this.addChild(this.bannerContainer);

    this.summaryContainer = this.buildSummaryCard();
    this.addChild(this.summaryContainer);

    this.rankingsTitle = this.txt(
      "RANKINGS",
      11,
      RESULT_COLORS.TEXT_DIM,
      FONT_WEIGHTS.BOLD,
      1.5,
    );
    this.addChild(this.rankingsTitle);

    this.ranksContainer = new Container();
    const sorted = [...config.players].sort((a, b) => a.rank - b.rank);
    sorted.forEach((player, i) => {
      const entry = this.buildRankCard(player, player.id === config.myPlayerId);
      entry.container.y =
        i * (RESULT_LAYOUT.RANK_CARD_HEIGHT + RESULT_LAYOUT.CARD_GAP);
      this.ranksContainer.addChild(entry.container);
      this.rankCardEntries.push(entry);
    });
    this.addChild(this.ranksContainer);

    this.buttonContainer = new Container();
    this.buttonBg = new Graphics();
    this.buttonContainer.addChild(this.buttonBg);
    this.buttonLabel = this.txt(
      "NEXT ROUND",
      16,
      RESULT_COLORS.TEXT,
      FONT_WEIGHTS.BOLD,
      2,
    );
    this.buttonContainer.addChild(this.buttonLabel);
    this.buttonContainer.eventMode = "static";
    this.buttonContainer.cursor = "pointer";
    this.buttonContainer.on("pointerdown", this.handleNextRound);
    this.addChild(this.buttonContainer);
  }

  public async show(): Promise<void> {
    this.addWebviewListeners();
    this.animateIn();
  }

  public async hide(): Promise<void> {
    this.removeWebviewListeners();
    this.buttonContainer.off("pointerdown", this.handleNextRound);
    this.buttonContainer.eventMode = "none";

    gsap.killTweensOf(this);
    gsap.killTweensOf(this.children);
    for (const entry of this.rankCardEntries)
      gsap.killTweensOf(entry.container);
    gsap.killTweensOf(this.buttonContainer.scale);
  }

  public update(ticker: Ticker): void {
    if (!this.destroyed) this.background.update(ticker.deltaTime);
  }

  public resize(width: number, height: number): void {
    this.background.resize(width, height);
    const pad = RESULT_LAYOUT.PADDING;
    const cw = width - pad * 2;
    const cx = width / 2;
    let y = pad + 16;

    this.titleText.anchor.set(0.5, 0);
    this.titleText.x = cx;
    this.titleText.y = y;
    y += this.titleText.height + 4;

    this.subtitleText.anchor.set(0.5, 0);
    this.subtitleText.x = cx;
    this.subtitleText.y = y;
    y += this.subtitleText.height + 8;

    this.drawBanner(cw);
    this.bannerContainer.x = pad;
    this.bannerContainer.y = y;
    y += RESULT_LAYOUT.BANNER_HEIGHT + 8;

    this.drawSummary(cw);
    this.summaryContainer.x = pad;
    this.summaryContainer.y = y;
    const summaryH =
      RESULT_LAYOUT.SUMMARY_PADDING * 2 +
      this.summaryRows.length * RESULT_LAYOUT.SUMMARY_ROW_HEIGHT;
    y += summaryH + 10;

    this.rankingsTitle.x = pad;
    this.rankingsTitle.y = y;
    y += this.rankingsTitle.height + 6;

    this.ranksContainer.x = pad;
    this.ranksContainer.y = y;
    this.drawRankCards(cw);

    this.drawButton(cw);
    this.buttonContainer.x = pad;
    this.buttonContainer.y = height - RESULT_LAYOUT.BUTTON_HEIGHT - pad;
  }

  public destroy(options?: DestroyOptions): void {
    this.hide();
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }

  // --- Section builders (called once in constructor) ---

  private buildProfitBanner(): Container {
    const c = new Container();
    this.bannerBg = new Graphics();
    c.addChild(this.bannerBg);

    const survivalTime = this.config.yourSurvivalTime;
    const displayColor = this.config.didWin
      ? RESULT_COLORS.ALIVE
      : RESULT_COLORS.BUST;

    this.bannerAmount = this.txt(
      `${survivalTime.toFixed(2)}s`,
      28,
      displayColor,
      FONT_WEIGHTS.BOLD,
    );
    c.addChild(this.bannerAmount);

    this.bannerLabel = this.txt(
      "YOUR SURVIVAL TIME",
      10,
      RESULT_COLORS.TEXT_MUTED,
      FONT_WEIGHTS.BOLD,
      1.5,
    );
    c.addChild(this.bannerLabel);

    return c;
  }

  private buildSummaryCard(): Container {
    const c = new Container();
    this.summaryBg = new Graphics();
    c.addChild(this.summaryBg);

    const human = this.config.players.find(
      (p) => p.id === this.config.myPlayerId,
    );
    const rank = human?.rank ?? this.config.yourRank;
    const score = human?.survivalTime ?? this.config.yourSurvivalTime;
    const prize = human?.prize ?? this.config.yourPrize;

    const defs = [
      { label: "YOUR RANK", value: `#${rank}`, color: this.rankColor(rank) },
      {
        label: "SCORE",
        value: `${score.toFixed(2)}s`,
        color: RESULT_COLORS.TEXT,
      },
      {
        label: "PRIZE",
        value: `$${prize}`,
        color: prize > 0 ? RESULT_COLORS.GOLD : RESULT_COLORS.TEXT,
      },
    ];

    for (const d of defs) {
      const container = new Container();
      const label = this.txt(
        d.label,
        11,
        RESULT_COLORS.TEXT_DIM,
        FONT_WEIGHTS.BOLD,
        1,
      );
      const value = this.txt(d.value, 18, d.color, FONT_WEIGHTS.BOLD);
      container.addChild(label, value);
      c.addChild(container);
      this.summaryRows.push({ container, label, value });
    }

    return c;
  }

  private buildRankCard(player: CrashResultPlayer, isHuman: boolean) {
    const container = new Container();
    const bg = new Graphics();
    container.addChild(bg);

    const isBust = player.status === "bust";
    const rankFill =
      player.rank <= 3 ? RANK_FILL[player.rank - 1] : RESULT_COLORS.TEXT_MUTED;

    const rankText = this.txt(
      `#${player.rank}`,
      18,
      rankFill,
      FONT_WEIGHTS.BOLD,
    );
    container.addChild(rankText);

    const nameText = this.txt(
      player.name,
      14,
      isBust
        ? RESULT_COLORS.TEXT_MUTED
        : isHuman
          ? RESULT_COLORS.ACCENT
          : RESULT_COLORS.TEXT,
      isHuman ? FONT_WEIGHTS.BOLD : FONT_WEIGHTS.SEMIBOLD,
    );
    container.addChild(nameText);

    const scoreLabel =
      player.status === "bust" ? "BUST" : `${player.survivalTime.toFixed(2)}s`;
    const boostSuffix =
      player.boostCount > 0 ? ` (+${player.boostCount} boost)` : "";
    const scoreText = this.txt(
      scoreLabel + boostSuffix,
      12,
      isBust ? RESULT_COLORS.TEXT_MUTED : RESULT_COLORS.TEXT_DIM,
    );
    container.addChild(scoreText);

    const prizeText = this.txt(
      player.prize > 0 ? `$${player.prize}` : "$0",
      player.prize > 0 ? 20 : 14,
      player.prize > 0 ? rankFill : RESULT_COLORS.TEXT_MUTED,
      FONT_WEIGHTS.BOLD,
    );
    container.addChild(prizeText);

    if (isBust) container.alpha = 0.6;

    return { container, bg, rankText, nameText, scoreText, prizeText };
  }

  // --- Drawing helpers (called from resize) ---

  private drawBanner(w: number): void {
    const h = RESULT_LAYOUT.BANNER_HEIGHT;
    const bannerColor = this.config.didWin
      ? RESULT_COLORS.ALIVE
      : RESULT_COLORS.BUST;

    this.bannerBg.clear();
    this.bannerBg
      .roundRect(0, 0, w, h, RESULT_LAYOUT.CARD_RADIUS)
      .fill({ color: bannerColor, alpha: 0.08 });
    this.bannerBg
      .roundRect(0, 0, w, h, RESULT_LAYOUT.CARD_RADIUS)
      .stroke({ color: bannerColor, alpha: 0.19, width: 1 });

    this.bannerAmount.anchor.set(0.5, 0);
    this.bannerAmount.x = w / 2;
    this.bannerAmount.y = 6;
    this.bannerLabel.anchor.set(0.5, 0);
    this.bannerLabel.x = w / 2;
    this.bannerLabel.y = 38;
  }

  private drawSummary(w: number): void {
    const { SUMMARY_PADDING: p, SUMMARY_ROW_HEIGHT: rh } = RESULT_LAYOUT;
    const h = p * 2 + this.summaryRows.length * rh;

    this.summaryBg
      .clear()
      .roundRect(0, 0, w, h, 12)
      .fill({ color: RESULT_COLORS.SURFACE });

    for (let i = 0; i < this.summaryRows.length; i++) {
      const row = this.summaryRows[i];
      row.container.y = p + i * rh;
      row.label.x = p;
      row.label.y = (rh - row.label.height) / 2;
      row.value.anchor.set(1, 0);
      row.value.x = w - p;
      row.value.y = (rh - row.value.height) / 2;
    }
  }

  private drawRankCards(w: number): void {
    const h = RESULT_LAYOUT.RANK_CARD_HEIGHT;
    for (const entry of this.rankCardEntries) {
      entry.bg
        .clear()
        .roundRect(0, 0, w, h, RESULT_LAYOUT.CARD_RADIUS)
        .fill({ color: RESULT_COLORS.SURFACE });

      entry.rankText.x = 14;
      entry.rankText.y = (h - entry.rankText.height) / 2;
      entry.nameText.x = 50;
      entry.nameText.y = 6;
      entry.scoreText.x = 50;
      entry.scoreText.y = 26;
      entry.prizeText.anchor.set(1, 0.5);
      entry.prizeText.x = w - 14;
      entry.prizeText.y = h / 2;
    }
  }

  private drawButton(w: number): void {
    const h = RESULT_LAYOUT.BUTTON_HEIGHT;
    this.buttonBg
      .clear()
      .roundRect(0, 0, w, h, RESULT_LAYOUT.BUTTON_RADIUS)
      .fill({ color: RESULT_COLORS.ACCENT });
    this.buttonLabel.anchor.set(0.5, 0.5);
    this.buttonLabel.x = w / 2;
    this.buttonLabel.y = h / 2;
  }

  // --- Animation ---

  private animateIn(): void {
    const sections = [
      this.titleText,
      this.subtitleText,
      this.bannerContainer,
      this.summaryContainer,
    ];
    for (let i = 0; i < sections.length; i++) {
      const el = sections[i];
      el.alpha = 0;
      const finalY = el.y;
      el.y = finalY + 20;
      gsap.to(el, {
        y: finalY,
        alpha: 1,
        duration: 0.4,
        delay: i * 0.1,
        ease: "power2.out",
      });
    }

    this.rankingsTitle.alpha = 0;
    gsap.to(this.rankingsTitle, { alpha: 1, duration: 0.3, delay: 0.35 });

    for (let i = 0; i < this.rankCardEntries.length; i++) {
      const card = this.rankCardEntries[i].container;
      card.alpha = 0;
      const finalX = card.x;
      card.x = finalX + 300;
      gsap.to(card, {
        x: finalX,
        alpha: 1,
        duration: 0.5,
        delay: 0.45 + i * 0.12,
        ease: "back.out(1.2)",
      });
    }

    this.buttonContainer.alpha = 0;
    const btnDelay = 0.45 + this.rankCardEntries.length * 0.12;
    gsap.to(this.buttonContainer, { alpha: 1, duration: 0.4, delay: btnDelay });
  }

  // --- Utilities ---

  private txt(
    content: string,
    size: number,
    fill: number,
    fontWeight: (typeof FONT_WEIGHTS)[keyof typeof FONT_WEIGHTS] = FONT_WEIGHTS.REGULAR,
    letterSpacing = 0,
  ): Text {
    return new Text({
      text: content,
      style: {
        fontFamily: FONTS.SECONDARY,
        fontSize: size,
        fill,
        fontWeight,
        letterSpacing,
      },
    });
  }

  private readonly handleNextRound = () => {
    if (this.destroyed) return;
    this.buttonContainer.eventMode = "none";
    gsap.to(this.buttonContainer.scale, {
      x: 0.95,
      y: 0.95,
      duration: 0.06,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        if (this.destroyed) return;
        if (this.config.onNextRound) {
          this.config.onNextRound();
        } else if (isFreeWin() || CURRENT_PARTNER === PARTNER_ID.bt) {
          navigation.closeWebView();
        } else {
          navigation.goBackToLobby(true);
        }
      },
    });
  };

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

  private rankColor(rank: number): number {
    if (rank >= 1 && rank <= 3) return RANK_FILL[rank - 1];
    return RESULT_COLORS.TEXT;
  }
}

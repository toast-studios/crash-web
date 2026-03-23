import { Container, Sprite, Text, type DestroyOptions } from "pixi.js";
import gsap from "gsap";
import type {
  CrashFeedMessage,
  CrashFeedActionType,
  CrashPlayer,
} from "../../types/crashGame";
import { CRASH_ASSETS } from "../../constants/crashLayout";
import { FONTS, FONT_WEIGHTS } from "../../constants/typography";

const FEED_COLORS: Record<CrashFeedActionType, number> = {
  cool: 0x51eeff,
  boost: 0xffac37,
  exit: 0x4ecf78,
  bust: 0xff4444,
} as const;

const FEED_LABELS: Record<CrashFeedActionType, string> = {
  cool: "COOLED!",
  boost: "HEATED!",
  exit: "CASHED OUT!",
  bust: "BUST!",
} as const;

const FEED_LAYOUT = {
  MAX_VISIBLE_ROWS: 6,
  ROW_HEIGHT: 22,
  ROW_BG_SCALE: 0.5,
  FONT_SIZE: 10,
  NAME_MAX_CHARS: 13,
  TEXT_PADDING_LEFT: 8,
  TEXT_PADDING_RIGHT: 6,
  PRIZE_GAP: 4,
  PRIZE_FONT_SIZE: 10,
  FADE_IN_DURATION: 0.15,
  REPOSITION_DURATION: 0.15,
} as const;

interface FeedRow {
  container: Container;
  msgId: string;
}

/**
 * Scrollable activity feed showing recent player actions.
 * Uses diff-based updates keyed on message id to avoid flicker
 * when the server broadcasts state at high frequency (~10 Hz).
 * Only truly new messages get a fade-in animation; existing rows
 * are repositioned smoothly if their order changes.
 */
export class CrashFeed extends Container {
  private rowMap = new Map<string, FeedRow>();

  constructor() {
    super();
  }

  public updateMessages(
    messages: CrashFeedMessage[],
    players?: CrashPlayer[],
  ): void {
    const visible = messages.slice(0, FEED_LAYOUT.MAX_VISIBLE_ROWS);
    const incomingIds = visible.map((m) => m.id);
    const incomingSet = new Set(incomingIds);

    this.removeStaleRows(incomingSet);

    for (let i = 0; i < visible.length; i++) {
      const msg = visible[i];
      const targetY = i * FEED_LAYOUT.ROW_HEIGHT;
      const existing = this.rowMap.get(msg.id);

      if (existing) {
        this.repositionRow(existing.container, targetY);
      } else {
        this.addNewRow(msg, targetY, players);
      }
    }
  }

  public destroy(options?: DestroyOptions): void {
    this.clearAllRows();
    super.destroy({
      children: true,
      ...(typeof options === "object" ? options : {}),
    });
  }

  private addNewRow(
    msg: CrashFeedMessage,
    targetY: number,
    players?: CrashPlayer[],
  ): void {
    const row = this.createRow(msg, players);
    row.y = targetY;
    row.alpha = 0;
    this.addChild(row);
    this.rowMap.set(msg.id, { container: row, msgId: msg.id });

    gsap.to(row, { alpha: 1, duration: FEED_LAYOUT.FADE_IN_DURATION });
  }

  private repositionRow(container: Container, targetY: number): void {
    if (Math.abs(container.y - targetY) < 0.5) return;
    gsap.to(container, {
      y: targetY,
      duration: FEED_LAYOUT.REPOSITION_DURATION,
      overwrite: "auto",
    });
  }

  private removeStaleRows(keepSet: Set<string>): void {
    for (const [id, row] of this.rowMap) {
      if (keepSet.has(id)) continue;
      gsap.killTweensOf(row.container);
      row.container.destroy({ children: true });
      this.rowMap.delete(id);
    }
  }

  private createRow(msg: CrashFeedMessage, players?: CrashPlayer[]): Container {
    const row = new Container();

    const truncatedName = this.truncateName(msg.playerName);

    const nameText = new Text({
      text: truncatedName,
      style: {
        fontFamily: FONTS.SECONDARY,
        fontSize: FEED_LAYOUT.FONT_SIZE,
        fontWeight: FONT_WEIGHTS.REGULAR,
        fill: 0xffffff,
      },
    });
    nameText.anchor.set(0, 0.5);
    nameText.x = FEED_LAYOUT.TEXT_PADDING_LEFT;

    const actionColor = FEED_COLORS[msg.action] ?? 0xffffff;
    const actionLabel = FEED_LABELS[msg.action] ?? msg.action.toUpperCase();

    const actionText = new Text({
      text: actionLabel,
      style: {
        fontFamily: FONTS.SECONDARY,
        fontSize: FEED_LAYOUT.FONT_SIZE,
        fontWeight: FONT_WEIGHTS.BOLD,
        fill: actionColor,
        fontStyle: "italic",
      },
    });
    actionText.anchor.set(0, 0.5);
    actionText.x = nameText.x + nameText.width + FEED_LAYOUT.TEXT_PADDING_RIGHT;

    let rightmostX = actionText.x + actionText.width;

    let prizeContainer: Container | null = null;
    if (msg.action === "exit") {
      const prize = this.lookupPrize(msg.playerName, players);
      if (prize > 0) {
        prizeContainer = new Container();

        const prizeSprite = Sprite.from(CRASH_ASSETS.CASH_OUT_AMOUNT_CONTAINER);
        prizeSprite.anchor.set(0, 0.5);
        prizeSprite.scale.set(0.5);

        const prizeText = new Text({
          text: `$${prize}`,
          style: {
            fontFamily: FONTS.SECONDARY,
            fontSize: FEED_LAYOUT.PRIZE_FONT_SIZE,
            fontWeight: FONT_WEIGHTS.BOLD,
            fill: FEED_COLORS.exit,
          },
        });
        prizeText.anchor.set(0.5, 0.5);
        prizeText.x = prizeSprite.width / 2;
        prizeText.y = 0;

        prizeContainer.addChild(prizeSprite);
        prizeContainer.addChild(prizeText);

        prizeContainer.x =
          actionText.x + actionText.width + FEED_LAYOUT.PRIZE_GAP;
        rightmostX = prizeContainer.x + prizeSprite.width;
      }
    }

    const bg = Sprite.from(CRASH_ASSETS.PLAYER_NAME_HIGHLIGHTER);
    bg.anchor.set(0, 0.5);
    const totalWidth = rightmostX + FEED_LAYOUT.TEXT_PADDING_RIGHT;
    bg.width = totalWidth;
    bg.height = bg.texture.height * FEED_LAYOUT.ROW_BG_SCALE;

    row.addChild(bg);
    row.addChild(nameText);
    row.addChild(actionText);
    if (prizeContainer) {
      row.addChild(prizeContainer);
    }

    return row;
  }

  private truncateName(name: string): string {
    if (name.length <= FEED_LAYOUT.NAME_MAX_CHARS) return name;
    return name.slice(0, FEED_LAYOUT.NAME_MAX_CHARS) + "...";
  }

  private lookupPrize(playerName: string, players?: CrashPlayer[]): number {
    if (!players) return 0;
    const match = players.find((p) => p.name === playerName);
    return match?.prize ?? 0;
  }

  private clearAllRows(): void {
    for (const [, row] of this.rowMap) {
      gsap.killTweensOf(row.container);
      row.container.destroy({ children: true });
    }
    this.rowMap.clear();
  }
}

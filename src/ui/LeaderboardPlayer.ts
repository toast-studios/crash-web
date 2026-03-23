import { Container, Sprite, Text, Texture, NineSliceSprite } from "pixi.js";
import { ProfilePicture } from "./ProfilePicture";
import { TOURNAMENT_STYLES } from "./TournamentStyles";
import { ColumnState } from "./Leaderboard";
import { ScoreBox } from "./ScoreBox";
import { ColumnResultBadge, ColumnResultType } from "./ColumnResultBadge";
import gsap from "gsap";

export type LeaderboardPlayerVariant = "large" | "compact";

export class LeaderboardPlayer extends Container {
  public readonly userId: string;
  private background: NineSliceSprite;
  private rankText: Text;
  private avatarContainer: ProfilePicture;
  private nameText: Text;
  private columnsStateContainer: Container;
  private scoreBackground: Sprite;
  private scoreText: Text;
  private scoreDiffText: Text;
  private moneyBackground: NineSliceSprite;
  public rank: number = 0;
  private readyText: Text;
  private _originalName: string = "";
  private _isUser: boolean = false;
  private isDraftingPhase: boolean = false;
  private maxNameWidth: number = 0;
  private variant: LeaderboardPlayerVariant = "compact";
  private doNotHighlightUserBackground: boolean = false;
  private hideColumnsState: boolean = false;
  private currentScore: number = 0;
  private columnScoreBoxes: ScoreBox[] = [];
  private columnScoreBoxesContainer: Container;
  private columnResultBadges: ColumnResultBadge[] = [];
  private columnResultsContainer: Container;

  private activeTexture: Texture = Texture.from(
    "leaderboard_player_completed_columns_state",
  );
  private inactiveTexture: Texture = Texture.from(
    "leaderboard_player_no_complete_columns_state",
  );

  constructor(data: {
    userId: string;
    name: string;
    score: number;
    fallbackImageUrl: string;
    doNotHighlightUserBackground?: boolean;
    dimension: {
      height: number;
      width: number;
    };
    avatarUrl: string;
    columnsState: ColumnState[];
    rank: number;
    isUser: boolean;
    isTopper: boolean;
    isDraftingPhase: boolean;
    variant: LeaderboardPlayerVariant;
    hideColumnsState?: boolean;
    columnResults?: ColumnResultType[];
  }) {
    super();

    this.userId = data.userId;
    this.rank = data.rank || 0;
    this._originalName = data.name;
    this._isUser = !!data.isUser;
    this.isDraftingPhase = !!data.isDraftingPhase;
    this.variant = data.variant || "default";
    this.doNotHighlightUserBackground = !!data.doNotHighlightUserBackground;
    this.hideColumnsState = !!data.hideColumnsState;

    const { height, width } = data.dimension;
    this.background = new NineSliceSprite({
      texture: Texture.from(
        data.isUser && !this.doNotHighlightUserBackground
          ? "leaderboard_self_player_card_container"
          : "leaderboard_player_card_container",
      ),
      leftWidth: 35,
      topHeight: 35,
      rightWidth: 35,
      bottomHeight: 35,
      height,
      width,
    });
    this.addChild(this.background);

    const moneyBackgroundTexture = Texture.from(
      "leaderboard_player_money_in_background",
    );
    this.moneyBackground = new NineSliceSprite({
      texture: moneyBackgroundTexture,
      leftWidth: moneyBackgroundTexture.height / 2,
      topHeight: moneyBackgroundTexture.height / 2,
      rightWidth: moneyBackgroundTexture.height / 2,
      bottomHeight: moneyBackgroundTexture.height / 2,
      height,
    });
    this.moneyBackground.visible = !!data.isTopper && !this.isDraftingPhase;
    this.addChild(this.moneyBackground);

    this.rankText = new Text({
      text: data.rank?.toString(),
      style: TOURNAMENT_STYLES.LEADERBOARD.PLAYER.RANK,
    });
    this.rankText.visible = !this.isDraftingPhase;
    this.addChild(this.rankText);

    this.avatarContainer = new ProfilePicture({
      imageUrl: data.avatarUrl,
      fallbackImageUrl: data.fallbackImageUrl,
      isOpponent: false,
      useWhiteBorder: !data.isUser,
      size: height,
    });
    this.addChild(this.avatarContainer);

    this.nameText = new Text({
      text: this._isUser ? this._originalName + " (You)" : this._originalName,
      style: TOURNAMENT_STYLES.LEADERBOARD.PLAYER.NAME,
    });
    this.addChild(this.nameText);

    this.columnsStateContainer = new Container();
    this.addChild(this.columnsStateContainer);

    this.readyText = new Text({
      text: "Ready",
      style: TOURNAMENT_STYLES.LEADERBOARD.PLAYER.READY,
    });
    this.readyText.visible = false;
    this.addChild(this.readyText);

    const states = data.columnsState || [
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
      ColumnState.INACTIVE,
    ];

    this.updateColumnsState(states);

    this.scoreBackground = Sprite.from(
      data.isUser && !this.doNotHighlightUserBackground
        ? "leaderboard_player_score_container_self"
        : "leaderboard_player_score_container",
    );

    this.scoreBackground.visible = !this.isDraftingPhase;
    this.addChild(this.scoreBackground);

    this.scoreText = new Text({
      text: `${data.score}`,
      style: TOURNAMENT_STYLES.LEADERBOARD.PLAYER.SCORE,
    });
    this.scoreText.alpha = data.isUser ? 1 : 0.5;
    this.scoreText.visible = !this.isDraftingPhase;
    this.addChild(this.scoreText);

    this.currentScore = data.score;

    this.scoreDiffText = new Text({
      text: "",
      style: {
        ...TOURNAMENT_STYLES.LEADERBOARD.PLAYER.SCORE,
        fill: "#00FF00",
      },
    });
    this.scoreDiffText.alpha = 0;
    this.scoreDiffText.visible = false;
    this.addChild(this.scoreDiffText);

    // Create column score boxes container (for phase two animation)
    this.columnScoreBoxesContainer = new Container();
    this.columnScoreBoxesContainer.visible = false;
    this.addChild(this.columnScoreBoxesContainer);

    // Create column results badges container
    this.columnResultsContainer = new Container();
    this.addChild(this.columnResultsContainer);

    if (data.columnResults) {
      this.updateColumnResults(data.columnResults);
    }

    this.setupLayout();
    this.updateLayout(width, data.variant);
  }

  private setupLayout() {
    const variants = {
      large: {
        rankFontSize: 22,
        nameFontSize: 18,
        scoreFontSize: 22,
      },
      compact: {
        rankFontSize: TOURNAMENT_STYLES.LEADERBOARD.PLAYER.RANK.fontSize,
        nameFontSize: TOURNAMENT_STYLES.LEADERBOARD.PLAYER.NAME.fontSize,
        scoreFontSize: TOURNAMENT_STYLES.LEADERBOARD.PLAYER.SCORE.fontSize,
      },
    };

    const layout = variants[this.variant];

    this.rankText.style.fontSize = layout.rankFontSize;
    this.nameText.style.fontSize = layout.nameFontSize;
    this.scoreText.style.fontSize = layout.scoreFontSize;
  }

  public updateLayout(width: number, variant: LeaderboardPlayerVariant) {
    const variants = {
      large: {
        avatarContainerPadding: 28,
        padding: 20,
        nameTextY: 6,
        nameTextPadding: 10,
        moneyBackgroundWidth: 70,
        nameToBadgesGap: 5,
      },
      compact: {
        avatarContainerPadding: 23,
        padding: 10,
        nameTextY: 6,
        nameTextPadding: 10,
        moneyBackgroundWidth: 70,
        nameToBadgesGap: 6,
      },
    };
    const layout = variants[variant];
    const padding = layout.padding;
    const startX = padding;
    const endX = width - padding;

    this.background.width = width;

    // Update money background to match card height
    this.moneyBackground.height = this.background.height;
    this.moneyBackground.width = layout.moneyBackgroundWidth;

    this.rankText.x = startX;
    this.rankText.y = this.background.height / 2 - this.rankText.height / 2;

    this.avatarContainer.x = startX + layout.avatarContainerPadding;
    this.avatarContainer.y =
      this.background.height / 2 - this.avatarContainer.height / 2 + 1;

    this.nameText.x =
      this.avatarContainer.x +
      this.avatarContainer.width +
      layout.nameTextPadding;
    this.nameText.y = layout.nameTextY;

    let scoreBackgroundPadding = 5;

    if (this._isUser && !this.doNotHighlightUserBackground) {
      scoreBackgroundPadding = 3;
    }
    this.scoreBackground.height =
      this.background.height - scoreBackgroundPadding;
    this.scoreBackground.width =
      this.scoreBackground.height + scoreBackgroundPadding;

    // Calculate available width for nameText (excluding rank, avatar, score)
    const nameTextStartX = this.nameText.x;
    const scoreBackgroundStartX = endX - this.scoreBackground.width;
    const namePadding = 35; // Increased padding to avoid overlapping with score diff animation
    this.maxNameWidth = scoreBackgroundStartX - nameTextStartX - namePadding;

    // Truncate name text if needed
    this.truncateNameText();

    this.columnsStateContainer.x = this.nameText.x + 3;
    this.columnsStateContainer.y = this.nameText.y + this.nameText.height + 8;

    this.readyText.x = this.nameText.x;
    this.readyText.y = this.nameText.y + this.nameText.height + 3;

    // Position column results badges container below name (tight gap so name + badges fit in card)
    this.columnResultsContainer.x = this.nameText.x;
    this.columnResultsContainer.y =
      this.nameText.y + this.nameText.height + layout.nameToBadgesGap;

    this.scoreBackground.x = endX - this.scoreBackground.width + 5;
    this.scoreBackground.y =
      this.background.height / 2 - this.scoreBackground.height / 2;
    this.scoreText.x =
      this.scoreBackground.x +
      this.scoreBackground.width / 2 -
      this.scoreText.width / 2;
    this.scoreText.y =
      this.scoreBackground.y +
      this.scoreBackground.height / 2 -
      this.scoreText.height / 2;

    // Position scoreDiffText at the left of scorebox (starting position for animation)
    this.scoreDiffText.y =
      this.scoreBackground.y +
      this.scoreBackground.height / 2 -
      this.scoreDiffText.height / 2;
  }

  public updateData(data: {
    name?: string;
    rank?: number;
    score?: number;
    columnsState?: ColumnState[];
    isUser?: boolean;
    isTopper?: boolean;
    isDraftingPhase?: boolean;
    columnResults?: ColumnResultType[];
  }) {
    this.isDraftingPhase = !!data.isDraftingPhase;

    if (data.name !== undefined) {
      this._originalName = data.name;
    }

    if (data.isUser !== undefined) {
      this._isUser = data.isUser;
    }

    if (data.rank !== undefined) {
      this.rankText.text = data.rank.toString();
    }

    if (data.score !== undefined) {
      const newScore = data.score;
      const diff = newScore - this.currentScore;

      if (diff !== 0 && this.currentScore !== 0) {
        this.animateScoreDiff(diff);
      }

      this.currentScore = newScore;
      this.scoreText.text = `${data.score}`;
      // Score background will be resized in updateLayout
    }

    if (data.isTopper !== undefined) {
      this.moneyBackground.visible = data.isTopper && !this.isDraftingPhase;
    } else if (data.isDraftingPhase !== undefined) {
      if (this.isDraftingPhase) {
        this.moneyBackground.visible = false;
      }
    }

    if (data.columnsState) {
      this.updateColumnsState(data.columnsState);
    } else if (data.isDraftingPhase !== undefined) {
      // Re-evaluate ready state if phase changed but columnsState didn't (though usually they come together or we should store columnsState)
      // Since we don't store columnsState explicitly in a property other than children, we might need to rely on what's passed or just assume updateData is called with state.
      // For now, let's assume if phase changes, we might need to refresh visibility if we had the state.
      // But without storing state, we can't re-check 'all completed'.
      // Ideally, we should store columnsState.
    }

    if (data.columnResults) {
      this.updateColumnResults(data.columnResults);
    }

    this.rankText.visible = !this.isDraftingPhase;
    this.scoreBackground.visible = !this.isDraftingPhase;
    this.scoreText.visible = !this.isDraftingPhase;

    this.updateLayout(this.background.width, this.variant);
  }

  private truncateNameText() {
    const originalText = this._isUser
      ? this._originalName + " (You)"
      : this._originalName;

    // Set the full text first to measure
    this.nameText.text = originalText;

    // If it fits, we're done
    if (this.nameText.width <= this.maxNameWidth) {
      return;
    }

    // Otherwise, truncate with ellipsis
    let truncatedText = originalText;
    const ellipsis = "...";

    // Binary search for the right length
    let left = 0;
    let right = originalText.length;

    while (left < right) {
      const mid = Math.floor((left + right + 1) / 2);
      truncatedText = originalText.substring(0, mid) + ellipsis;
      this.nameText.text = truncatedText;

      if (this.nameText.width <= this.maxNameWidth) {
        left = mid;
      } else {
        right = mid - 1;
      }
    }

    truncatedText = originalText.substring(0, left) + ellipsis;
    this.nameText.text = truncatedText;
  }
  public getCurrentColumnState(): ColumnState[] {
    return this.columnsStateContainer.children.map((child) => {
      if (child instanceof Sprite) {
        return child.texture === this.activeTexture
          ? ColumnState.ACTIVE
          : ColumnState.INACTIVE;
      }
      return ColumnState.INACTIVE;
    });
  }

  public updateColumnsState(states: ColumnState[]) {
    let allCompleted = true;

    states.forEach((state, index) => {
      if (state !== ColumnState.COMPLETED) {
        allCompleted = false;
      }

      let texture = this.inactiveTexture;
      let isActive = false;

      if (state === ColumnState.COMPLETED || state === ColumnState.ACTIVE) {
        texture = this.activeTexture;
      }

      if (state === ColumnState.ACTIVE) {
        isActive = true;
      }
      let child = this.columnsStateContainer.children[index];
      const isNewChild = !child;

      if (!child) {
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.scale.set(0.5);
        sprite.x = index * (sprite.width + 2);
        child = sprite;
        this.columnsStateContainer.addChild(sprite);
      }

      const wasActive = gsap.isTweening(child);

      if (child instanceof Sprite) {
        child.texture = texture;
      }

      if (isActive) {
        // Only start animation if it wasn't already active
        if (!wasActive || isNewChild) {
          gsap.killTweensOf(child);
          gsap.to(child, {
            alpha: 0.2,
            duration: 0.7,
            delay: index * 0.7,
            yoyo: true,
            repeat: -1,
          });
        }
      } else {
        gsap.killTweensOf(child);
        child.alpha = 1;
      }
    });

    if (this.hideColumnsState) {
      this.columnsStateContainer.visible = false;
      this.readyText.visible = false;
    } else if (this.isDraftingPhase && allCompleted) {
      this.columnsStateContainer.visible = false;
      this.readyText.visible = true;
    } else {
      this.columnsStateContainer.visible = true;
      this.readyText.visible = false;
    }
  }

  private animateScoreDiff(diff: number) {
    // Kill any ongoing animation
    gsap.killTweensOf(this.scoreDiffText);

    // Set the text and color based on positive or negative diff
    const isPositive = diff > 0;
    this.scoreDiffText.text = isPositive ? `+${diff}` : `${diff}`;
    this.scoreDiffText.style.fill = isPositive ? "#00FF00" : "#FF0000";

    // Position at the left of the scorebox
    const startX = this.scoreBackground.x - this.scoreDiffText.width - 5;

    this.scoreDiffText.x = startX;
    this.scoreDiffText.y =
      this.scoreBackground.y +
      this.scoreBackground.height / 2 -
      this.scoreDiffText.height / 2;

    // Make visible and reset alpha
    this.scoreDiffText.visible = true;
    this.scoreDiffText.alpha = 1;

    // Calculate target position (center of scorebox)
    const targetX =
      this.scoreBackground.x +
      this.scoreBackground.width / 2 -
      this.scoreDiffText.width / 2;

    // Hold at initial position for 1 second, then animate to scorebox while fading out
    gsap.to(this.scoreDiffText, {
      x: targetX,
      alpha: 0,
      duration: 0.8,
      delay: 1.0,
      ease: "power2.out",
      onComplete: () => {
        this.scoreDiffText.visible = false;
      },
    });
  }

  private updateColumnResults(results: ColumnResultType[]) {
    // Clear existing badges
    this.columnResultBadges.forEach((badge) => badge.destroy());
    this.columnResultBadges = [];
    this.columnResultsContainer.removeChildren();

    // Only show badges if not in drafting phase and results exist
    if (this.isDraftingPhase || !results || results.length === 0) {
      this.columnResultsContainer.visible = false;
      return;
    }

    const badgeSpacing = 4;
    let currentX = 0;

    results.forEach((result, index) => {
      const badge = new ColumnResultBadge(result);
      badge.x = currentX;
      badge.y = 0;

      // Optional: Add subtle entrance animation
      badge.alpha = 0;
      badge.scale.set(0.8);
      gsap.to(badge, {
        alpha: 1,
        scale: 1,
        duration: 0.4,
        delay: index * 0.1,
        ease: "back.out(1.5)",
      });

      this.columnResultBadges.push(badge);
      this.columnResultsContainer.addChild(badge);

      currentX += badge.getBadgeWidth() + badgeSpacing;
    });

    this.columnResultsContainer.visible = true;
  }

  public async animateColumnScores(columnScores: [number, number, number]) {
    if (!this._isUser) return;

    // Clear existing score boxes
    this.columnScoreBoxes.forEach((box) => box.destroy());
    this.columnScoreBoxes = [];
    this.columnScoreBoxesContainer.removeChildren();

    // Calculate the size based on scoreBackground
    const boxHeight = this.scoreBackground.height * 0.9;
    const boxWidth = 50;
    const spacing = 5;

    // Create three score boxes
    for (let i = 0; i < 3; i++) {
      const scoreBox = new ScoreBox({
        score: columnScores[i],
        width: boxWidth,
        height: boxHeight,
      });

      // Position to the left of scoreBackground
      const totalWidth = boxWidth * 3 + spacing * 2;
      scoreBox.x =
        this.scoreBackground.x - totalWidth + i * (boxWidth + spacing) - 20;
      scoreBox.y = this.scoreBackground.y;

      // Start invisible and below
      scoreBox.alpha = 0;
      scoreBox.y += 20;

      this.columnScoreBoxes.push(scoreBox);
      this.columnScoreBoxesContainer.addChild(scoreBox);
    }

    // Show container
    this.columnScoreBoxesContainer.visible = true;

    // Hide player name
    gsap.to(this.nameText, {
      alpha: 0,
      duration: 0.3,
    });

    // Fade up all three boxes sequentially
    await Promise.all(
      this.columnScoreBoxes.map((box, index) => {
        return gsap.to(box, {
          alpha: 1,
          y: this.scoreBackground.height / 2 - box.height / 2 + 3,
          duration: 0.5,
          delay: index * 0.15,
          ease: "back.out(1.5)",
        });
      }),
    );

    // Wait for 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Merge all boxes into the total score
    const targetX = this.scoreBackground.x;

    await Promise.all(
      this.columnScoreBoxes.map((box, index) => {
        return gsap.to(box, {
          x: targetX,
          // alpha: 0,
          duration: 0.6,
          delay: index * 0.1,
          ease: "power2.in",
        });
      }),
    );

    // Hide the container
    this.columnScoreBoxesContainer.visible = false;

    // Show player name again
    gsap.to(this.nameText, {
      alpha: 1,
      duration: 0.3,
    });
  }
}

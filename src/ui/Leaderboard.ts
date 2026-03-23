import { Container } from "pixi.js";
import gsap from "gsap";
import { LeaderboardPlayer } from "./LeaderboardPlayer";
import { LeaderboardScrollContainer } from "./LeaderboardScrollContainer";
import { app } from "../app";
import { StoreData } from "../store/storeTypes";
import { Logger } from "../utils/logger";
import { ColumnResultUiType } from "../constants/columnResult";

export interface PlayerData {
  gameUserId: string;
  score: number;
  rank: number;
  isTopper: boolean;
}

export interface PlayerExtraData {
  columnsState: ColumnState[];
  columnResults?: ColumnResultUiType[];
}

export enum ColumnState {
  INACTIVE = "INACTIVE",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
}

export type LeaderboardVariant = "in-game" | "result" | "flat";

export class Leaderboard extends Container {
  private scrollContainer: LeaderboardScrollContainer | undefined;
  private playersContainer: Container | undefined;
  private playerCard: LeaderboardPlayer | undefined;
  private minHeightOfPlayerCard: number;
  private minWidthOfPlayerCard: number;
  private scrollablePlayerCardWidth: number;
  private gapBetweenEachPlayerCard: number;
  private scrollHeight: number;
  private scrollbarSpace = 15;
  private variant: LeaderboardVariant = "in-game";
  public playerMap: Map<string, LeaderboardPlayer> = new Map();
  private currentPlayers: PlayerData[] = [];
  private currentUserId: string = "";

  constructor({
    leaderboardPlayers,
    extra,
    players,
    currentUserId,
    isDraftingPhase = false,
    variant = "in-game",
  }: {
    leaderboardPlayers: PlayerData[];
    extra: Record<string, PlayerExtraData>;
    players: StoreData["players"];
    currentUserId: string;
    isDraftingPhase?: boolean;
    variant?: LeaderboardVariant;
  }) {
    super();

    this.currentUserId = currentUserId;
    this.variant = variant;
    this.scrollHeight = variant === "result" ? 250 : 170;
    this.minHeightOfPlayerCard =
      variant === "result" || variant === "flat" ? 60 : 50;
    this.gapBetweenEachPlayerCard =
      variant === "result" || variant === "flat" ? 8 : 7;

    const screenWidth = app.screen.width;
    const targetWidth =
      variant === "result" || variant === "flat"
        ? screenWidth - 55
        : screenWidth - 40;

    const containerWidth = targetWidth;

    this.minWidthOfPlayerCard = containerWidth;
    this.scrollablePlayerCardWidth = containerWidth - this.scrollbarSpace;

    this.currentPlayers = leaderboardPlayers;

    if (variant === "flat") {
      this.playersContainer = new Container();
      this.addChild(this.playersContainer);
      this.addPlayersToFlatArea(
        leaderboardPlayers,
        extra,
        players,
        currentUserId,
        isDraftingPhase,
      );
    } else {
      this.scrollContainer = new LeaderboardScrollContainer({
        width: containerWidth,
        scrollHeight: this.scrollHeight,
        minHeightOfPlayerCard: this.minHeightOfPlayerCard,
      });
      this.scrollContainer.y = variant === "result" ? 0 : 10;
      this.addChild(this.scrollContainer);
      this.addPlayersToScrollableArea(
        leaderboardPlayers,
        extra,
        players,
        currentUserId,
        isDraftingPhase,
      );
      this.createCurrentUserCard(
        leaderboardPlayers,
        extra,
        players,
        currentUserId,
        isDraftingPhase,
      );
    }

    this.updateLayout(app.screen.width, app.screen.height);
    this.scrollContainer?.refreshScrollbar();
  }

  public resize(width: number, height: number) {
    this.updateLayout(width, height);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public updateLayout(width: number, __height: number) {
    const targetWidth =
      this.variant === "result" || this.variant === "flat"
        ? width - 55
        : width - 40;
    const containerWidth = targetWidth;
    this.minWidthOfPlayerCard = containerWidth;
    this.scrollablePlayerCardWidth = containerWidth - this.scrollbarSpace;

    const cardVariant =
      this.variant === "result" || this.variant === "flat"
        ? "large"
        : "compact";

    if (this.variant === "flat" && this.playersContainer) {
      this.playersContainer.children.forEach((child, index) => {
        if (child instanceof LeaderboardPlayer) {
          child.y =
            index *
            (this.minHeightOfPlayerCard + this.gapBetweenEachPlayerCard);
          child.updateLayout(containerWidth, cardVariant);
        }
      });
      return;
    }

    this.scrollContainer?.updateMask(containerWidth);

    if (this.playerCard) {
      this.playerCard.updateLayout(this.minWidthOfPlayerCard, cardVariant);
      this.playerCard.y = this.scrollContainer!.y + this.scrollHeight + 5;
    }

    this.layoutPlayers(this.scrollablePlayerCardWidth);
  }

  private layoutPlayers(containerWidth: number) {
    const cardVariant =
      this.variant === "result" || this.variant === "flat"
        ? "large"
        : "compact";
    this.getListContainer().children.forEach((child) => {
      if (child instanceof LeaderboardPlayer) {
        child.updateLayout(containerWidth, cardVariant);
      }
    });
  }

  public updatePlayers({
    leaderboardPlayers,
    extra,
    players,
    currentUserId,
    isDraftingPhase = false,
  }: {
    leaderboardPlayers: PlayerData[];
    extra: Record<string, PlayerExtraData>;
    players: StoreData["players"];
    currentUserId: string;
    isDraftingPhase?: boolean;
  }) {
    const playersWithChangedScores =
      this.getPlayersWithChangedScores(leaderboardPlayers);

    if (this.variant !== "flat") {
      this.updateCurrentUserCard(
        leaderboardPlayers,
        players,
        currentUserId,
        isDraftingPhase,
      );
    }

    this.updateScrollablePlayers(
      leaderboardPlayers,
      players,
      extra,
      currentUserId,
      isDraftingPhase,
      playersWithChangedScores,
    );
    this.removeOldPlayers(leaderboardPlayers);

    this.currentPlayers = leaderboardPlayers;
    this.scrollContainer?.refreshScrollbar();
  }

  public transitionToPhaseTwo() {
    this.currentPlayers.forEach((player) => {
      const card = this.playerMap.get(player.gameUserId);
      if (card) {
        // Update phase first
        card.updateData({
          isDraftingPhase: false,
          isTopper: player.isTopper,
        });

        // Reset all columns to a clean state: first column active, others inactive
        // This ensures only column 0 blinks
        const newColumnsState = [
          ColumnState.ACTIVE,
          ColumnState.INACTIVE,
          ColumnState.INACTIVE,
        ];
        card.updateColumnsState(newColumnsState);
      }
    });

    // Update the separate player card at bottom - this will hide "Ready" text
    if (this.playerCard) {
      this.playerCard.updateData({
        isDraftingPhase: false,
      });
      // Reset columns state for bottom card - only first column active
      const newColumnsState = [
        ColumnState.ACTIVE,
        ColumnState.INACTIVE,
        ColumnState.INACTIVE,
      ];
      this.playerCard.updateColumnsState(newColumnsState);
    }
  }

  public updateColumnState(
    gameUserId: string,
    columnIndex: number,
    state: ColumnState,
    isDraftingPhase?: boolean,
  ) {
    const card = this.playerMap.get(gameUserId);
    if (card) {
      const columnsState = card.getCurrentColumnState();
      if (
        !columnsState[columnIndex] ||
        columnsState[columnIndex] === ColumnState.COMPLETED
      ) {
        return;
      }
      if (columnsState[columnIndex] === state) {
        return;
      }
      columnsState[columnIndex] = state;

      // Update isDraftingPhase if provided
      if (isDraftingPhase !== undefined) {
        card.updateData({ isDraftingPhase });
      }

      card.updateColumnsState(columnsState);
    }
  }
  public updateAllColumnsState(columnsState: ColumnState[]) {
    this.playerMap.forEach((card) => {
      card.updateColumnsState(columnsState);
    });
  }

  public updatePlayerColumnsState(
    gameUserId: string,
    columnsState: ColumnState[],
  ) {
    const card = this.playerMap.get(gameUserId);
    if (card) {
      card.updateColumnsState(columnsState);
    }

    // Also update the fixed bottom card if it's the current user
    if (this.playerCard && this.playerCard.userId === gameUserId) {
      this.playerCard.updateColumnsState(columnsState);
    }
  }

  private getListContainer(): Container {
    return this.scrollContainer
      ? this.scrollContainer.contentContainer
      : this.playersContainer!;
  }

  private addPlayersToFlatArea(
    leaderboardPlayers: PlayerData[],
    extra: Record<string, PlayerExtraData>,
    players: StoreData["players"],
    currentUserId: string,
    isDraftingPhase: boolean,
  ) {
    const containerWidth = this.minWidthOfPlayerCard;
    const cardVariant = "large";
    leaderboardPlayers.forEach((player, index) => {
      const card = this.createPlayerCard(
        player,
        extra,
        players,
        currentUserId,
        isDraftingPhase,
      );
      const yPos =
        index * (this.minHeightOfPlayerCard + this.gapBetweenEachPlayerCard);

      card.x = 0;
      card.y = yPos;
      this.playersContainer!.addChild(card);
      card.updateLayout(containerWidth, cardVariant);
      this.playerMap.set(player.gameUserId, card);
    });
  }

  private addPlayersToScrollableArea(
    leaderboardPlayers: PlayerData[],
    extra: Record<string, PlayerExtraData>,
    players: StoreData["players"],
    currentUserId: string,
    isDraftingPhase: boolean,
  ) {
    const cardVariant = this.variant === "result" ? "large" : "compact";
    leaderboardPlayers.forEach((player, index) => {
      const card = this.createPlayerCard(
        player,
        extra,
        players,
        currentUserId,
        isDraftingPhase,
      );
      const yPos =
        index * (this.minHeightOfPlayerCard + this.gapBetweenEachPlayerCard);

      card.x = 0;
      card.y = yPos;
      this.getListContainer().addChild(card);
      card.updateLayout(this.scrollablePlayerCardWidth, cardVariant);
      this.playerMap.set(player.gameUserId, card);
    });
  }

  private createPlayerCard(
    player: PlayerData,
    extra: Record<string, PlayerExtraData>,
    players: StoreData["players"],
    currentUserId: string,
    isDraftingPhase: boolean,
  ): LeaderboardPlayer {
    const userInfo = players[player.gameUserId];

    if (!userInfo) {
      Logger.warn(`Player data not found for gameUserId: ${player.gameUserId}`);
    }

    const extraData = extra[player.gameUserId] || {};
    const isUser = player.gameUserId === currentUserId;
    const cardVariant =
      this.variant === "result" || this.variant === "flat"
        ? "large"
        : "compact";
    const cardWidth =
      this.variant === "flat"
        ? this.minWidthOfPlayerCard
        : this.scrollablePlayerCardWidth;

    return new LeaderboardPlayer({
      userId: player.gameUserId,
      name: userInfo?.username || "Unknown Player",
      score: player.score,
      columnsState: extraData.columnsState,
      rank: player.rank,
      isUser,
      doNotHighlightUserBackground: isUser && this.variant !== "flat",
      avatarUrl: userInfo?.profilePicture,
      fallbackImageUrl: userInfo?.fallbackImageUrl,
      dimension: {
        height: this.minHeightOfPlayerCard,
        width: cardWidth,
      },
      isTopper: player.isTopper,
      isDraftingPhase,
      variant: cardVariant,
      hideColumnsState: this.variant === "result" || this.variant === "flat",
      columnResults: extraData.columnResults,
    });
  }

  private createCurrentUserCard(
    leaderboardPlayers: PlayerData[],
    extra: Record<string, PlayerExtraData>,
    players: StoreData["players"],
    currentUserId: string,
    isDraftingPhase: boolean,
  ) {
    const currentUser = leaderboardPlayers.find(
      (p) => p.gameUserId === currentUserId,
    );
    if (!currentUser) return;

    const userInfo = players[currentUser.gameUserId];

    if (!userInfo) {
      Logger.warn(
        `Player data not found for current user: ${currentUser.gameUserId}`,
      );
      return;
    }

    const extraData = extra[currentUser.gameUserId] || {};
    const cardVariant = this.variant === "result" ? "large" : "compact";

    this.playerCard = new LeaderboardPlayer({
      userId: currentUser.gameUserId,
      name: userInfo.username,
      score: currentUser.score,
      columnsState: extraData.columnsState,
      rank: currentUser.rank,
      isUser: true,
      avatarUrl: userInfo.profilePicture,
      fallbackImageUrl: userInfo.fallbackImageUrl,
      dimension: {
        height: this.minHeightOfPlayerCard,
        width: this.minWidthOfPlayerCard,
      },
      isTopper: currentUser.isTopper,
      isDraftingPhase,
      variant: cardVariant,
      hideColumnsState: this.variant === "result",
    });

    this.addChild(this.playerCard);
    this.playerCard.updateLayout(this.minWidthOfPlayerCard, cardVariant);
    // Don't add to playerMap - it's already added from scrollable area
  }

  private getPlayersWithChangedScores(newPlayers: PlayerData[]): Set<string> {
    const changedScores = new Set<string>();

    newPlayers.forEach((newPlayer) => {
      changedScores.add(newPlayer.gameUserId);
    });

    return changedScores;
  }

  private updateCurrentUserCard(
    leaderboardPlayers: PlayerData[],
    players: StoreData["players"],
    currentUserId: string,
    isDraftingPhase: boolean,
  ) {
    if (!this.playerCard) return;

    const currentUser = leaderboardPlayers.find(
      (p) => p.gameUserId === currentUserId,
    );
    if (!currentUser) return;

    const userInfo = players[currentUser.gameUserId];

    if (!userInfo) {
      Logger.warn(
        `Player data not found for current user: ${currentUser.gameUserId}`,
      );
      return;
    }

    // Update the fixed bottom card
    this.playerCard.updateData({
      name: userInfo.username,
      rank: currentUser.rank,
      score: currentUser.score,
      isUser: true,
      isTopper: currentUser.isTopper,
      isDraftingPhase,
    });
    this.playerCard.rank = currentUser.rank;
  }

  private updateScrollablePlayers(
    leaderboardPlayers: PlayerData[],
    players: StoreData["players"],
    extra: Record<string, PlayerExtraData>,
    currentUserId: string,
    isDraftingPhase: boolean,
    playersWithChangedScores: Set<string>,
  ) {
    const animationQueue: Array<() => void> = [];

    leaderboardPlayers.forEach((newPlayer, index) => {
      const isUser = newPlayer.gameUserId === currentUserId;
      const playerCard = this.playerMap.get(newPlayer.gameUserId);
      const targetY =
        index * (this.minHeightOfPlayerCard + this.gapBetweenEachPlayerCard);

      if (playerCard) {
        this.handleExistingPlayerUpdate(
          playerCard,
          newPlayer,
          players,
          isUser,
          isDraftingPhase,
          targetY,
          playersWithChangedScores,
          animationQueue,
        );
      } else {
        this.handleNewPlayerAddition(
          newPlayer,
          extra,
          players,
          currentUserId,
          isDraftingPhase,
          targetY,
        );
      }
    });

    this.executeAnimationQueue(animationQueue);
  }

  private handleExistingPlayerUpdate(
    playerCard: LeaderboardPlayer,
    newPlayer: PlayerData,
    players: StoreData["players"],
    isUser: boolean,
    isDraftingPhase: boolean,
    targetY: number,
    playersWithChangedScores: Set<string>,
    animationQueue: Array<() => void>,
  ) {
    const userInfo = players[newPlayer.gameUserId];

    if (!userInfo) {
      Logger.warn(
        `Player data not found for gameUserId: ${newPlayer.gameUserId}`,
      );
      return;
    }

    const hasScoreChanged = playersWithChangedScores.has(newPlayer.gameUserId);
    const hasPositionChanged = playerCard.y !== targetY;

    if (hasPositionChanged && hasScoreChanged) {
      animationQueue.push(() => {
        this.animatePlayerUpdate(
          playerCard,
          newPlayer,
          userInfo,
          isUser,
          isDraftingPhase,
          targetY,
        );
      });
    } else if (hasPositionChanged) {
      this.animatePositionChange(playerCard, targetY);
    } else if (hasScoreChanged) {
      this.updatePlayerCardData(
        playerCard,
        newPlayer,
        userInfo,
        isUser,
        isDraftingPhase,
      );
    }
  }

  private animatePlayerUpdate(
    playerCard: LeaderboardPlayer,
    newPlayer: PlayerData,
    userInfo: StoreData["players"][string],
    isUser: boolean,
    isDraftingPhase: boolean,
    targetY: number,
  ) {
    gsap.to(playerCard, {
      y: targetY,
      duration: 0.4,
      ease: "linear",
      onComplete: () => {
        this.updatePlayerCardData(
          playerCard,
          newPlayer,
          userInfo,
          isUser,
          isDraftingPhase,
        );
      },
    });
  }

  private animatePositionChange(
    playerCard: LeaderboardPlayer,
    targetY: number,
  ) {
    gsap.to(playerCard, {
      y: targetY,
      duration: 0.4,
      ease: "linear",
    });
  }

  private updatePlayerCardData(
    playerCard: LeaderboardPlayer,
    newPlayer: PlayerData,
    userInfo: StoreData["players"][string],
    isUser: boolean,
    isDraftingPhase: boolean,
  ) {
    playerCard.updateData({
      name: userInfo.username,
      rank: newPlayer.rank,
      score: newPlayer.score,
      isUser,
      isTopper: newPlayer.isTopper,
      isDraftingPhase,
    });
    playerCard.rank = newPlayer.rank;
  }

  private handleNewPlayerAddition(
    newPlayer: PlayerData,
    extra: Record<string, PlayerExtraData>,
    players: StoreData["players"],
    currentUserId: string,
    isDraftingPhase: boolean,
    targetY: number,
  ) {
    const newCard = this.createPlayerCard(
      newPlayer,
      extra,
      players,
      currentUserId,
      isDraftingPhase,
    );

    newCard.y = targetY;
    newCard.x = 0;
    newCard.alpha = 0;

    const cardVariant =
      this.variant === "result" || this.variant === "flat"
        ? "large"
        : "compact";
    this.getListContainer().addChild(newCard);
    newCard.updateLayout(
      this.variant === "flat"
        ? this.minWidthOfPlayerCard
        : this.scrollablePlayerCardWidth,
      cardVariant,
    );
    this.playerMap.set(newPlayer.gameUserId, newCard);

    gsap.to(newCard, { alpha: 1, duration: 0.3 });
  }

  private executeAnimationQueue(animationQueue: Array<() => void>) {
    // Execute all animations in the batch simultaneously
    animationQueue.forEach((animate) => {
      animate();
    });
  }

  private removeOldPlayers(currentPlayers: PlayerData[]) {
    this.currentPlayers.forEach((oldPlayer) => {
      const stillExists = currentPlayers.find(
        (p) => p.gameUserId === oldPlayer.gameUserId,
      );
      if (stillExists) return;

      const card = this.playerMap.get(oldPlayer.gameUserId);
      if (card) {
        this.fadeOutAndRemovePlayer(card, oldPlayer.gameUserId);
      }
    });
  }

  private fadeOutAndRemovePlayer(card: LeaderboardPlayer, gameUserId: string) {
    gsap.to(card, {
      alpha: 0,
      duration: 0.3,
      onComplete: () => {
        card.parent?.removeChild(card);
        card.destroy();
        this.playerMap.delete(gameUserId);
      },
    });
  }

  public getPlayerById(gameUserId: string): LeaderboardPlayer | undefined {
    return this.playerMap.get(gameUserId);
  }

  public getCurrentUserCard(): LeaderboardPlayer | undefined {
    return this.playerCard ?? this.playerMap.get(this.currentUserId);
  }
}

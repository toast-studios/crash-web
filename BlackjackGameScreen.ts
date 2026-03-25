import { Container, DestroyOptions, Sprite, Text } from "pixi.js";
import { OpponentProfileBar } from "../ui/OpponentProfileBar";
import { PlayerProfileBar } from "../ui/PlayerProfileBar";
import { app } from "../app";
import { FederatedPointerEvent } from "pixi.js";
import gsap from "gsap";
import { CardInfo } from "../ui/Cards/CardPlacementHolder";
import { socketManager } from "../network/SocketManager";
import CONSTANTS, { GAME_MODES, VIEW_MODE } from "../constants";
import {
  ALLOW_ACTIONS,
  CardPositions,
  END_GAME_REASON,
  GAME_STATE,
  StoreData,
} from "../store/storeTypes";
import { FTUEPointer } from "../ui/FTUEPointer";
import {
  delayCall,
  getOpponent,
  isFreeWin,
  isMetaFreeWin,
} from "../utils/game";

import { ResultOverlay } from "../ui/ResultOverlay";
import { sfx } from "../utils/audio";
import {
  GameResultInfo,
  TurnInfo,
  TurnTakenByOpponentInfo,
} from "../network/SocketEventHandler";
import { PhaseOne } from "./phases/PhaseOne";
import { PhaseTwo } from "./phases/PhaseTwo";
import { navigation } from "../utils/navigation";
import { InfoPopup } from "../popups/InfoPopup";
import { Tooltip } from "../ui/ToolTip";
import { Logger } from "../utils/logger";
import { ClientEvent } from "../utils/clientEvent";
import { LOBBY_FORMAT } from "../types";

import { RematchOverlay } from "../ui/rematchOverlay";
import { apiClient } from "../network/apis";
import {
  API_CONSTANTS,
  CURRENT_PARTNER,
  PARTNER_ID,
  PARTNER_SPECIFIC_CONFIG,
} from "../network/constants";
import { getQueryParams } from "../utils/window";
import { WinShowBox } from "../ui/WinShowBox";
import {
  LOCAL_STORAGE_KEYS,
  localStorageUtil,
} from "../utils/localStorageUtil";
import {
  stopYouBustAnimation,
  stopYouDrawAnimation,
  stopYouLoseAnimation,
  stopYouWinAnimation,
} from "../animations/lottie";
import { turnInfoManage } from "../ui/TurnInfoManage";
import { NetworkIndicator } from "../ui/NetworkIndicator";
import { Lobby } from "../utils/winButtonText";
import { MatchMakingScreen } from "./NewMatchMakingScreen";
import { CardDeck } from "../ui/Cards/CardDeck";

export class GameScreen extends Container {
  public static assetBundles = ["common", "game", "player-profile"];
  public background: Sprite;
  private winShowBox: WinShowBox | null = null;
  protected FTUEPointer: FTUEPointer;

  public opponentBar: OpponentProfileBar;
  public playerBar: PlayerProfileBar;

  public phaseOne: PhaseOne | null = null;
  public phaseTwo: PhaseTwo | null = null;
  public cardDeck: CardDeck;

  public allowedAction: ALLOW_ACTIONS[] | null = null;
  public gameState: GAME_STATE = GAME_STATE.SHUFFLING_CARDS;
  public gameUserId: string;
  public players: StoreData["players"];
  public isReconnection: boolean = false;
  public animateShow: boolean = false;
  public nextTurnStartDelay: number = 1500;
  public waitOpponentToolTips: Tooltip;
  private isOpponentTakenTurn: boolean = false;
  private isFirstTurn: boolean = true;
  private isPlayerClickedOnLeaveGameConfirmation: boolean = false;
  private winAmount: number = 0;
  private entryFee: number = 0;
  private scrollBoxZIndex = 1;
  private resultOverlay: ResultOverlay | null = null;
  public viewMode = import.meta.env.VITE_VIEW_MODE;
  public bindAppMessageListener: (event: Event) => void;
  protected showHandTimer: NodeJS.Timeout | null = null;
  protected boundHandlePointerDown!: (event: FederatedPointerEvent) => void;

  private networkIndicator: NetworkIndicator | null = null;
  private debugMatchIdText: Text | null = null;
  private hasGameEndEventBeenSent: boolean = false;

  // private inactivityTimerForPointerShow: number = 4000;

  public matchId: string;

  constructor({
    gameUserId,
    gameState,
    players,
    turnInfo,
    activeColumnIndex,
    matchId,
    isReconnection = false,
  }: StoreData) {
    super();

    const TURN_START_DELAY = 3000;
    const RECONNECT_TURN_START_DELAY = 1000;
    const INITIAL_DELAY_BEFORE_TURN_HANDLE = 1000;

    this.gameUserId = gameUserId;
    this.gameState = gameState;
    this.players = players;
    this.matchId = matchId;
    this.isReconnection = isReconnection;
    this.winAmount = players[gameUserId]?.lobbyDetails?.winAmount || 0;
    this.entryFee = players[gameUserId]?.lobbyDetails?.entryFee || 0;
    if (!isReconnection) {
      this.animateShow = true;
      this.nextTurnStartDelay = TURN_START_DELAY;
    } else {
      this.nextTurnStartDelay = RECONNECT_TURN_START_DELAY;
      this.isFirstTurn = false;
    }
    const opponent = getOpponent(players, gameUserId);
    // * reconnecting player
    if (turnInfo && turnInfo.ownTurnInfo) {
      this.allowedAction = turnInfo.ownTurnInfo.allowActions;
    }

    this.opponentBar = new OpponentProfileBar({
      profilePictureUrl: opponent.profilePicture,
      fallbackImageUrl: opponent.fallbackImageUrl ?? "",
      animateOpponentProfilePicture: this.animateShow,
      enableExitButton:
        API_CONSTANTS.GAME_MODES !== GAME_MODES.PRACTICE
          ? !PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER]
              .disableExitButtonInGameScreen
          : false,
      onExitButtonPress: this.exitButtonPressHandler.bind(this),
      enableSettingButton: true,
      onSettingButtonPress: async () => {
        const { SettingsPopup } = await import("../popups/SettingsPopup");
        navigation.presentPopup(SettingsPopup, {
          hideHowToPlayButton: true,
        });
      },
    });

    //pass the coin value from here we will get it in socket res
    this.playerBar = new PlayerProfileBar({
      profilePictureUrl: players[gameUserId].profilePicture,
      fallbackImageUrl: players[gameUserId].fallbackImageUrl ?? "",
    });

    this.background = Sprite.from("tournament_game_background");
    // * background zIndex 0
    this.addChild(this.background);

    if (
      API_CONSTANTS.GAME_MODES !== GAME_MODES.PRACTICE &&
      CURRENT_PARTNER == PARTNER_ID.bh &&
      localStorageUtil.getItem(LOCAL_STORAGE_KEYS.IS_ON_BOARDING) !== "true"
    ) {
      this.winShowBox = new WinShowBox({
        lobby: players[gameUserId].lobbyDetails as unknown as Lobby,
      });
      this.addChild(this.winShowBox);
    }

    // * initialize cardDeck zIndex 1
    this.cardDeck = new CardDeck({
      deckLength: 52,
      onDeckTap: this.handleDeckTap.bind(this),
    });
    this.addChild(this.cardDeck);

    // * initialize phase one zIndex 2
    this.initializePhaseOne(gameState, players, gameUserId);
    this.initializePhaseTwo(gameState, players, gameUserId, activeColumnIndex);

    // * initialize opponent bar zIndex top ->
    this.addChild(this.opponentBar);

    // * initialize player bar zIndex top
    this.addChild(this.playerBar);

    this.waitOpponentToolTips = new Tooltip({
      maxWidth: 400,
      textColor: 0xffffff,
      fontSize: 24,
    });

    if (this.waitOpponentToolTips) {
      this.addChild(this.waitOpponentToolTips);
    }

    // Initialize FTUE pointer for Phase One inactivity guidance
    this.FTUEPointer = new FTUEPointer();
    this.FTUEPointer.visible = false;
    this.addChild(this.FTUEPointer);
    this.eventMode = "static";
    this.boundHandlePointerDown = this.handlePointerDown.bind(this);
    this.on("pointerdown", this.boundHandlePointerDown);

    //@todo remove this after testing
    // this.cardDeck.showWhiteOverlay()

    this.initialize();

    // Logger.info('this.isReconnection', this.isReconnection, turnInfo)
    if (this.isReconnection && turnInfo) {
      this.handleTurnInfo(turnInfo, true);
    }
    // Initialize the bound listener once in the constructor
    this.bindAppMessageListener = this.handleAppMessage.bind(this) as (
      event: Event,
    ) => void;

    delayCall(INITIAL_DELAY_BEFORE_TURN_HANDLE, () => {
      // Need a 1000ms delay because shuffleDeck and turnInfo event are handled simultaneously.
      const turnInfoData = turnInfoManage.getTurnInfo();
      if (!this.isReconnection && turnInfoData && this.isFirstTurn) {
        this.handleTurnInfo(turnInfoData);
      }
    });

    // Initialize FTUE pointer timer for non-rejoin cases after 4 seconds
    if (!this.isReconnection) {
      setTimeout(() => {
        // Check if we have PICK_CARD action available (Phase One)
        // Try to get turnInfo if allowedAction is not set yet
        let hasPickCardAction = this.allowedAction?.includes(
          ALLOW_ACTIONS.PICK_CARD,
        );
        if (!hasPickCardAction) {
          const turnInfoData = turnInfoManage.getTurnInfo();
          hasPickCardAction =
            turnInfoData?.ownTurnInfo?.allowActions.includes(
              ALLOW_ACTIONS.PICK_CARD,
            ) || false;
        }
        if (hasPickCardAction && this.phaseOne) {
          this.startPointerShowInactivityTimer();
        }
      }, 4000);
    }

    this.networkIndicator = new NetworkIndicator();
    // Position it where you want (e.g., top-right corner)
    this.networkIndicator.x = app.screen.width - 80;
    this.networkIndicator.y = app.screen.height - 10;
    this.addChild(this.networkIndicator);

    // Add debug matchId text - positioned on left side, rotated vertically, less visible
    this.debugMatchIdText = new Text({
      text: `${matchId}`,
      style: {
        fontSize: 8,
        fill: 0x777777,
        fontFamily: "Arial",
      },
    });
    this.debugMatchIdText.alpha = 0.4; // Make it less visible
    this.debugMatchIdText.rotation = -Math.PI / 2; // Rotate 90 degrees counter-clockwise for vertical text
    this.debugMatchIdText.anchor.set(0.5, 0.5); // Center anchor for rotation
    this.debugMatchIdText.x = app.screen.width - 18; // Position on right side
    this.debugMatchIdText.y = app.screen.height / 2; // Center vertically
    this.addChild(this.debugMatchIdText);
  }

  protected handlePointerDown() {
    // Any user interaction should hide pointers and restart inactivity timer if applicable
    this.FTUEPointer.stopAnimation();
    this.clearFTUEInactivityTimer();
    Logger.info("pointer down in gameplay screen");
    // Check for PICK_CARD action instead of gameState, as gameState might still be SHUFFLING_CARDS
    if (
      this.allowedAction?.includes(ALLOW_ACTIONS.PICK_CARD) &&
      this.allowedAction.length
    ) {
      Logger.info("allowed action includes pick card");
      this.startPointerShowInactivityTimer();
    }
  }

  private clearFTUEInactivityTimer() {
    if (this.showHandTimer) {
      clearTimeout(this.showHandTimer);
      this.showHandTimer = null;
    }
  }

  private shouldShowActionButtons(
    allowActions: ALLOW_ACTIONS[] | null,
  ): boolean {
    if (!allowActions || allowActions.length === 0) return false;

    // Hard rule: NEVER show if PICK_CARD is present (Phase One action)
    if (allowActions.includes(ALLOW_ACTIONS.PICK_CARD)) {
      return false;
    }

    // Only show if HIT or STAND is present (Phase Two actions)
    return (
      allowActions.includes(ALLOW_ACTIONS.HIT) ||
      allowActions.includes(ALLOW_ACTIONS.STAND)
    );
  }

  private startPointerShowInactivityTimer() {
    Logger.info("starting pointer show inactivity timer");
    this.clearFTUEInactivityTimer();
    // Show pointers after 3 seconds of inactivity during Phase One turn
    this.showHandTimer = setTimeout(() => {
      // Do not rely on gameState, as it can still be SHUFFLING_CARDS during Phase One
      // Ensure we only show when PICK_CARD is actually allowed
      let hasPickCardAction = this.allowedAction?.includes(
        ALLOW_ACTIONS.PICK_CARD,
      );
      if (!hasPickCardAction) {
        const turnInfoData = turnInfoManage.getTurnInfo();
        hasPickCardAction =
          turnInfoData?.ownTurnInfo?.allowActions.includes(
            ALLOW_ACTIONS.PICK_CARD,
          ) || false;
      }
      if (!hasPickCardAction || !this.phaseOne) return;
      this.showPointersAtAllEmptyPlacements();
    }, 3000);
  }

  protected getAllEmptyCardPlacements(): CardInfo[] {
    return (
      this.phaseOne?.cardsColumns.flatMap((column, colIndex) => {
        return column
          .getCardPlacements()
          .filter((placement) => placement.cardId === null)
          .map((placement) => {
            const globalPosition = placement.getGlobalPosition();
            return {
              columnIndex: colIndex,
              cardIndex: placement.cardIndex,
              x: globalPosition.x,
              y: globalPosition.y,
            };
          })
          .filter(
            (coord): coord is CardInfo =>
              coord !== null &&
              typeof coord.x === "number" &&
              typeof coord.y === "number" &&
              !isNaN(coord.x) &&
              !isNaN(coord.y) &&
              isFinite(coord.x) &&
              isFinite(coord.y),
          );
      }) || []
    );
  }

  protected shouldShowFTUEPointers(): boolean {
    const gameCounter = parseInt(
      localStorageUtil.getItem(LOCAL_STORAGE_KEYS.BLACKJACK_GAME_COUNTER) ||
        "0",
      10,
    );
    Logger.info("BLACKJACK_GAME_COUNTER check for FTUE:", gameCounter);
    // Only show FTUE pointers for first 3 games (counter 0, 1, 2)
    return gameCounter < 3;
  }

  protected showPointersAtAllEmptyPlacements() {
    Logger.info("showing pointers at all empty placements");

    // Check if we should show FTUE based on game counter
    if (!this.shouldShowFTUEPointers()) {
      Logger.info(
        "Skipping FTUE pointers - game counter exceeds limit of 3 games",
      );
      return;
    }

    // Stop any existing animation first
    this.FTUEPointer.stopAnimation();
    const emptyPlacements = this.getAllEmptyCardPlacements();
    if (emptyPlacements.length === 0) return;
    const pointerPositions = emptyPlacements.map((placement) => ({
      from: {
        x: placement.x + 35,
        y: placement.y + 60,
      },
      to: {
        x: placement.x + 45,
        y: placement.y + 70,
      },
    }));
    this.FTUEPointer.animateMultipleTaps(pointerPositions);
  }

  private showWaitOpponentToolTips() {
    if (this.waitOpponentToolTips && !this.isOpponentTakenTurn) {
      this.waitOpponentToolTips.show({
        text: "Waiting for opponent...",
        position: { x: 0, y: -app.screen.height / 4 },
        autoHideDelay: 0,
      });
    }
  }

  public resize(width: number, height: number) {
    const scaleX = width / this.background.texture.width;
    const scaleY = height / this.background.texture.height;
    const scale = Math.max(scaleX, scaleY);

    this.background.width = this.background.texture.width * scale;
    this.background.height = this.background.texture.height * scale;
    // * background resize

    // Reposition debug text on resize
    if (this.debugMatchIdText) {
      this.debugMatchIdText.x = app.screen.width - 18;
      this.debugMatchIdText.y = height / 2;
    }

    // TODO add dynamic resizing for other elements
  }

  public async show() {
    this.opponentBar.show(this.animateShow);
    this.playerBar.show(this.animateShow);

    // if(this.winShowBox){
    //   this.winShowBox.show(this.animateShow, this.winShowBox.y);
    // }

    this.showVersusTextOnComplete();

    this.startSocketEventListeners();
  }

  private showVersusTextOnComplete() {
    if (this.phaseOne) {
      this.cardDeck.visible = true;
      this.cardDeck.show(this.animateShow);
      this.phaseOne.animateShow(this.animateShow, false);
    }
    if (this.phaseTwo) {
      this.phaseTwo.animateShow(this.animateShow, false);
      this.animateDeckPhaseTwo(this.animateShow);
    }
  }

  public async hide() {
    this.opponentBar.hide(this.animateShow);
    this.playerBar.hide(this.animateShow);
    if (this.phaseOne) {
      this.phaseOne.animateHide(this.animateShow, false);
    }
    if (this.phaseTwo) {
      this.phaseTwo.animateHide();
    }
    this.stopSocketEventListeners();
    this.off("pointerdown", this.boundHandlePointerDown);
    this.FTUEPointer.stopAnimation();
    this.clearFTUEInactivityTimer();

    stopYouWinAnimation();
    stopYouLoseAnimation();
    stopYouDrawAnimation();
    stopYouBustAnimation();
    this.networkIndicator?.destroy();
    this.debugMatchIdText?.destroy();
  }

  private async initialize() {
    // * opponentBar position

    // * playerBar position
    this.playerBar.x = app.screen.width / 2 - this.playerBar.width / 2;
    this.playerBar.y = app.screen.height - this.playerBar.height - 60;

    this.opponentBar.x = app.screen.width / 2 - this.opponentBar.width / 2;
    this.opponentBar.y = 20;

    if (CURRENT_PARTNER == PARTNER_ID.bh && this.winShowBox) {
      // * winShowBox position
      this.winShowBox.x = app.screen.width / 2 - 110;
      this.winShowBox.y =
        this.viewMode == VIEW_MODE.WEB_VIEW
          ? this.opponentBar.y + this.winShowBox.height / 2
          : this.winShowBox.height / 2;
    }

    // * cardDeck position
    this.cardDeck.y = app.screen.height / 2 - this.cardDeck.height / 2 - 40;
    this.cardDeck.x = app.screen.width / 2 - this.cardDeck.width / 2 - 3;

    // Handle reconnection - if already in phase two, position deck on left
    if (this.isReconnection && this.gameState === GAME_STATE.PHASE_TWO) {
      this.animateCardDeckToLeft(false);
    }
  }

  private handleDeckTap = () => {
    if (this.phaseOne) {
      this.phaseOne.handleDeckTap();
    }
  };

  private initializePhaseOne(
    gameState: GAME_STATE,
    players: StoreData["players"],
    gameUserId: string,
  ) {
    if (
      gameState === GAME_STATE.PHASE_ONE ||
      gameState === GAME_STATE.SHUFFLING_CARDS
    ) {
      this.waitOpponentToolTips = new Tooltip({
        maxWidth: 400,
        textColor: 0xffffff,
        fontSize: 24,
      });
      this.phaseOne = null;
      this.phaseOne = new PhaseOne({
        players,
        gameUserId,
        cardDeck: this.cardDeck,
        getOpponentBar: () => this.opponentBar,
        getPlayerBar: () => this.playerBar,
        showWaitOpponentToolTips: () => this.showWaitOpponentToolTips(),
        hideWaitOpponentToolTips: () => {
          this.waitOpponentToolTips?.hide();
        },
      });
      const safeIndex = Math.min(this.scrollBoxZIndex, this.children.length);
      this.addChildAt(this.phaseOne, safeIndex);
      this.playerBar.setPhaseOneReference(this.phaseOne);
    }
  }

  private initializePhaseTwo(
    gameState: GAME_STATE,
    players: StoreData["players"],
    gameUserId: string,
    activeColumnIndex: number,
  ) {
    if (gameState === GAME_STATE.PHASE_TWO) {
      this.phaseTwo = new PhaseTwo({
        players,
        gameUserId,
        activeColumnIndex,
        getPlayerBar: () => this.playerBar,
        getOpponentBar: () => this.opponentBar,
        getCardDeck: () => this.cardDeck,
        setNextTurnStartDelay: (delay: number) =>
          (this.nextTurnStartDelay = delay),
        getGameState: () => this.gameState,
        getFTUEPointer: () => this.FTUEPointer,
      });
      const safeIndex = Math.min(this.scrollBoxZIndex, this.children.length);
      this.addChildAt(this.phaseTwo, safeIndex);
    }
  }

  private getMatchMakingScreenOptions(
    remainingTime: number,
    fromRematchModel: boolean,
  ) {
    return {
      remainingTime,
      fromRematchModel,
      username: this.players[this.gameUserId].username,
      playerProfilePicture: this.players[this.gameUserId].profilePicture,
      playerFallbackImageUrl: this.players[this.gameUserId].fallbackImageUrl,
      lobbyDetails: this.players[this.gameUserId].lobbyDetails,
    };
  }

  public endGameHandler(
    resultOverlay: ResultOverlay,
    delay: number,
    isPlayerWon: boolean,
    data: GameResultInfo,
  ) {
    setTimeout(() => {
      this.handleGameEndEvent(isPlayerWon, data);

      // to solve the issue of other screen visibility after game end
      if (CURRENT_PARTNER === PARTNER_ID.bt) {
        socketManager.disconnect();
        return;
      }

      resultOverlay.hide();
      if (
        CURRENT_PARTNER == PARTNER_ID.gs ||
        CURRENT_PARTNER == PARTNER_ID.em ||
        CURRENT_PARTNER == PARTNER_ID.ts ||
        CURRENT_PARTNER == PARTNER_ID.md ||
        CURRENT_PARTNER == PARTNER_ID.sp
      ) {
        navigation.goBackToLobby(true);
        return;
      }
      if (isFreeWin()) {
        if (isMetaFreeWin()) {
          ClientEvent.RematchScreen();
        } else {
          navigation.closeWebView();
        }
      } else {
        socketManager.disconnect();

        if (
          CURRENT_PARTNER === PARTNER_ID.bh &&
          getQueryParams().mode === "challenger"
        ) {
          navigation.closeWebView();
          return;
        }

        apiClient
          .getActivePoolInfo()
          .then((poolInfo) => {
            const remainingTime = Math.max(
              0,
              Math.floor(
                (new Date(Number(poolInfo.endTime)).getTime() -
                  new Date().getTime()) /
                  1000,
              ),
            );
            navigation.showScreen(
              MatchMakingScreen,
              this.getMatchMakingScreenOptions(remainingTime, true),
            );
          })
          .catch((error) => {
            Logger.error("Error fetching active pool info", error);
            navigation.showScreen(
              MatchMakingScreen,
              this.getMatchMakingScreenOptions(15, true),
            );
          });

        setTimeout(() => {
          Logger.info("Showing rematch overlay");
          navigation.presentPopup(RematchOverlay, {
            currencySymbol:
              this.players[this.gameUserId].lobbyDetails?.currencySymbol || "",
            lobby: this.players[this.gameUserId].lobbyDetails,
            entryFee: this.players[this.gameUserId].lobbyDetails?.entryFee ?? 0,
            currencyCode:
              this.players[this.gameUserId].lobbyDetails?.currencyCode,
          });
        }, 500);
      }
    }, delay);
  }

  public endGame({
    playerWon,
    playerScore,
    opponentScore,
    gameEndType,
    onComplete,
    gameResultInfo,
  }: {
    playerWon: boolean;
    playerScore: number;
    opponentScore: number;
    gameEndType: END_GAME_REASON;
    gameResultInfo: GameResultInfo;
    onComplete: (
      resultOverlay: ResultOverlay,
      delay: number,
      isPlayerWon: boolean,
      data: GameResultInfo,
    ) => void;
  }) {
    const isCarnival = CURRENT_PARTNER === PARTNER_ID.bt;
    const cb = () => {
      Logger.info("Showing result screen....");
      this.resultOverlay = new ResultOverlay({
        playerScore,
        opponentScore,
        playerWon,
        gameEndType,
      });

      this.addChild(this.resultOverlay);
      this.resultOverlay.show();
      // we dont show lottie animations in carnival that's why we have a shorter delay
      const delay = isCarnival ? 3000 : 7000;
      onComplete(this.resultOverlay, delay, playerWon, gameResultInfo);
    };

    // Delay to allow COLUMN_UPDATE bust animation to complete before showing result overlay
    const bustAnimationDelay = this.nextTurnStartDelay;
    Logger.info("endGame delaying ResultOverlay by", bustAnimationDelay, "ms");

    setTimeout(cb, Math.max(1000, bustAnimationDelay));
  }

  public animateDeckPhaseTwo(animate: boolean) {
    if (!animate) {
      return;
    }

    sfx.play("common/transition_to_gameplay_phase_.wav", {
      delay: 1,
    });
    this.opponentBar.showActionInfo();
    this.animateCardDeckToLeft(true);
  }

  private animateCardDeckToLeft(animate: boolean = true) {
    const finalPosition = {
      x: this.cardDeck.height / 2 - 25,
      y: app.screen.height / 2 - 50,
      rotation: Math.PI / 2,
    };

    if (animate) {
      gsap.to(this.cardDeck, {
        x: finalPosition.x,
        y: finalPosition.y,
        rotation: finalPosition.rotation,
        duration: 1,
        ease: "power2.out",
        delay: 1.5,
      });
      gsap.to(this.cardDeck.scale, {
        x: 0.8,
        y: 0.8,
        duration: 0.5,
        ease: "sine",
        delay: 1.5,
      });
    } else {
      // Directly set the final position without animation
      this.cardDeck.x = finalPosition.x;
      this.cardDeck.y = finalPosition.y;
      this.cardDeck.rotation = finalPosition.rotation;
      this.cardDeck.scale.set(0.8, 0.8);
    }
  }

  public moveToPhaseTwo({
    players,
    activeColumnIndex,
    avoidListeners,
  }: {
    players: StoreData["players"];
    activeColumnIndex: number;
    avoidListeners: boolean;
  }) {
    if (this.phaseOne) {
      this.phaseOne.animateHide(true, avoidListeners); // * animateShow is true because we want to animate on event
    }
    if (!this.phaseTwo) {
      this.initializePhaseTwo(
        GAME_STATE.PHASE_TWO,
        players,
        this.gameUserId,
        activeColumnIndex,
      );

      // * this.initializePhaseTwo initializes
      if (this.phaseTwo) {
        (this.phaseTwo as PhaseTwo).animateShow(true, avoidListeners); // * animateShow is true because we want to animate on event
        // * remove from memory and render
        const enoughTimeToRemove = 3000;
        setTimeout(() => {
          this.removeChild(this.phaseOne as PhaseOne);
          this.phaseOne = null;
        }, enoughTimeToRemove);
      }
    }
  }

  public exitButtonPressHandler() {
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
        this.isPlayerClickedOnLeaveGameConfirmation = true;
        navigation.presentPopup(InfoPopup, {
          showLoader: true,
          message: "",
          showCancelButton: false,
          showOkButton: false,
        });
        this.handleEmitLeaveGame();
      },
      onCancelPress: () => {
        navigation.dismissPopup();
      },
      ...(CURRENT_PARTNER == PARTNER_ID.em && {
        textColor: 0xfefff9,
        backgroundColor: 0x121212,
      }),
    });
  }

  public handleEmitLeaveGame = () => {
    Logger.info("handleEmitLeaveGame called");
    if (API_CONSTANTS.GAME_MODES === GAME_MODES.PRACTICE) {
      navigation.closeWebView();
      return;
    }
    socketManager.emit(CONSTANTS.ACTIONS.LEAVE_GAME, {}, (response) => {
      if (response.error) {
        navigation.presentPopup(InfoPopup, {
          message: response.message,
        });
        return;
      }
      if (isFreeWin() || CURRENT_PARTNER === PARTNER_ID.bt) {
        navigation.closeWebView();
      } else {
        navigation.goBackToLobby(true);
      }
    });
  };

  // * socket event handlers
  private handleTurnInfo(data: TurnInfo, isReconnection: boolean = false) {
    Logger.info("TURN_INFO", data, { isReconnection });

    // Set critical state immediately to prevent race condition with user taps
    if (data.ownTurnInfo && data.ownTurnInfo.allowActions.length) {
      this.allowedAction = data.ownTurnInfo.allowActions;
      if (this.phaseOne) {
        this.phaseOne.setIsTurnActive(true);
      }
      if (this.phaseTwo) {
        this.phaseTwo.isHitOrStandPromiseGoingOn = false;
      }
    }

    const cb = () => {
      Logger.info(
        "handleTurnInfo callback - gameState:",
        this.gameState,
        "isFirstTurn:",
        this.isFirstTurn,
      );
      // Use allowActions to detect phase two rather than gameState — gameState may not
      // have been updated to PHASE_TWO yet when the first turnInfo of the phase arrives.
      if (
        data.ownTurnInfo &&
        this.shouldShowActionButtons(data.ownTurnInfo.allowActions)
      ) {
        this.playerBar.setButtonsVisible(true);
        // Show FTUE pointers on first turn in Phase Two OR when getting another turn in same column
        if (this.phaseTwo) {
          Logger.info("Calling FTUE methods for Phase Two turn");
          this.phaseTwo.showFTUEOnFirstTurn();
          this.phaseTwo.showFTUEOnTurnIfNeeded();
        }
      } else if (data.ownTurnInfo) {
        // Explicitly hide buttons for Phase One
        this.playerBar.setButtonsVisible(false);
      }
      if (data.ownTurnInfo && data.ownTurnInfo.allowActions.length) {
        if (this.phaseOne) {
          this.cardDeck.makeTopCardInteractive();
          this.phaseOne.setIsTurnActive(true);
          this.phaseOne.startShimmerAnimation();
          this.phaseOne.startCardPlacementPulseAnimation();
        }
        this.playerBar.startTimer(data.ownTurnInfo);
        // Start inactivity timer to show FTUE pointers during Phase One
        // Check for PICK_CARD action instead of gameState, as gameState might still be SHUFFLING_CARDS
        if (data.ownTurnInfo.allowActions.includes(ALLOW_ACTIONS.PICK_CARD)) {
          this.startPointerShowInactivityTimer();
        }
      }
      if (data.opponentTurnInfo) {
        this.opponentBar.startTimer(data.opponentTurnInfo);
        this.isOpponentTakenTurn = false;
      }
      if (this.isFirstTurn) {
        this.isFirstTurn = false;
      }
    };
    if (isReconnection) {
      cb();
    } else {
      delayCall(this.nextTurnStartDelay, cb);
      if (this.isFirstTurn) {
        this.nextTurnStartDelay = 0;
      }
    }
  }

  private handleCardPlaced(data: CardPositions) {
    Logger.info("CARD_PLACED ", data);
    // Any placement activity should hide FTUE pointers and clear timers
    this.FTUEPointer.stopAnimation();
    this.clearFTUEInactivityTimer();
    this.phaseOne?.handleCardPlacement?.(data);
  }

  private handleSetupDone(data: StoreData): void {
    Logger.info("SETUP_DONE", data);
    this.FTUEPointer.stopAnimation();
    this.clearFTUEInactivityTimer();
    const delay = 2000; // * 1500 is card flip animation time
    this.nextTurnStartDelay = 3500;
    this.animateDeckPhaseTwo(true);
    delayCall(delay, () => {
      this.gameState = GAME_STATE.PHASE_TWO;
      this.moveToPhaseTwo({
        players: data.players,
        activeColumnIndex: data.activeColumnIndex,
        avoidListeners: false,
      });
      this.nextTurnStartDelay = 1000;
    });
    if (this.waitOpponentToolTips) {
      Logger.info("Hiding wait opponent tool tip");
      this.waitOpponentToolTips.hide();
    }
  }

  private handleGameResultScreen(data: GameResultInfo): void {
    Logger.info("GAME_RESULT_SCREEN", data);
    this.opponentBar.hideExitButton();
    this.opponentBar.hideSettingButton();
    navigation.dismissPopup();
    this.gameState = GAME_STATE.GAME_RESULT_SCREEN;
    this.playerBar.stopTimer();
    this.opponentBar.stopTimer();
    const isPlayerWon = data.winnerId === this.gameUserId;
    ClientEvent.GameStateChange({
      gameState: "ResultScreen",
    });

    if (this.isPlayerClickedOnLeaveGameConfirmation) {
      this.handleGameEndEvent(isPlayerWon, data);
      return;
    }

    this.endGame({
      playerWon: isPlayerWon,
      playerScore: isPlayerWon ? data.winnerPoints : data.looserPoints,
      opponentScore: isPlayerWon ? data.looserPoints : data.winnerPoints,
      gameEndType: data.gameEndType,
      gameResultInfo: data,
      onComplete: this.endGameHandler.bind(this),
    });
  }

  private handleGameEndEvent(isPlayerWon: boolean, data: GameResultInfo) {
    // Ensure game end event is only sent once per player
    if (this.hasGameEndEventBeenSent) {
      Logger.info("Game end event already sent, skipping duplicate call");
      return;
    }

    this.hasGameEndEventBeenSent = true;

    // Increment universal game counter for FTUE pointers
    const currentCount = parseInt(
      localStorageUtil.getItem(LOCAL_STORAGE_KEYS.BLACKJACK_GAME_COUNTER) ||
        "0",
      10,
    );
    const newCount = currentCount + 1;
    localStorageUtil.setItem(
      LOCAL_STORAGE_KEYS.BLACKJACK_GAME_COUNTER,
      newCount.toString(),
    );
    Logger.info("BLACKJACK_GAME_COUNTER incremented to:", newCount);

    // Send game ended event
    const opponent = getOpponent(this.players, this.gameUserId);
    ClientEvent.GameEnded({
      matchId: this.matchId,
      lobbyFormat: LOBBY_FORMAT.DUEL,
      gameResult: this.isPlayerClickedOnLeaveGameConfirmation
        ? "player_quit"
        : isPlayerWon
          ? "player_won"
          : data.gameEndType === END_GAME_REASON.DRAW
            ? "draw"
            : "player_lost",
      amount: isPlayerWon
        ? this.winAmount
        : data.gameEndType === END_GAME_REASON.DRAW
          ? this.entryFee
          : 0,
      user: {
        username: this.players[this.gameUserId].username,
        score: isPlayerWon ? data.winnerPoints : data.looserPoints,
        profilePicture: this.players[this.gameUserId].profilePicture,
        isTie: data.gameEndType === END_GAME_REASON.DRAW,
      },
      opponent: {
        username: opponent?.username,
        score: isPlayerWon ? data.looserPoints : data.winnerPoints,
        profilePicture: opponent?.profilePicture,
        isTie: data.gameEndType === END_GAME_REASON.DRAW,
      },
      currencyCode: this.players[this.gameUserId].lobbyDetails?.currencyCode,
    });
    ClientEvent.GameClose();
  }

  private handleTurnTakenByOpponent(data: TurnTakenByOpponentInfo): void {
    Logger.info("TURN_TAKEN_BY_OPPONENT", data);
    this.isOpponentTakenTurn = true;
    this.opponentBar.stopTimer();
    if (this.waitOpponentToolTips) {
      Logger.info("Hiding wait opponent tool tip");
      this.waitOpponentToolTips.hide();
      // this.waitOpponentToolTips = null
    }
  }

  private startSocketEventListeners() {
    socketManager.on(
      CONSTANTS.EVENTS.TURN_INFO,
      this.handleTurnInfo.bind(this),
    );

    socketManager.on(
      CONSTANTS.EVENTS.SETUP_DONE,
      this.handleSetupDone.bind(this),
    );
    socketManager.on(
      CONSTANTS.EVENTS.GAME_RESULT_SCREEN,
      this.handleGameResultScreen.bind(this),
    );

    socketManager.on(
      CONSTANTS.EVENTS.CARD_PLACED,
      this.handleCardPlaced.bind(this),
    );

    socketManager.on(
      CONSTANTS.EVENTS.TURN_TAKEN_BY_OPPONENT,
      this.handleTurnTakenByOpponent.bind(this),
    );
    window.addEventListener("appMessage", this.bindAppMessageListener);
    window.addEventListener("message", this.bindAppMessageListener);
  }

  public handleAppMessage(event: MessageEvent) {
    if (event.data.type === "QUIT_GAME" || event.data.type === "GAME_LEAVE") {
      Logger.info("QUIT_GAME or GAME_LEAVE called", event.data);
      navigation.presentPopup(InfoPopup, {
        showLoader: true,
        message: "",
      });
      this.isPlayerClickedOnLeaveGameConfirmation = true;
      socketManager.emit(CONSTANTS.ACTIONS.LEAVE_GAME, {}, (response) => {
        if (response.error) {
          navigation.presentPopup(InfoPopup, {
            message: response.message,
          });
          return;
        }
        navigation.dismissPopup();
        if (
          isFreeWin() ||
          CURRENT_PARTNER === PARTNER_ID.bt ||
          (CURRENT_PARTNER === PARTNER_ID.bh &&
            getQueryParams().mode === "challenger")
        ) {
          navigation.closeWebView();
        } else {
          navigation.goBackToLobby(true);
        }
      });
    }
  }

  private stopSocketEventListeners() {
    socketManager.off(CONSTANTS.EVENTS.TURN_INFO);
    socketManager.off(CONSTANTS.EVENTS.SETUP_DONE);
    socketManager.off(CONSTANTS.EVENTS.GAME_RESULT_SCREEN);
    socketManager.off(CONSTANTS.EVENTS.TURN_TAKEN_BY_OPPONENT);
    socketManager.off(CONSTANTS.EVENTS.CARD_PLACED);
    window.removeEventListener("appMessage", this.bindAppMessageListener);
    window.removeEventListener("message", this.bindAppMessageListener);
  }

  public destroy(options?: boolean | DestroyOptions) {
    super.destroy(options);
  }

  public blur() {
    this.playerBar.clearExpiringTimer();
  }
}

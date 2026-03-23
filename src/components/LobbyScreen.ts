import { Container, Sprite } from "pixi.js";
import { Logo } from "./Logo.js";
import { LobbySelection } from "./LobbySelection.js";
import { PlayButton } from "./PlayButton.js";
import { CurrencySwitch } from "../ui/CurrencySwitch.js";
import { CURRENCY_CODES } from "../types/index.js";
import { Lobby } from "../store/storeTypes.js";
import { Currency } from "../types/playable.js";
import { registerInLobby } from "../screens/base/index.js";
import { ClientEvent } from "../utils/clientEvent.js";
import { Logger } from "../utils/logger.js";
import { LobbyFormatContainer } from "./LobbyFormatContainer.js";
import { getLobbyScreenUIConfig } from "../screens/base/UIConfigs.js";
import gsap from "gsap";
import { app } from "../app.js";
import { CircleButton } from "../ui/CircleButton.js";
import { navigation } from "../utils/navigation.js";
import { sfx } from "../utils/audio.js";

export class LobbyScreen extends Container {
  // Static property to indicate if this screen requires wallet data
  // Set to false by default - can be overridden by subclasses or partner-specific implementations
  static requiredWalletData = false;

  public background: Sprite;
  public logoContainer: Logo;
  public currencySelectorContainer?: CurrencySwitch;
  public lobbySelectionContainer?: LobbySelection;
  public playButtonContainer: PlayButton;
  public settingButton: CircleButton;

  private selectedLobby: Lobby | undefined = undefined;
  private lobbies: Lobby[] = [];
  private currencyBalances: Currency[] = [];
  private isAutoRetry: boolean = false;
  private walletData?: { currencies?: Currency[] };
  // Stored for future use in error handling UI (matches LobbyScreen.withWallet pattern)
  private _walletError: boolean = false;
  private _walletRetryCount: number = 0;
  private appHeight: number = 0;
  private hasActiveLobbies: boolean = false;

  constructor({
    appWidth,
    appHeight,
    lobbies = [],
    walletData,
    walletError,
    walletRetryCount,
  }: {
    appWidth: number;
    appHeight: number;
    lobbies?: Lobby[];
    walletData?: {
      currencies?: Currency[];
    };
    walletError?: boolean;
    walletRetryCount?: number;
  }) {
    super();

    this.appHeight = appHeight;
    this.lobbies = lobbies;
    this.hasActiveLobbies = lobbies.length > 0;
    this.walletData = walletData;
    this.currencyBalances = walletData?.currencies || [];
    this._walletError = walletError || false;
    this._walletRetryCount = walletRetryCount || 0;

    // Log wallet state for debugging (matches withWallet pattern)
    if (this._walletError) {
      Logger.info("LobbyScreen initialized with wallet error", {
        retryCount: this._walletRetryCount,
      });
    }

    // Log no lobbies state for debugging
    if (!this.hasActiveLobbies) {
      Logger.warn("LobbyScreen initialized with no active lobbies");
    }

    this.background = Sprite.from("tournament_game_background");
    this.addChild(this.background);

    const uiConfigs = getLobbyScreenUIConfig();
    this.logoContainer = new Logo(uiConfigs.showPartnerLogo);
    this.addChild(this.logoContainer);

    this.settingButton = new CircleButton({ iconName: "setting" });
    if (uiConfigs.showSettingButton) {
      this.addChild(this.settingButton);
    }

    // Only create currency selector if wallet data is available and no error
    // This matches the pattern from LobbyScreen.withWallet
    if (
      this.walletData &&
      this.currencyBalances.length > 0 &&
      !this._walletError
    ) {
      this.currencySelectorContainer = new CurrencySwitch(
        (currency: string) => {
          this.handleCurrencyChange(currency as CURRENCY_CODES);
        },
        this.currencyBalances,
      );
      this.addChild(this.currencySelectorContainer);
    }

    // Only create lobby selection and play button if there are active lobbies
    if (this.hasActiveLobbies) {
      const activeCurrency =
        this.currencySelectorContainer?.getActiveCurrency() ||
        this.lobbies[0].currencyCode;
      this.lobbySelectionContainer = new LobbySelection(
        this.lobbies,
        activeCurrency,
        this.selectedLobby,
      );
      this.addChild(this.lobbySelectionContainer);

      // CRITICAL: Sync selected lobby with LobbySelection after initialization
      // LobbySelection filters by format and restores saved preferences in its constructor
      // We must sync to avoid sending wrong lobby ID on registration
      this.selectedLobby = this.lobbySelectionContainer.getSelectedLobby();
    }

    this.playButtonContainer = new PlayButton();
    this.addChild(this.playButtonContainer);

    this.setLayout(appWidth, appHeight);
  }

  private handleCurrencyChange(currency: CURRENCY_CODES) {
    if (!this.currencySelectorContainer || !this.lobbySelectionContainer)
      return;

    Logger.info("Currency changed to:", currency);
    // Update currency in lobby selection
    this.lobbySelectionContainer.setActiveCurrency(currency);
    // Get the selected lobby from lobby selection
    this.selectedLobby = this.lobbySelectionContainer.getSelectedLobby();
  }

  private setLayout(appWidth: number, appHeight: number) {
    // Position logo at top
    this.logoContainer.x = appWidth / 2 - this.logoContainer.width / 2;
    this.logoContainer.y = 150;

    // Position setting button at top-right
    this.settingButton.x = appWidth - this.settingButton.width - 35;
    this.settingButton.y = 50;

    // Position play button at bottom
    this.playButtonContainer.x =
      appWidth / 2 - this.playButtonContainer.width / 2;
    this.playButtonContainer.y =
      appHeight - this.playButtonContainer.height - 50;

    // Position lobby selection in middle (only if it exists)
    if (this.lobbySelectionContainer) {
      this.lobbySelectionContainer.x =
        appWidth / 2 - this.lobbySelectionContainer.width / 2;
      this.lobbySelectionContainer.y =
        this.playButtonContainer.y - this.lobbySelectionContainer.height - 30;
    }

    // Position currency selector below logo (only if it exists)
    if (this.currencySelectorContainer && this.lobbySelectionContainer) {
      this.currencySelectorContainer.x =
        appWidth / 2 - this.currencySelectorContainer.width / 2;
      this.currencySelectorContainer.y =
        this.lobbySelectionContainer.y -
        this.currencySelectorContainer.height -
        60;
    }
  }

  public resize(width: number, height: number) {
    this.appHeight = height;
    this.setLayout(width, height);
    if (this.currencySelectorContainer) {
      this.currencySelectorContainer.updateLayout();
    }
  }

  private handlePlayButtonPress = async () => {
    try {
      Logger.info("handlePlayButtonPress called", {
        isAutoRetry: this.isAutoRetry,
        hasActiveLobbies: this.hasActiveLobbies,
        selectedLobby: this.selectedLobby,
      });

      if (!this.hasActiveLobbies || !this.selectedLobby) {
        Logger.warn("Cannot register: No active lobbies or no lobby selected");
        return;
      }

      // Disable interaction and grey out play button
      this.playButtonContainer.interactive = false;

      // Show loading state with subtle scale animation
      gsap.to(this.playButtonContainer.playButtonText, {
        alpha: 0.5,
        duration: 0.2,
        ease: "power2.out",
      });
      sfx.play("common/button-click.mp3");

      await registerInLobby(this.selectedLobby);
    } catch (error) {
      Logger.error("Error in handlePlayButtonPress", error);

      // Restore button state on error
      this.playButtonContainer.alpha = 1;
    } finally {
      // Always restore button state (for success, failure, or cancellation)
      this.playButtonContainer.interactive = true;
      gsap.to(this.playButtonContainer.playButtonText, {
        alpha: 1,
        duration: 0.2,
        ease: "power2.out",
      });
    }
  };

  private handleLobbyFormatSelection = (data: {
    container: LobbyFormatContainer;
    index: number;
    formatText: string;
  }) => {
    if (!this.lobbySelectionContainer) return;

    // Update active format index in lobby selection
    this.lobbySelectionContainer.setActiveLobbyFormatByIndex(data.index);
    // Get the selected lobby from lobby selection
    this.selectedLobby = this.lobbySelectionContainer.getSelectedLobby();
  };

  private handleLobbySelection = (lobby: Lobby) => {
    Logger.info("Lobby selected:", lobby._id);
    this.selectedLobby = lobby;
    // Note: Lobby preference is already saved in LobbySelection component
    // No need to save here to avoid duplication
  };

  private handleSettingButtonPress = async () => {
    const { SettingsPopup } = await import("../popups/SettingsPopup.js");
    navigation.presentPopup(SettingsPopup, { hideHowToPlayButton: true });
  };

  public handleAppMessage = (event: MessageEvent) => {
    try {
      if (event.data.type === "QUIT_GAME" || event.data.type === "GAME_LEAVE") {
        Logger.info("QUIT_GAME or GAME_LEAVE called", event.data);
        ClientEvent.QuitView();
      }
      if (event.data.type === "RETRY_REGISTRATION") {
        Logger.info("RETRY_REGISTRATION called", event.data);
        this.isAutoRetry = true;
        this.handlePlayButtonPress();
      }
    } catch (error) {
      Logger.error("Error handling app message in LobbyScreen:", error);
    } finally {
      this.isAutoRetry = false;
    }
  };

  private attachListeners() {
    // Only enable play button if there are active lobbies
    if (this.hasActiveLobbies) {
      this.playButtonContainer.interactive = true;
      this.playButtonContainer.cursor = "pointer";
      this.playButtonContainer.on("pointerdown", this.handlePlayButtonPress);
    } else {
      this.playButtonContainer.interactive = false;
      this.playButtonContainer.alpha = 0.5;
    }

    // Listen for lobby format selection changes (only if lobby selection exists)
    if (this.lobbySelectionContainer) {
      this.lobbySelectionContainer.on(
        "lobby-format-selected",
        this.handleLobbyFormatSelection,
      );

      // Listen for lobby selection changes (from plus/minus buttons)
      this.lobbySelectionContainer.on(
        "lobby-selected",
        this.handleLobbySelection,
      );
    }

    // Listen for setting button press
    this.settingButton.on("pointerdown", this.handleSettingButtonPress);

    window.addEventListener("message", this.handleAppMessage);
    window.addEventListener("appMessage", (event) => {
      this.handleAppMessage(event as MessageEvent);
    });
  }

  private offListeners() {
    this.playButtonContainer.off("pointerdown", this.handlePlayButtonPress);

    if (this.lobbySelectionContainer) {
      this.lobbySelectionContainer.off(
        "lobby-format-selected",
        this.handleLobbyFormatSelection,
      );
      this.lobbySelectionContainer.off(
        "lobby-selected",
        this.handleLobbySelection,
      );
    }

    this.settingButton.off("pointerdown", this.handleSettingButtonPress);
    window.removeEventListener("message", this.handleAppMessage);
    window.removeEventListener("appMessage", (event) => {
      this.handleAppMessage(event as MessageEvent);
    });
  }

  public async show() {
    this.visible = true;

    // // Set initial positions for entrance animation
    // const screenHeight = this.appHeight || app.screen.height;

    // // Start with elements off-screen
    // gsap.set(this.playButtonContainer, { y: screenHeight + 100 });
    // gsap.set(this.lobbySelectionContainer, { y: screenHeight + 100 });
    // if (this.currencySelectorContainer) {
    //   gsap.set(this.currencySelectorContainer, { y: screenHeight + 100 });
    // }

    // // Animate elements into view
    // const animationDuration = 0.6;
    // const stagger = 0.1;

    // // Currency selector slides up from bottom (if exists)
    // if (this.currencySelectorContainer) {
    //   const targetY =
    //     this.lobbySelectionContainer.y -
    //     this.currencySelectorContainer.height -
    //     60;
    //   gsap.to(this.currencySelectorContainer, {
    //     y: targetY,
    //     duration: animationDuration,
    //     delay: stagger,
    //     ease: "back.out(1)",
    //   });
    // }

    // // Lobby selection slides up from bottom
    // const lobbyTargetY =
    //   this.appHeight -
    //   this.playButtonContainer.height -
    //   this.lobbySelectionContainer.height -
    //   80;
    // gsap.to(this.lobbySelectionContainer, {
    //   y: lobbyTargetY,
    //   duration: animationDuration,
    //   delay: stagger * 2,
    //   ease: "back.out(1)",
    // });

    // // Play button slides up from bottom
    // const playTargetY = this.appHeight - this.playButtonContainer.height - 50;
    // await gsap.to(this.playButtonContainer, {
    //   y: playTargetY,
    //   duration: animationDuration,
    //   delay: stagger * 3,
    //   ease: "back.out(1)",
    // });

    this.attachListeners();

    ClientEvent.GameStateChange({
      gameState: "Lobby",
    });
  }

  public async hide() {
    this.offListeners();

    const screenHeight = this.appHeight || app.screen.height;
    const animationDuration = 0.5;
    const stagger = 0.08;

    // Play button slides down out of screen
    gsap.to(this.playButtonContainer, {
      y: screenHeight + 100,
      duration: animationDuration,
      ease: "back.in(1.2)",
    });

    // Lobby selection slides down out of screen (only if it exists)
    if (this.lobbySelectionContainer) {
      gsap.to(this.lobbySelectionContainer, {
        y: screenHeight + 100,
        duration: animationDuration,
        delay: stagger,
        ease: "back.in(1.2)",
      });
    }

    // Currency selector slides down out of screen (if exists)
    if (this.currencySelectorContainer) {
      gsap.to(this.currencySelectorContainer, {
        y: screenHeight + 100,
        duration: animationDuration,
        delay: stagger * 2,
        ease: "back.in(1.2)",
      });
    }

    gsap.to(this.logoContainer, {
      y: -200,
      duration: animationDuration,
      delay: stagger * 3,
      ease: "back.in(1.2)",
    });

    // Wait for all animations to complete
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, animationDuration * 1000);
    });
  }
}

import { Container, Ticker } from "pixi.js";
import { areBundlesLoaded, loadBundles } from "./assets";
import { app } from "../app";
import { GAME_MODES } from "../constants";
import { BlankScreen } from "../screens/BlankScreen";
import { Logger } from "./logger";
import { sendMessageToApp } from "../scripts/webToAppCommunication.helper";
import { socketManager } from "../network/SocketManager";
import { apiClient } from "../network/apis";
import { InfoPopup } from "../popups/InfoPopup";
import { isFreeWin } from "./game";
import { ClientEvent } from "./clientEvent";
import { sfx } from "./audio";
import { PARTNER_ID, CURRENT_PARTNER } from "../network/constants";
// Old import - commented
// import { getLobbyScreenConstructor } from "../screens/LobbyScreens/lobbyScreenFactory";
import { CURRENCY_CODES } from "../types";
import { Currency } from "../types/playable";
import { LobbyScreen } from "../components/LobbyScreen";

/** Interface for app screens */
export interface AppScreen extends Container {
  /** Show the screen */
  show?(): Promise<void>;
  /** Hide the screen */
  hide?(): Promise<void>;
  /** Pause the screen */
  pause?(): Promise<void>;
  /** Resume the screen */
  resume?(): Promise<void>;
  /** Prepare screen, before showing */
  prepare?(): void;
  /** Reset screen, after hidden */
  reset?(): void;
  /** Update the screen, passing delta time/step */
  update?(time: Ticker): void;
  /** Resize the screen */
  resize?(width: number, height: number): void;
  /** Blur the screen */
  blur?(): void;
  /** Focus the screen */
  focus?(): void;
}

/** Interface for app screens constructors */
interface AppScreenConstructor<T> {
  new (screenOptions: T): AppScreen;
  /** List of assets bundles required by the screen */
  assetBundles?: string[];
}

class Navigation {
  /** Container for screens */
  public container = new Container();

  /** Application width */
  public width = 0;

  /** Application height */
  public height = 0;

  /** Constant background view for all screens */
  public background?: AppScreen;

  /** Current screen being displayed */
  public currentScreen?: AppScreen;

  /** Current popup being displayed */
  public currentPopup?: AppScreen;

  /** Wallet data retry count */
  private walletRetryCount = 0;

  /** Flag to track if GameLoaded event has been sent */
  private hasGameLoadedEventBeenSent = false;

  /** Set the  default load screen */
  public setBackground(ctor: AppScreenConstructor<unknown>) {
    this.background = new ctor({});
    this.addAndShowScreen(this.background);
  }

  /** Add screen to the stage, link update & resize functions */
  private async addAndShowScreen(screen: AppScreen) {
    // Add navigation container to stage if it does not have a parent yet
    if (!this.container.parent) {
      app.stage.addChild(this.container);
    }

    // Add screen to stage
    this.container.addChild(screen);

    // Setup things and pre-organize screen before showing
    if (screen.prepare) {
      screen.prepare();
    }

    // Add screen's resize handler, if available
    if (screen.resize) {
      // Trigger a first resize
      screen.resize(this.width, this.height);
    }

    // Add update function if available
    if (screen.update) {
      app.ticker.add(screen.update, screen);
    }

    // Show the new screen
    if (screen.show) {
      screen.interactiveChildren = false;
      await screen.show();
      screen.interactiveChildren = true;
    }

    // Send GameLoaded event after the first screen is shown and visible
    // This ensures the client doesn't hide the loader before the screen is ready
    if (!this.hasGameLoadedEventBeenSent && this.currentScreen === screen) {
      this.hasGameLoadedEventBeenSent = true;
      Logger.info("First screen is now visible - sending GameLoaded event");
      ClientEvent.GameLoaded();
    }
  }

  /** Remove screen from the stage, unlink update & resize functions */
  private async hideAndRemoveScreen(screen: AppScreen) {
    // Prevent interaction in the screen
    screen.interactiveChildren = false;

    // Hide screen if method is available
    if (screen.hide) {
      await screen.hide();
    }

    // Unlink update function if method is available
    if (screen.update) {
      app.ticker.remove(screen.update, screen);
    }

    // Remove screen from its parent (usually app.stage, if not changed)
    if (screen.parent) {
      screen.parent.removeChild(screen);
    }

    // Clean up the screen so that instance can be reused again later
    if (screen.reset) {
      screen.reset();
    }

    if (screen.destroy) {
      screen.destroy();
    }
  }

  /**
   * Hide current screen (if there is one) and present a new screen.
   * Any class that matches AppScreen interface can be used here.
   */
  public async showScreen<T>(ctor: AppScreenConstructor<T>, screenOptions: T) {
    // Block interactivity in current screen

    if (this.currentScreen) {
      this.currentScreen.interactiveChildren = false;
    }

    // Load assets for the new screen, if available
    if (ctor.assetBundles && !areBundlesLoaded(ctor.assetBundles)) {
      // Load all assets required by this new screen
      await loadBundles(ctor.assetBundles);
    }

    // If there is a screen already created, hide and destroy it
    if (this.currentScreen) {
      await this.hideAndRemoveScreen(this.currentScreen);
    }

    // Create the new screen and add that to the stage
    this.currentScreen = new ctor(screenOptions);
    await this.addAndShowScreen(this.currentScreen);
  }

  /**
   * Resize screens
   * @param width Viewport width
   * @param height Viewport height
   */
  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.currentScreen?.resize?.(width, height);
    this.currentPopup?.resize?.(width, height);
    this.background?.resize?.(width, height);
  }

  /**
   * Show up a popup over current screen
   */
  public async presentPopup<T>(ctor: AppScreenConstructor<T>, options: T) {
    this.dismissPopup();
    if (this.currentScreen) {
      this.currentScreen.interactiveChildren = false;
      await this.currentScreen.pause?.();
    }

    if (this.currentPopup) {
      await this.hideAndRemoveScreen(this.currentPopup);
    }

    this.currentPopup = new ctor(options);
    await this.addAndShowScreen(this.currentPopup);
  }

  /**
   * Dismiss current popup, if there is one
   */
  public async dismissPopup() {
    if (!this.currentPopup) return;
    const popup = this.currentPopup;
    this.currentPopup = undefined;
    await this.hideAndRemoveScreen(popup);
    if (this.currentScreen) {
      this.currentScreen.interactiveChildren = true;
      this.currentScreen.resume?.();
    }
  }

  /**
   * Blur screens when lose focus
   */
  public blur() {
    this.currentScreen?.blur?.();
    this.currentPopup?.blur?.();
    this.background?.blur?.();
  }

  /**
   * Focus screens
   */
  public focus() {
    this.currentScreen?.focus?.();
    this.currentPopup?.focus?.();
    this.background?.focus?.();
  }

  public closeWebView = (error?: string) => {
    try {
      ClientEvent.QuitView();
      socketManager.disconnect();
    } catch (error) {
      Logger.info("Error disconnecting socket", error);
    }
    try {
      // Handle playable mode
      if (import.meta.env.VITE_GAME_MODE === GAME_MODES.PLAYABLE) {
        this.dismissPopup();
        this.showScreen(BlankScreen, {});
        // * removing listeners
        document.getElementById("playScreen")!.style.display = "flex";
        Logger.info("Closed playable mode");
        return;
      }

      sendMessageToApp({
        eventName: "quit",
        context: { error: "close web view", message: error },
      });
    } catch (error) {
      Logger.error("Error closing web view:", error);
      sendMessageToApp({
        eventName: "quit",
        context: {
          error: "Failed to close web view",
          message: (error as Error).message,
        },
      });
    }
  };

  public getCurrentScreen(): AppScreen | null {
    if (!this.currentScreen) {
      return null;
    }
    return this.currentScreen;
  }

  public retryWalletData() {
    this.walletRetryCount++;
    this.goBackToLobby(false);
  }

  public resetWalletRetryCount() {
    this.walletRetryCount = 0;
  }

  // ! handle error fallback redirection to lobby
  public async goBackToLobby(
    disconnectSocket: boolean,
    playCashSound?: boolean,
  ) {
    try {
      // Check if LobbyScreen requires wallet data (matching old architecture pattern)
      if (LobbyScreen.requiredWalletData) {
        // Balance plus lobbies flow - load both lobby and wallet data
        const [lobbyResult, walletResult] = await Promise.allSettled([
          apiClient.getGameLobbies(),
          apiClient.getPlayerDetails(),
        ]);

        if (lobbyResult.status === "rejected") {
          Logger.error("Failed to load lobby data:", lobbyResult.reason);
          throw new Error("Failed to load lobby data");
        }

        const lobbyData = lobbyResult.value;
        const walletData =
          walletResult.status === "fulfilled" ? walletResult.value : null;
        const walletError = walletResult.status === "rejected";

        // Reset retry count on successful wallet data load
        if (walletResult.status === "fulfilled") {
          this.resetWalletRetryCount();
        }

        // * map walletData currency to the ember Currency to the lobby data
        const mappedWalletData = walletData?.currencies?.map(
          (currency: Currency) => {
            if (CURRENT_PARTNER === PARTNER_ID.em) {
              if ((currency.currencyCode as string) === "EMT") {
                currency.currencyCode = CURRENCY_CODES.PLAY_COINS;
              }
              if ((currency.currencyCode as string) === "SATS") {
                currency.currencyCode = CURRENCY_CODES.PLAY_CASH;
              }
            }
            return currency;
          },
        );

        await navigation.showScreen(LobbyScreen, {
          appWidth: app.screen.width,
          appHeight: app.screen.height,
          lobbies: lobbyData.lobbies,
          walletData: walletData
            ? {
                currencies: mappedWalletData,
              }
            : undefined,
          walletError,
          walletRetryCount: this.walletRetryCount,
        });
        await this.dismissPopup();
      } else {
        // Simple lobby flow - only load lobby data
        const lobbyData = await apiClient.getGameLobbies();
        navigation.showScreen(LobbyScreen, {
          appWidth: app.screen.width,
          appHeight: app.screen.height,
          lobbies: lobbyData.lobbies,
        });
      }

      if (disconnectSocket) {
        socketManager.disconnect();
      }
      if (playCashSound) {
        sfx.play("common/cash_register_lobby.mp3");
      }
    } catch (error) {
      Logger.error("Error going back to lobby:", error);
    }
  }

  public graceFullExit = (exitReason: string) => {
    let countdown = 3;
    Logger.info("Graceful exit", { exitReason });
    const intervalId = setInterval(() => {
      this.presentPopup(InfoPopup, {
        message: `Sorry, we couldn't find a match for you at this time. Going back to lobby in ${countdown}...`,
        showLoader: false,
        skipAnimation: true,
        onOkPress: () => {
          clearInterval(intervalId);
          if (isFreeWin() || CURRENT_PARTNER === PARTNER_ID.bt) {
            this.closeWebView();
          } else {
            this.goBackToLobby(true);
          }
        },
        ...(CURRENT_PARTNER == PARTNER_ID.em && {
          textColor: 0xfefff9,
          backgroundColor: 0x121212,
        }),
      });
      countdown--;
      if (countdown < 0) {
        clearInterval(intervalId);
        if (isFreeWin() || CURRENT_PARTNER === PARTNER_ID.bt) {
          this.closeWebView();
        } else {
          this.goBackToLobby(true);
        }
      }
    }, 1000);
    sendMessageToApp({
      eventName: "close_loader",
      context: {
        eventRef: exitReason,
      },
    });
  };
}

/** Shared navigation instance */
export const navigation = new Navigation();

/**
 * LobbyScreenWithWallet - A lobby screen that extends the default lobby with wallet functionality
 *
 * Features:
 * - Currency switching with CurrencySwitch component
 * - Real-time wallet balance display
 * - Filtered lobbies by selected currency
 * - Wallet error handling with retry logic
 * - Graceful fallback when wallet data fails to load
 *
 * Usage:
 * To use this screen for a partner, update lobbyScreenFactory.ts:
 *
 * export function getLobbyScreenWithWalletConstructor() {
 *   switch (CURRENT_PARTNER) {
 *     case PARTNER_ID.your_partner:
 *       return LobbyScreenWithWallet;
 *     default:
 *       return LobbyScreenDefault;
 *   }
 * }
 *
 * Then in navigation.ts, use getLobbyScreenWithWalletConstructor() instead of getLobbyScreenConstructor()
 * when you want wallet functionality.
 */

import { app } from "../../app";
import { Lobby } from "../../store/storeTypes";
import { PlayerDetails } from "../../types/playable";
import { CURRENCY_CODES } from "../../types";
import { CurrencySwitch } from "../../ui/CurrencySwitch";
import { LobbyScreenDefault } from "./LobbyScreen.default";
import { GoldenButton } from "../../ui/GoldenButton";
import { Text } from "pixi.js";
import { navigation } from "../../utils/navigation";
import { handleDefaultLobbySelection } from "../base";

export class LobbyScreenWithWallet extends LobbyScreenDefault {
  static requiredWalletData = true;

  // Wallet-specific components
  protected currencySwitch?: CurrencySwitch;
  private walletErrorMessage!: Text;
  private retryButton?: GoldenButton;

  // State management
  protected walletData: PlayerDetails | null;
  protected walletError: boolean;
  protected walletRetryCount: number;
  protected lobbiesByCurrency: {
    [key in CURRENCY_CODES]: Lobby[];
  } = {
    [CURRENCY_CODES.USD]: [],
    [CURRENCY_CODES.EUR]: [],
    [CURRENCY_CODES.INR]: [],
    [CURRENCY_CODES.PLAY_COINS]: [],
    [CURRENCY_CODES.PLAY_CASH]: [],
    [CURRENCY_CODES.GEMS]: [],
  };

  constructor(options: {
    lobbies: Lobby[];
    walletData: PlayerDetails | null;
    walletError?: boolean;
    walletRetryCount?: number;
  }) {
    super(options);

    this.walletData = options.walletData;
    this.walletError = options.walletError || false;
    this.walletRetryCount = options.walletRetryCount || 0;

    // Create wallet error components
    this.createWalletErrorComponents();

    if (this.walletData && !this.walletError) {
      this.createFilteredLobbies(options.lobbies);
      this.setupWalletComponents();
      this.showNormalState();
    } else {
      this.showWalletErrorState();
    }

    this.setupLayout();
    this.attachWalletEventListeners();
  }

  private createWalletErrorComponents() {
    // Create wallet error message
    const errorText =
      this.walletRetryCount >= 3
        ? "Please raise an issue, we are already fixing it"
        : "Failed to load your wallet details";

    this.walletErrorMessage = new Text(errorText, {
      fontFamily: "Inter",
      fontSize: 18,
      fill: 0xff6b6b,
      fontWeight: "400",
      align: "center",
    });
    this.addChild(this.walletErrorMessage);

    // Create retry button (only if retry count < 3)
    if (this.walletRetryCount < 3) {
      this.retryButton = new GoldenButton(undefined, {
        height: 80,
        width: 250,
        secondaryTextFontSize: 20,
      });
      // Set retry text manually using type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.retryButton as any).primaryText.text = "Retry";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.retryButton as any).secondaryText.text = "";
      this.addChild(this.retryButton);
    }
  }

  private setupWalletComponents() {
    if (!this.walletData) return;

    this.currencySwitch = new CurrencySwitch((currency: string) => {
      this.handleCurrencyChange(currency as CURRENCY_CODES);
    }, this.walletData.currencies);
    this.addChild(this.currencySwitch);
  }

  private createFilteredLobbies(lobbies: Lobby[]) {
    if (!this.walletData) return;

    this.walletData.currencies.forEach((currency) => {
      this.lobbiesByCurrency[currency.currencyCode as CURRENCY_CODES] =
        lobbies.filter((lobby) => lobby.currencyCode === currency.currencyCode);
    });
  }

  protected handleCurrencyChange(currency: CURRENCY_CODES) {
    const currencyLobbies = this.lobbiesByCurrency[currency];

    if (currencyLobbies.length === 0) {
      this.showNoLobbiesState();
    } else {
      this.showLobbiesWithWalletState(currencyLobbies);
    }
  }

  private showNormalState() {
    if (!this.currencySwitch || !this.walletData) return;

    const initialCurrency = this.currencySwitch.getActiveCurrency();
    const initialLobbies = this.lobbiesByCurrency[initialCurrency];

    if (initialLobbies.length > 0) {
      this.showLobbiesWithWalletState(initialLobbies);
    } else {
      this.showNoLobbiesState();
    }

    // Hide error components
    this.walletErrorMessage.visible = false;
    if (this.retryButton) this.retryButton.visible = false;
  }

  private showLobbiesWithWalletState(lobbies: Lobby[]) {
    // Update coin scroller with filtered lobbies
    this.coinScroller.updateValues(lobbies);

    // Select first lobby if available
    if (lobbies.length > 0) {
      this.selectedLobby = handleDefaultLobbySelection(lobbies);
      if (this.selectedLobby) {
        this.winShowBox.setText(this.selectedLobby);
        this.winButton.setText(this.selectedLobby);
        this.winButton.updateTextLayout();
      }
    }

    // Show normal lobby components
    this.coinScroller.visible = true;
    this.winShowBox.visible = true;
    this.winButton.visible = true;
    this.noLobbiesMessage.visible = false;

    // Show currency switch and balance
    if (this.currencySwitch) this.currencySwitch.visible = true;
  }

  private showNoLobbiesState() {
    this.coinScroller.visible = false;
    this.winShowBox.visible = false;
    this.winButton.visible = false;
    this.noLobbiesMessage.visible = true;

    // Show currency switch and balance even when no lobbies
    if (this.currencySwitch) this.currencySwitch.visible = true;
  }

  private showWalletErrorState() {
    // Hide normal components
    this.coinScroller.visible = false;
    this.winShowBox.visible = false;
    this.winButton.visible = false;
    this.noLobbiesMessage.visible = false;
    if (this.currencySwitch) this.currencySwitch.visible = false;

    // Show wallet error components
    this.walletErrorMessage.visible = true;
    if (this.retryButton) this.retryButton.visible = true;
  }

  private attachWalletEventListeners() {
    // Retry button event listener
    if (this.retryButton) {
      this.retryButton.onPress.connect(() => {
        this.handleRetryButtonPress();
      });
    }
  }

  private handleRetryButtonPress() {
    navigation.retryWalletData();
  }

  private setupLayout() {
    super.setLayout();

    const appWidth = app.screen.width;
    const appHeight = app.screen.height;

    if (this.walletError || !this.walletData) {
      // Wallet error state layout
      this.walletErrorMessage.x =
        appWidth / 2 - this.walletErrorMessage.width / 2;
      this.walletErrorMessage.y = appHeight / 2 - 50;

      if (this.retryButton) {
        this.retryButton.x = appWidth / 2;
        this.retryButton.y = this.walletErrorMessage.y + 80;
      }
    } else {
      // Normal state with currency switch
      if (this.currencySwitch) {
        this.currencySwitch.x = appWidth / 2 - this.currencySwitch.width / 2;
        this.currencySwitch.y = 30;

        // Adjust other components to accommodate currency switch and balance
        this.coinScroller.y = appHeight / 2 - 10; // Move down a bit to make room
      }
    }
  }

  public async hide() {
    // Clean up wallet-specific listeners
    if (this.retryButton) {
      this.retryButton.onPress.disconnectAll();
    }

    super.hide();
  }

  public resize(width: number, height: number) {
    super.resize(width, height);
    this.setupLayout();
  }
}

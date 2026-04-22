import { app } from "../../app";
import { Lobby } from "../../store/storeTypes";
import { PlayerDetails } from "../../types/playable";
import { CURRENCY_CODES } from "../../types";
import { LobbySelector } from "../../ui/LobbySelector";
import { EmberWinDisplay } from "../../ui/EmberWinDisplay";
import { LobbyScreenWithWallet } from "./LobbyScreen.withWallet";
import { EmberPlayButton } from "../../ui/EmberPlayButton";
import {
  CURRENT_PARTNER,
  PARTNER_SPECIFIC_CONFIG,
} from "../../network/constants";

export class EmberLobbyScreen extends LobbyScreenWithWallet {
  static requiredWalletData = true;

  // Ember-specific components
  private lobbySelector?: LobbySelector;
  private emberWinDisplay?: EmberWinDisplay;
  private emberPlayButton?: EmberPlayButton;

  constructor(options: {
    lobbies: Lobby[];
    walletData: PlayerDetails | null;
    walletError?: boolean;
    walletRetryCount?: number;
  }) {
    super(options);

    // Remove default lobby components to replace with Ember-specific ones
    this.removeChild(this.coinScroller);
    this.removeChild(this.partnerLogo);
    this.removeChild(this.winShowBox);
    this.removeChild(this.winButton);

    // Only setup Ember components if wallet data is available and no error
    if (options.walletData && !options.walletError) {
      this.setupEmberComponents();
      this.showEmberLobbiesState();
    }
    // Error handling is already done by parent class LobbyScreenWithWallet

    this.setupEmberLayout();
    this.attachEmberEventListeners();
  }

  private setupEmberComponents() {
    if (!this.walletData) return;

    // Create Ember-specific components
    this.lobbySelector = new LobbySelector(
      this.getActiveCurrencyLobbies(),
      this.getCurrencyBalances(),
    );
    this.addChild(this.lobbySelector);

    this.emberWinDisplay = new EmberWinDisplay();
    this.addChild(this.emberWinDisplay);

    this.emberPlayButton = new EmberPlayButton();
    this.addChild(this.emberPlayButton);
  }

  private getActiveCurrencyLobbies(): Lobby[] {
    if (!this.currencySwitch) return [];
    return this.lobbiesByCurrency[this.currencySwitch.getActiveCurrency()];
  }

  private getCurrencyBalances() {
    if (!this.walletData || !this.currencySwitch) {
      // Fallback
      return {
        balance: 0,
        currencyCode: PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].defaultCurrency,
      };
    }

    const currencyBalances = this.walletData.currencies.find(
      (currency) =>
        currency.currencyCode === this.currencySwitch!.getActiveCurrency(),
    );

    if (currencyBalances) {
      return currencyBalances;
    }

    // Fallback
    return {
      balance: 0,
      currencyCode: PARTNER_SPECIFIC_CONFIG[CURRENT_PARTNER].defaultCurrency,
    };
  }

  private showEmberLobbiesState() {
    const initialLobbies = this.getActiveCurrencyLobbies();
    if (initialLobbies.length > 0) {
      this.selectedLobby = initialLobbies[0];
      this.showEmberLobbiesWithData(initialLobbies);
    } else {
      this.showEmberNoLobbiesState();
    }
  }

  private showEmberLobbiesWithData(lobbies: Lobby[]) {
    if (this.lobbySelector) {
      this.lobbySelector.updateValues(lobbies, this.getCurrencyBalances());

      const selectedLobby = this.lobbySelector.getCurrentValue();
      if (selectedLobby) {
        this.selectedLobby = selectedLobby;
        this.updateEmberWinDisplay();
      }

      // Show Ember UI elements
      this.lobbySelector.visible = true;
      if (this.emberWinDisplay) this.emberWinDisplay.visible = true;
      if (this.emberPlayButton) this.emberPlayButton.visible = true;
    }

    this.noLobbiesMessage.visible = false;
  }

  private showEmberNoLobbiesState() {
    if (this.lobbySelector) this.lobbySelector.visible = false;
    if (this.emberWinDisplay) this.emberWinDisplay.visible = false;
    if (this.emberPlayButton) this.emberPlayButton.visible = false;
    this.noLobbiesMessage.visible = true;
  }

  private updateEmberWinDisplay() {
    if (this.selectedLobby && this.emberWinDisplay && this.emberPlayButton) {
      this.emberWinDisplay.updateDisplay(this.selectedLobby);
      this.emberWinDisplay.x =
        app.screen.width / 2 - this.emberWinDisplay.width / 2;
      this.emberPlayButton.setEnabled(true);
    } else {
      if (this.emberWinDisplay) this.emberWinDisplay.hide();
      if (this.emberPlayButton) this.emberPlayButton.setEnabled(false);
    }
  }

  // Override parent's handleCurrencyChange to use Ember-specific logic
  protected handleCurrencyChange(currency: CURRENCY_CODES) {
    const currencyLobbies = this.lobbiesByCurrency[currency];

    if (currencyLobbies.length === 0) {
      this.showEmberNoLobbiesState();
    } else {
      this.showEmberLobbiesWithData(currencyLobbies);
    }
  }

  private setupEmberLayout() {
    const appWidth = app.screen.width;
    const appHeight = app.screen.height;

    // Only setup normal layout - error layout is handled by parent class
    if (this.walletData && !this.walletError) {
      // Normal Ember layout with currency switch
      if (this.currencySwitch) {
        this.currencySwitch.x = appWidth / 2 - this.currencySwitch.width / 2;
        this.currencySwitch.y = 30;
      }

      // Lobby selector positioning
      if (this.lobbySelector) {
        this.lobbySelector.x = appWidth / 2;
        this.lobbySelector.y = this.aceAndJack.y + this.aceAndJack.height + 150;
      }

      // Ember win display positioning
      if (this.emberWinDisplay && this.lobbySelector) {
        this.emberWinDisplay.x = appWidth / 2 - this.emberWinDisplay.width / 2;
        this.emberWinDisplay.y = this.lobbySelector.y + 50;
      }

      // Ember play button positioning
      if (this.emberPlayButton) {
        this.emberPlayButton.x = appWidth / 2;
        this.emberPlayButton.y = appHeight - 100;
      }
    }
  }

  private attachEmberEventListeners() {
    if (this.lobbySelector) {
      this.lobbySelector.on("selection-changed", (lobby: Lobby) => {
        this.selectedLobby = lobby;
        this.updateEmberWinDisplay();
      });
    }

    if (this.emberPlayButton) {
      this.emberPlayButton.onPress.connect(() => {
        this.handleWinButtonPress();
      });
    }
    // Retry functionality is handled by parent class LobbyScreenWithWallet
  }

  public async hide() {
    // Clean up Ember-specific listeners
    if (this.lobbySelector) {
      this.lobbySelector.off("selection-changed");
    }
    if (this.emberPlayButton) {
      this.emberPlayButton.onPress.disconnectAll();
    }
    // Retry cleanup is handled by parent class

    super.hide();
  }

  public resize(width: number, height: number) {
    super.resize(width, height);
    this.setupEmberLayout();
  }
}

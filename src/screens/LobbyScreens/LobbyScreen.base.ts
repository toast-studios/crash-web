import { Container, Sprite, Text, TextOptions } from "pixi.js";
import { TiledBackground } from "../../ui/TiledBackground";
import { CircleButton } from "../../ui/CircleButton";
import { navigation } from "../../utils/navigation";
import { SettingsPopup } from "../../popups/SettingsPopup";
import { Lobby } from "../../store/storeTypes";
import { LobbyCoinScroller } from "../../ui/LobbyCoinScroller";
import { GoldenButton } from "../../ui/GoldenButton";
import { Logger } from "../../utils/logger";
import { handleDefaultLobbySelection, registerInLobby } from "../base";
import { ClientEvent } from "../../utils/clientEvent";
import { WinShowBox } from "../../ui/WinShowBox";
import { BaseUIConfig, getLobbyScreenUIConfig } from "../base/UIConfigs";
import { app } from "../../app";

export class LobbyScreenBase extends Container {
  public background: TiledBackground;
  public exitButton: CircleButton;
  public settingButton: CircleButton;
  public cardMachine: Sprite;
  public aceAndJack: Sprite;
  public gameLogo: Sprite;
  public noLobbiesMessage: Text;
  public noLobbiesMessageText: TextOptions = {
    text: "No Active Lobbies",
    style: {
      fontFamily: "Inter",
      fontSize: 32,
      fill: 0xffffff,
      fontWeight: "700",
      align: "center",
    },
  };
  public selectedLobby: Lobby | undefined = undefined;
  public coinScroller: LobbyCoinScroller;
  public winShowBox: WinShowBox;
  public winButton: GoldenButton;
  public partnerLogo: Sprite;

  private uiConfigs: BaseUIConfig["lobbyScreen"] = getLobbyScreenUIConfig();
  constructor(options: { lobbies: Lobby[] }) {
    super();

    this.background = new TiledBackground(true);
    this.addChild(this.background);

    this.exitButton = new CircleButton({ iconName: "exit-icon" });
    if (this.uiConfigs.showExitButton) this.addChild(this.exitButton);

    this.settingButton = new CircleButton({ iconName: "setting" });
    if (this.uiConfigs.showSettingButton) this.addChild(this.settingButton);

    this.aceAndJack = Sprite.from("ace-and-jack");
    this.addChild(this.aceAndJack);

    this.gameLogo = Sprite.from("logo");
    this.addChild(this.gameLogo);

    this.cardMachine = Sprite.from("card-machine");
    this.addChild(this.cardMachine);

    this.selectedLobby = handleDefaultLobbySelection(options.lobbies);

    this.coinScroller = new LobbyCoinScroller(
      options.lobbies,
      this.selectedLobby,
    );
    this.addChild(this.coinScroller);

    this.noLobbiesMessage = new Text(this.noLobbiesMessageText);
    this.noLobbiesMessage.visible = !this.selectedLobby;
    this.addChild(this.noLobbiesMessage);

    this.winShowBox = new WinShowBox({ lobby: this.selectedLobby });
    if (this.uiConfigs.showWinShowBox) this.addChild(this.winShowBox);

    this.winButton = new GoldenButton(this.selectedLobby, {
      height: 144,
      width: 420,
    });
    this.addChild(this.winButton);

    this.partnerLogo = Sprite.from("partner_logo");
    if (this.uiConfigs.showPartnerLogo) this.addChild(this.partnerLogo);
  }

  public handleExitButtonPress() {
    navigation.closeWebView();
  }

  public handleSettingButtonPress() {
    navigation.presentPopup(SettingsPopup, {});
  }

  public handleCoinScrollerSelection(selectedLobby: Lobby) {
    this.selectedLobby = selectedLobby;
    this.winButton.setText(selectedLobby);
    this.winButton.updateTextLayout();
    this.winShowBox.setText(selectedLobby);
  }

  private isAutoRetry: boolean = false;
  public async handleWinButtonPress() {
    try {
      Logger.info("handleWinButtonPress called", {
        isAutoRetry: this.isAutoRetry,
      });
      this.winButton.interactive = false;
      await registerInLobby(this.selectedLobby);
    } catch (error) {
      Logger.error("Error in handleWinButtonPress", error);
    } finally {
      this.winButton.interactive = true;
    }
  }

  public handleAppMessage = (event: MessageEvent) => {
    try {
      if (event.data.type === "QUIT_GAME" || event.data.type === "GAME_LEAVE") {
        Logger.info("QUIT_GAME or GAME_LEAVE called", event.data);
        ClientEvent.QuitView();
      }
      if (event.data.type === "RETRY_REGISTRATION") {
        Logger.info("RETRY_REGISTRATION called", event.data);
        this.isAutoRetry = true;
        this.handleWinButtonPress();
      }
    } catch (error) {
      Logger.error("Error handling app message in LobbyScreen:", error);
    } finally {
      this.isAutoRetry = false;
    }
  };

  public resize(width: number, height: number) {
    this.background.resize(width, height);
  }

  /**
   * Dynamically positions aceAndJack and cardMachine based on table width relative to screen width
   * If table width < screen width: snap to table left/right
   * If table width >= screen width: snap to screen left/right
   * Also positions partner logo at the center between aceAndJack and cardMachine
   */
  protected applyDynamicSnapping() {
    const tableLeft =
      this.background.gameTable.x - this.background.gameTable.width / 2;
    const tableRight =
      this.background.gameTable.x + this.background.gameTable.width / 2;
    const screenLeft = 0;
    const screenRight = app.screen.width;

    if (this.background.gameTable.width >= app.screen.width) {
      // Table is wider than or equal to screen - snap to screen edges
      this.aceAndJack.x = screenLeft;
      this.cardMachine.x = screenRight - this.cardMachine.width / 2;
    } else {
      // Table is narrower than screen - snap to table edges
      this.aceAndJack.x = tableLeft;
      this.cardMachine.x = tableRight - this.cardMachine.width / 2;
    }

    // Position partner logo at center between aceAndJack and cardMachine
    this.partnerLogo.x = (this.aceAndJack.x + this.cardMachine.x) / 2;
  }

  public async show() {
    this.background.show();
    this.attachListeners();

    ClientEvent.GameStateChange({
      gameState: "Lobby",
    });
  }

  public async hide() {
    this.offListeners();
  }

  private attachListeners() {
    this.exitButton.on("pointerdown", this.handleExitButtonPress.bind(this));
    this.settingButton.on(
      "pointerdown",
      this.handleSettingButtonPress.bind(this),
    );
    this.coinScroller.on(
      "selection-changed",
      this.handleCoinScrollerSelection.bind(this),
    );
    this.winButton.onPress.connect(this.handleWinButtonPress.bind(this));
    window.addEventListener("message", this.handleAppMessage.bind(this));
    window.addEventListener("appMessage", (event) => {
      this.handleAppMessage(event as MessageEvent);
    });
  }

  private offListeners() {
    this.exitButton.off("pointerdown", this.handleExitButtonPress.bind(this));
    this.settingButton.off(
      "pointerdown",
      this.handleSettingButtonPress.bind(this),
    );
    this.coinScroller.off(
      "selection-changed",
      this.handleCoinScrollerSelection.bind(this),
    );
    this.winButton.onPress.disconnect(this.handleWinButtonPress.bind(this));
    window.removeEventListener("message", this.handleAppMessage.bind(this));
    window.removeEventListener("appMessage", (event) => {
      this.handleAppMessage(event as MessageEvent);
    });
  }
}

import { app } from "../../app";
import { Lobby } from "../../store/storeTypes";
import { LobbyScreenBase } from "./LobbyScreen.base";

export class LobbyScreenDefault extends LobbyScreenBase {
  static requiredWalletData = false;
  constructor(options: { lobbies: Lobby[] }) {
    super(options);
    this.setLayout();
  }

  protected setLayout() {
    const appWidth = app.screen.width;
    const appHeight = app.screen.height;

    const leftPosition = 50;
    this.exitButton.x = leftPosition;
    this.exitButton.y = 50;
    this.settingButton.x = this.exitButton.x + this.exitButton.width + 30;
    this.settingButton.y = 50;

    this.coinScroller.x = appWidth / 2;
    this.coinScroller.y = appHeight / 2 - 50;

    this.aceAndJack.scale.set(0.5);
    this.aceAndJack.y = this.coinScroller.y - this.aceAndJack.height - 150;

    this.gameLogo.scale.set(0.5);
    this.gameLogo.x = appWidth / 2 - this.gameLogo.width / 2;
    this.gameLogo.y = this.aceAndJack.y;

    // Remove this hacks and use rotated card machine sprite it self
    // this.cardMachine.angle = 230;
    this.cardMachine.scale.set(0.3);
    this.cardMachine.anchor.set(0.5, 0);
    this.cardMachine.y = this.aceAndJack.y;

    // Apply dynamic snapping for aceAndJack and cardMachine positioning
    this.applyDynamicSnapping();

    this.noLobbiesMessage.x = appWidth / 2 - this.noLobbiesMessage.width / 2;
    this.noLobbiesMessage.y = appHeight / 2;

    this.winShowBox.x = appWidth / 2;
    this.winShowBox.y = this.coinScroller.y + this.coinScroller.height + 10;

    this.winButton.x = appWidth / 2;
    this.winButton.y = appHeight - 70;

    this.partnerLogo.x = appWidth / 2 - this.partnerLogo.width / 2;
    this.partnerLogo.y = this.coinScroller.y - this.partnerLogo.height - 10;
  }

  public resize(width: number, height: number) {
    super.resize(width, height);
    this.setLayout();
  }
}

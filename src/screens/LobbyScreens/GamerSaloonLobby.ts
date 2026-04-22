import { app } from "../../app";
import { Lobby } from "../../store/storeTypes";
import { LobbyScreenDefault } from "./LobbyScreen.default";

export class GamerSaloonLobbyScreen extends LobbyScreenDefault {
  static requiredWalletData = false;

  constructor(options: { lobbies: Lobby[] }) {
    super(options);
    this.setupLayout();
  }

  private setupLayout() {
    const appWidth = app.screen.width;

    this.partnerLogo.scale.set(0.6);
    this.partnerLogo.x = appWidth / 2 - this.partnerLogo.width / 2;
    this.partnerLogo.y = 120;

    this.aceAndJack.y = this.partnerLogo.y + this.partnerLogo.height;
    this.cardMachine.y = this.aceAndJack.y + 10;
    this.gameLogo.y = this.aceAndJack.y + 20;
  }

  public resize(width: number, height: number) {
    super.resize(width, height);
    this.setupLayout();
  }
}

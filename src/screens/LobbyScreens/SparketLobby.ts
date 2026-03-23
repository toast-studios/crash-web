import { Sprite } from "pixi.js";
import { app } from "../../app";
import { Lobby } from "../../store/storeTypes";
import { LobbyScreenDefault } from "./LobbyScreen.default";
import { GoldenButton } from "../../ui/GoldenButton";

export class SparketLobbyScreen extends LobbyScreenDefault {
  static requiredWalletData = false;

  constructor(options: { lobbies: Lobby[] }) {
    super(options);
    this.removeChild(this.winButton);

    this.cardMachine.texture = Sprite.from("card-machine-web").texture;
    this.removeChild(this.winButton);
    this.winButton = new GoldenButton(this.selectedLobby, {
      height: 120,
      width: 350,
    });
    this.addChild(this.winButton);
    this.setupLayout();
  }

  private setupLayout() {
    const appWidth = app.screen.width;

    this.cardMachine.angle = 0;
    this.cardMachine.scale.set(0.6);
    this.cardMachine.y = this.aceAndJack.y;

    // Apply dynamic snapping for aceAndJack and cardMachine positioning
    this.applyDynamicSnapping();

    this.partnerLogo.scale.set(0.5);
    this.partnerLogo.x = appWidth / 2 - this.partnerLogo.width / 2;
    this.partnerLogo.y = this.coinScroller.y + this.coinScroller.height + 20;
  }

  public resize(width: number, height: number) {
    super.resize(width, height);
    this.setupLayout();
  }
}

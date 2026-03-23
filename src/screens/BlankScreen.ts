import { Container } from "pixi.js";
import { TiledBackground } from "../ui/TiledBackground";
// import { TestJoinGameUI } from "../ui/test/TestJoinGame";

export class BlankScreen extends Container {
  public static assetBundles = ["common", "game", "player-profile"];
  private background: TiledBackground;

  // private testJoinGameUI: TestJoinGameUI;

  constructor() {
    super();
    this.background = new TiledBackground();
    this.addChild(this.background);

    // this.testJoinGameUI = new TestJoinGameUI();
    // this.addChild(this.testJoinGameUI);
  }

  public resize(width: number, height: number) {
    this.background.resize(width, height);
  }

  public async show() {
    this.background.show();
  }

  public async hide() {
    // Implement hide animation logic here
  }
}

import { Container, Sprite } from "pixi.js";
import { app } from "../app";
import gsap from "gsap";
import { VIEW_MODE } from "../constants";
import { CURRENT_PARTNER, PARTNER_ID } from "../network/constants";

export class TiledBackground extends Container {
  private background: Sprite;
  private overlay: Sprite;
  public gameTable: Sprite;
  private noHouseEdgeText: Sprite;
  private playAgainstHouse: Sprite;
  private frame: Sprite | null = null;
  private showTexts: boolean;
  private viewMode = import.meta.env.VITE_VIEW_MODE;
  private MIN_TABLE_WIDTH = 430;

  constructor(showTexts: boolean = false) {
    super();
    this.showTexts = showTexts;
    // Create and setup background sprite
    this.background = Sprite.from("background");
    this.background.width = app.screen.width;
    this.background.height = app.screen.height;

    // Create and setup overlay sprite
    this.overlay = Sprite.from("background_overlay");
    this.overlay.width = app.screen.width;
    this.overlay.height = app.screen.height;

    // Create and setup game table sprite
    this.gameTable = Sprite.from("game_table");
    this.gameTable.anchor.set(0.5);

    // Create and setup no house edge text sprite
    this.noHouseEdgeText = Sprite.from("no-house-edge-text");
    this.noHouseEdgeText.scale.set(0.75);
    this.noHouseEdgeText.anchor.set(0.5);
    this.noHouseEdgeText.visible =
      CURRENT_PARTNER !== PARTNER_ID.em && this.showTexts;

    // Create and setup play against house sprite
    this.playAgainstHouse = Sprite.from("play-against-house");
    this.playAgainstHouse.scale.set(0.75);
    this.playAgainstHouse.anchor.set(0.5);
    this.playAgainstHouse.visible = this.showTexts;

    // Add all sprites to the container in correct order
    this.addChild(this.background, this.overlay);
    if (this.viewMode == VIEW_MODE.WEB_VIEW) {
      this.frame = Sprite.from("frame-web");
      this.frame.x = 10 / 2;
      this.frame.y = 10 / 2;
      this.frame.width = app.screen.width - 10;
      this.frame.height = app.screen.height - 10;
      this.addChild(this.frame);
    }

    this.addChild(this.gameTable);
    this.gameTable.addChild(this.noHouseEdgeText, this.playAgainstHouse);

    // Initial setup
    this.initialize();
  }

  private initialize() {
    this.positionTableTexts();
  }

  private positionTableTexts() {
    // Position no house edge text on the bottom left of the game table
    this.noHouseEdgeText.x = 0;
    this.noHouseEdgeText.y = this.gameTable.height * 0.62;
    this.noHouseEdgeText.angle = -2;

    // Position play against house text on the bottom right of the game table
    this.playAgainstHouse.x = 6;
    this.playAgainstHouse.y = this.gameTable.height * 0.65;
  }

  private getMinimumScale(): number {
    return this.MIN_TABLE_WIDTH / this.gameTable.texture.width;
  }

  private setGameTableScale(scale: number) {
    const minScale = this.getMinimumScale();
    const finalScale = Math.max(scale, minScale);
    this.gameTable.scale.set(finalScale);
    this.positionTableTexts(); // Reposition texts after scale change
  }

  public setGameTableFinalState({
    x,
    y,
    scale,
  }: {
    x: number;
    y: number;
    scale: number;
  }) {
    // Set final positions immediately without animation
    this.gameTable.x = x;
    this.gameTable.y = y;
    this.gameTable.scale.set(scale);
  }

  public resize(width: number, height: number) {
    this.background.width = width;
    this.background.height = height;

    this.overlay.width = width;
    this.overlay.height = height;

    this.gameTable.x = width / 2;
    this.gameTable.y = height / 4;

    if (this.frame) {
      this.frame.width = app.screen.width - 10;
      this.frame.height = app.screen.height - 10;
      this.frame.visible = app.screen.width > this.gameTable.width + 150;
    }

    this.setGameTableScale(0.65);
  }

  public async show() {
    gsap.killTweensOf(this.overlay);
    this.visible = true;
    this.overlay.alpha = 1;
  }

  public async hide(animated = true) {
    gsap.killTweensOf(this.overlay);
    if (animated) {
      gsap.to(this.overlay, {
        alpha: 0,
        duration: 0.3,
        ease: "back.in",
      });
    } else {
      this.overlay.alpha = 0;
    }
    this.visible = false;
  }

  public setMatchmakingPosition() {
    // Set initial position and scale for matchmaking screen
    this.gameTable.x = app.screen.width / 2;
    this.gameTable.y = app.screen.height / 4;
    this.setGameTableScale(0.65);
  }

  private calculateDynamicScale(): number {
    // S = -0.000128 * W + 0.799552
    const scale =
      this.viewMode == VIEW_MODE.WEB_VIEW
        ? 1
        : 0.00060241 * app.screen.width + 0.404;
    return Math.max(scale, 0.65);
  }

  public setGameplayPosition() {
    // Set position and scale for gameplay screen
    this.gameTable.x = app.screen.width / 2;
    this.gameTable.y = app.screen.height / 2;
    //handle scale more gracefully and dynamically
    // this.setGameTableScale(0.68)
    if (this.viewMode !== VIEW_MODE.WEB_VIEW) {
      this.setGameTableScale(this.calculateDynamicScale());
    }
  }

  public getGameTable(): Sprite {
    return this.gameTable;
  }

  public animateGameTable(to: { x: number; y: number; scale: number }) {
    gsap.killTweensOf(this.gameTable);
    gsap.killTweensOf(this.gameTable.scale);

    const minScale = this.getMinimumScale();

    const targetScale = Math.max(to.scale, minScale);

    // Scale animation with power1.inOut easing
    gsap.to(this.gameTable.scale, {
      x: targetScale,
      y: targetScale,
      duration: 1,
      ease: "power2.out",
      onUpdate: () => this.positionTableTexts(), // Reposition texts during animation
    });

    // Position animation with linear easing
    gsap.to(this.gameTable, {
      x: to.x,
      y: to.y,
      duration: 1,
      ease: "power2.out",
    });
  }

  public getTableTexts() {
    return {
      noHouseEdgeText: this.noHouseEdgeText,
      playAgainstHouse: this.playAgainstHouse,
    };
  }

  public setTextsVisibility(visible: boolean) {
    this.showTexts = visible;
    this.noHouseEdgeText.visible = visible;
    this.playAgainstHouse.visible = visible;
  }

  public animateToPlayPosition() {
    this.animateGameTable({
      x: app.screen.width / 2,
      y: app.screen.height / 2,
      scale:
        this.viewMode == VIEW_MODE.WEB_VIEW
          ? 0.65
          : this.calculateDynamicScale(),
      // scale: 0.68
    });
  }
}

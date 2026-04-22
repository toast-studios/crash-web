import {
  Container,
  Sprite,
  Graphics,
  Rectangle,
  FederatedPointerEvent,
  FederatedWheelEvent,
} from "pixi.js";
import { RankInfoItem, RankInfo } from "./RankInfoItem.js";

export class RankGroup extends Container {
  public rankItems: RankInfoItem[] = [];
  private itemWidth: number;
  private itemSpacing: number;
  private gradientOverlay: Sprite;
  private contentContainer: Container;
  private maskGraphics: Graphics;
  private fixedHeight: number;
  private isDragging: boolean = false;
  private lastPointerY: number = 0;

  constructor(
    rankInfos: RankInfo[] = [],
    width: number = 300,
    spacing: number = 8,
    height: number = 70,
  ) {
    super();
    this.itemWidth = width;
    this.itemSpacing = spacing;
    this.fixedHeight = height;

    // Create content container for scrollable items
    this.contentContainer = new Container();
    this.addChild(this.contentContainer);

    // Create mask for scrollable area
    this.maskGraphics = new Graphics();
    this.maskGraphics.rect(0, 0, width, height);
    this.maskGraphics.fill({ color: 0xffffff });
    this.addChild(this.maskGraphics);
    this.contentContainer.mask = this.maskGraphics;

    // Setup interactive scrolling
    this.eventMode = "static";
    this.hitArea = new Rectangle(0, 0, width, height);
    this.on("pointerdown", this.onPointerDown.bind(this));
    this.on("pointermove", this.onPointerMove.bind(this));
    this.on("pointerup", this.onPointerUp.bind(this));
    this.on("pointerupoutside", this.onPointerUp.bind(this));
    this.on("wheel", this.onWheel.bind(this));

    if (rankInfos.length > 0) {
      this.setRankInfos(rankInfos);
    }

    // Gradient overlay should be at the bottom, outside of scroll
    this.gradientOverlay = Sprite.from("rank-group-gradient-overlay");
    this.gradientOverlay.width /= 2;
    this.gradientOverlay.height /= 2;
    this.gradientOverlay.y = height - this.gradientOverlay.height;
    this.gradientOverlay.x = width / 2 - this.gradientOverlay.width / 2;
    this.addChild(this.gradientOverlay);
  }

  private onPointerDown(event: FederatedPointerEvent) {
    this.isDragging = true;
    this.lastPointerY = event.global.y;
  }

  private onPointerMove(event: FederatedPointerEvent) {
    if (!this.isDragging) return;

    const deltaY = event.global.y - this.lastPointerY;
    this.lastPointerY = event.global.y;
    this.scrollContent(deltaY);
  }

  private onPointerUp() {
    this.isDragging = false;
  }

  private onWheel(event: FederatedWheelEvent) {
    this.scrollContent(-event.deltaY * 0.5);
  }

  private scrollContent(deltaY: number) {
    const contentHeight = this.getContentHeight();
    const maxScroll = Math.max(0, contentHeight - this.fixedHeight);

    this.contentContainer.y = Math.max(
      -maxScroll,
      Math.min(0, this.contentContainer.y + deltaY),
    );
  }

  private getContentHeight(): number {
    if (this.rankItems.length === 0) return 0;
    const lastItem = this.rankItems[this.rankItems.length - 1];
    return lastItem.y + lastItem.height;
  }

  public setRankInfos(rankInfos: RankInfo[]) {
    this.clearRankItems();

    rankInfos.forEach((rankInfo, index) => {
      const rankItem = new RankInfoItem(rankInfo, this.itemWidth);
      rankItem.y = index * (rankItem.height + this.itemSpacing);
      this.rankItems.push(rankItem);
      this.contentContainer.addChild(rankItem);
    });
  }

  public updateRankInfo(index: number, rankInfo: RankInfo) {
    if (index >= 0 && index < this.rankItems.length) {
      this.rankItems[index].updateRankInfo(rankInfo);
    }
  }

  public clearRankItems() {
    this.rankItems.forEach((item) => {
      item.destroy();
    });
    this.rankItems = [];
    this.contentContainer.removeChildren();
  }

  public addRankInfo(rankInfo: RankInfo) {
    const rankItem = new RankInfoItem(rankInfo, this.itemWidth);
    rankItem.y = this.rankItems.length * (rankItem.height + this.itemSpacing);
    this.rankItems.push(rankItem);
    this.contentContainer.addChild(rankItem);
  }
}

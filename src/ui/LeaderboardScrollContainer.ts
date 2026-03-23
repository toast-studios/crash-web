import {
  Container,
  Sprite,
  Graphics,
  Rectangle,
  FederatedPointerEvent,
  FederatedWheelEvent,
} from "pixi.js";

export class LeaderboardScrollContainer extends Container {
  public contentContainer: Container;
  private maskGraphics: Graphics;
  private gradientOverlay: Sprite;
  private scrollHeight: number;
  private isDragging: boolean = false;
  private lastPointerY: number = 0;
  private minHeightOfPlayerCard: number;
  private scrollbarTrack: Graphics;
  private scrollbarThumb: Graphics;
  private isDraggingThumb: boolean = false;
  private containerWidth: number;
  private bottomPadding: number = 50;

  constructor({
    width,
    scrollHeight,
    minHeightOfPlayerCard,
  }: {
    width: number;
    scrollHeight: number;
    minHeightOfPlayerCard: number;
  }) {
    super();

    this.scrollHeight = scrollHeight;
    this.minHeightOfPlayerCard = minHeightOfPlayerCard;
    this.containerWidth = width;

    this.contentContainer = new Container();
    this.addChild(this.contentContainer);

    this.maskGraphics = new Graphics();
    this.addChild(this.maskGraphics);
    this.contentContainer.mask = this.maskGraphics;

    this.eventMode = "static";
    this.on("pointerdown", this.onPointerDown.bind(this));
    this.on("pointermove", this.onPointerMove.bind(this));
    this.on("pointerup", this.onPointerUp.bind(this));
    this.on("pointerupoutside", this.onPointerUp.bind(this));
    this.on("wheel", this.onWheel.bind(this));

    this.gradientOverlay = Sprite.from("rank-group-gradient-overlay");
    this.gradientOverlay.height = this.minHeightOfPlayerCard;
    this.addChild(this.gradientOverlay);

    // Create scrollbar
    this.scrollbarTrack = new Graphics();
    this.addChild(this.scrollbarTrack);

    this.scrollbarThumb = new Graphics();
    this.scrollbarThumb.eventMode = "static";
    this.scrollbarThumb.cursor = "pointer";
    this.scrollbarThumb.on("pointerdown", this.onThumbPointerDown.bind(this));
    this.addChild(this.scrollbarThumb);

    this.updateMask(width);
  }

  private onPointerDown(event: FederatedPointerEvent) {
    if (this.isDraggingThumb) return;
    this.isDragging = true;
    this.lastPointerY = event.global.y;
  }

  private onPointerMove(event: FederatedPointerEvent) {
    if (this.isDragging) {
      const deltaY = event.global.y - this.lastPointerY;
      this.lastPointerY = event.global.y;
      this.scrollContent(deltaY);
      return;
    }

    if (this.isDraggingThumb) {
      const deltaY = event.global.y - this.lastPointerY;
      this.lastPointerY = event.global.y;
      this.scrollByThumb(deltaY);
    }
  }

  private onPointerUp() {
    this.isDragging = false;
    this.isDraggingThumb = false;
  }

  private onThumbPointerDown(event: FederatedPointerEvent) {
    event.stopPropagation();
    this.isDraggingThumb = true;
    this.lastPointerY = event.global.y;
  }

  private onWheel(event: FederatedWheelEvent) {
    this.scrollContent(-event.deltaY * 0.5);
  }

  private scrollContent(deltaY: number) {
    const contentHeight = this.getContentHeight();
    const maxScroll = Math.max(0, contentHeight - this.scrollHeight);

    this.contentContainer.y = Math.max(
      -maxScroll,
      Math.min(0, this.contentContainer.y + deltaY),
    );

    this.updateScrollbarPosition();
    this.updateGradientVisibility();
  }

  private scrollByThumb(deltaY: number) {
    const contentHeight = this.getContentHeight();
    const maxScroll = Math.max(0, contentHeight - this.scrollHeight);

    if (maxScroll === 0) return;

    // Calculate the ratio of scrollbar to content
    const scrollbarRange = this.scrollHeight - this.minHeightOfPlayerCard;
    const scrollRatio = maxScroll / scrollbarRange;

    // Apply the scroll with ratio
    const scrollDelta = deltaY * scrollRatio;
    this.contentContainer.y = Math.max(
      -maxScroll,
      Math.min(0, this.contentContainer.y - scrollDelta),
    );

    this.updateScrollbarPosition();
    this.updateGradientVisibility();
  }

  private updateScrollbarPosition() {
    const contentHeight = this.getContentHeight();
    const maxScroll = Math.max(0, contentHeight - this.scrollHeight);

    if (maxScroll === 0) {
      this.scrollbarThumb.visible = false;
      return;
    }

    this.scrollbarThumb.visible = true;

    // Calculate thumb position
    const scrollRatio = Math.abs(this.contentContainer.y) / maxScroll;
    const scrollbarRange = this.scrollHeight - this.minHeightOfPlayerCard;
    const thumbY = scrollRatio * scrollbarRange;

    this.scrollbarThumb.y = thumbY;
  }

  private getContentHeight(): number {
    if (this.contentContainer.children.length === 0) return 0;
    const lastChild =
      this.contentContainer.children[this.contentContainer.children.length - 1];
    return lastChild.y + lastChild.height + this.bottomPadding;
  }

  private updateGradientVisibility() {
    const contentHeight = this.getContentHeight();
    const maxScroll = Math.max(0, contentHeight - this.scrollHeight);
    const currentScroll = Math.abs(this.contentContainer.y);

    // Hide gradient when scrolled to bottom (within 10px threshold)
    if (maxScroll > 0 && currentScroll >= maxScroll - 10) {
      this.gradientOverlay.visible = false;
    } else {
      this.gradientOverlay.visible = true;
    }
  }

  public updateMask(width: number) {
    this.containerWidth = width;

    this.maskGraphics.clear();
    this.maskGraphics.rect(0, -5, width, this.scrollHeight + 5);
    this.maskGraphics.fill({ color: 0xffffff });

    this.hitArea = new Rectangle(0, 0, width, this.scrollHeight);

    this.gradientOverlay.width = width;
    this.gradientOverlay.x = width / 2 - this.gradientOverlay.width / 2;
    this.gradientOverlay.y =
      this.scrollHeight - this.gradientOverlay.height + 5;

    // Update scrollbar
    this.updateScrollbar();
  }

  private updateScrollbar() {
    const scrollbarWidth = 6;
    const scrollbarPadding = 2;

    // Draw scrollbar track
    this.scrollbarTrack.clear();
    this.scrollbarTrack.roundRect(
      this.containerWidth - scrollbarWidth - scrollbarPadding,
      0,
      scrollbarWidth,
      this.scrollHeight,
      scrollbarWidth / 2,
    );
    this.scrollbarTrack.fill({ color: 0x000000, alpha: 1 });

    // Draw scrollbar thumb
    this.scrollbarThumb.clear();
    this.scrollbarThumb.roundRect(
      this.containerWidth - scrollbarWidth - scrollbarPadding,
      0,
      scrollbarWidth,
      this.minHeightOfPlayerCard,
      scrollbarWidth / 2,
    );
    this.scrollbarThumb.fill({ color: 0x616366, alpha: 1 });

    this.updateScrollbarPosition();
    this.updateGradientVisibility();
  }

  public getScrollHeight(): number {
    return this.scrollHeight;
  }

  public refreshScrollbar() {
    this.updateScrollbarPosition();
    this.updateGradientVisibility();
  }
}

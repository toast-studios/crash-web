import { Container, NineSliceSprite, Sprite, Text, Texture } from "pixi.js";
import { TOURNAMENT_STYLES } from "./TournamentStyles";
import gsap from "gsap";

export class TimerBox extends Container {
  private labelText: Text;
  private valueText: Text;
  private timerInterval: NodeJS.Timeout | null = null;
  private remainingTime: number = 0;
  private finalY: number = 0;

  constructor() {
    super();

    // Start with alpha 0 for smooth fade-in
    this.alpha = 0;

    const container = new Container();

    this.labelText = new Text({
      text: "00",
      style: TOURNAMENT_STYLES.HEADER.PRICE_LABEL,
    });
    this.labelText.x = -this.labelText.width / 2;
    this.labelText.y = -this.labelText.height / 2;
    container.addChild(this.labelText);

    this.valueText = new Text({
      text: "00",
      style: TOURNAMENT_STYLES.HEADER.PRICE_VALUE,
    });
    this.valueText.x = -this.valueText.width / 2;
    this.valueText.y = -this.valueText.height / 2;
    container.addChild(this.valueText);

    const overlay = Sprite.from("price_box_left_overlay");
    overlay.width = overlay.texture.width * 0.5;
    overlay.height = overlay.texture.height * 0.5;
    overlay.x = 0;
    overlay.y = -overlay.height / 2;
    container.addChildAt(overlay, 0);

    const leftSideWidth = overlay.width;
    const textPadding = 10;
    const borderGap = 30;
    const rightSideWidth = this.valueText.width + textPadding + borderGap;
    const rightSideTextWidthPlusPadding = leftSideWidth + rightSideWidth;
    const totalWidth =
      rightSideTextWidthPlusPadding > 180 ? rightSideTextWidthPlusPadding : 180;
    const totalHeight = overlay.height;

    const background = new NineSliceSprite({
      texture: Texture.from("price_box_bg"),
      leftWidth: 60,
      topHeight: 60,
      rightWidth: 60,
      bottomHeight: 60,
    });
    background.scale.x = 0.5;
    background.scale.y = 0.5;
    background.width = totalWidth * 2;
    background.height = totalHeight * 2;
    background.x = -totalWidth / 2;
    background.y = -totalHeight / 2;
    container.addChildAt(background, 0);

    overlay.x = background.x;
    overlay.y = -overlay.height / 2;

    this.labelText.x =
      background.x + leftSideWidth / 2 - this.labelText.width / 2;
    this.labelText.y = -this.labelText.height / 2 - 2;

    this.valueText.x =
      background.x +
      leftSideWidth +
      rightSideWidth / 2 -
      this.valueText.width / 2;
    this.valueText.y = -this.valueText.height / 2 - 2;

    this.addChild(container);
  }

  public startTimer(remainingTime: number) {
    this.stopTimer();
    this.remainingTime = remainingTime;
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      this.remainingTime -= 1;
      if (this.remainingTime <= 0) {
        this.remainingTime = 0;
        this.stopTimer();
      }
      this.updateTimerDisplay();
    }, 1000);
  }

  public stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateTimerDisplay() {
    const seconds = Math.max(0, Math.floor(this.remainingTime));
    const formattedTime = seconds.toString().padStart(2, "0");
    this.valueText.text = formattedTime;
  }

  public show(animate: boolean = true) {
    this.visible = true;

    if (animate) {
      // Store final Y position and start from above
      this.finalY = this.y;
      const startY = this.y - 100; // Start 100 pixels above
      this.y = startY;

      // Animate both position and alpha
      gsap.to(this, {
        y: this.finalY,
        alpha: 1,
        duration: 0.6,
        ease: "back.out(1.2)",
      });
    } else {
      // Show immediately without animation
      gsap.to(this, {
        alpha: 1,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  }

  public hide(immediate: boolean = false) {
    if (immediate) {
      this.visible = false;
      this.alpha = 0;
    } else {
      // Animate both position and alpha when hiding
      const targetY = this.y - 100; // Move 100 pixels up
      gsap.to(this, {
        y: targetY,
        alpha: 0,
        duration: 0.4,
        ease: "power2.in",
        onComplete: () => {
          this.visible = false;
          // Reset position for next show
          this.y = this.finalY;
        },
      });
    }
  }

  public destroy() {
    this.stopTimer();
    gsap.killTweensOf(this);
    super.destroy();
  }
}

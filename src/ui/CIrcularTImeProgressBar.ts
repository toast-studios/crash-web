import { Container, Graphics } from "pixi.js";
import gsap from "gsap";

export class CircularTimerProgressBar extends Container {
  private circle: Graphics;
  private progress: number;
  private radius: number;
  private strokeWidth: number;
  private isExtraTurnTime: boolean;
  private tween?: gsap.core.Tween;

  constructor({
    radius,
    strokeWidth = 4,
    remainingTime,
    totalTime,
    isExtraTurnTime,
  }: {
    radius: number;
    strokeWidth?: number;
    remainingTime: number;
    totalTime: number;
    isExtraTurnTime: boolean;
  }) {
    super();

    this.radius = radius;
    this.strokeWidth = strokeWidth;
    this.isExtraTurnTime = isExtraTurnTime;
    this.progress = remainingTime / totalTime;

    // Create and position the circle graphics
    this.circle = new Graphics();
    this.addChild(this.circle);

    // Initial draw
    this.drawTimer();

    // Animate the timer
    this.tween = gsap.to(this, {
      progress: 0,
      duration: remainingTime,
      ease: "linear",
      onUpdate: () => this.drawTimer(),
      onComplete: () => {
        this.cleanup();
      },
    });
  }

  private drawTimer() {
    this.circle.clear();

    // Draw background circle
    this.circle.lineStyle(this.strokeWidth + 2, 0x333333, 0.3);
    this.circle.arc(0, 0, this.radius, 0, Math.PI * 2);

    // Draw progress arc
    const color = this.isExtraTurnTime ? 0xff4c4c : 0x00ff00;
    this.circle.lineStyle(this.strokeWidth, color, 1);
    this.circle.arc(
      0,
      0,
      this.radius,
      -Math.PI / 2, // Start from top
      -Math.PI / 2 + Math.PI * 2 * this.progress, // End based on progress
    );
  }

  private cleanup() {
    if (this.tween) {
      this.tween.kill();
    }
    this.circle.clear();
  }

  public hide() {
    this.cleanup();
    this.visible = false;
  }
}

import { Container, Graphics, Sprite, Text } from "pixi.js";
import { app } from "../app";
import gsap from "gsap";

export class FinalScoreContainer extends Container {
  private background: Graphics;
  private rays: Sprite;
  private finalScoreText: Text;
  private scoreValueText: Text;
  private raysAnimation?: gsap.core.Tween;

  constructor(score: number = 0) {
    super();

    // 1. Background gradient
    this.background = new Graphics();
    this.createGradientBackground();
    this.addChild(this.background);

    // 2. Rays sprite
    this.rays = Sprite.from("rays");
    this.rays.anchor.set(0.5);
    this.addChild(this.rays);

    // Start rays rotation animation
    this.startRaysAnimation();

    // 3. "Final Score" text
    this.finalScoreText = new Text({
      text: "Final Score",
      style: {
        fill: 0xc9c9c9,
        align: "center",
        fontFamily: "Pridi",
        fontSize: 18.358,
        fontStyle: "normal",
        fontWeight: "500",
      },
    });
    this.finalScoreText.anchor.set(0.5);
    this.addChild(this.finalScoreText);

    // 4. Score value with gold gradient
    this.scoreValueText = new Text({
      text: score.toString(),
      style: {
        fontFamily: "Inter",
        fontSize: 60,
        fill: 0xffde83,
        align: "right",
        fontWeight: "900",
      },
    });
    this.scoreValueText.anchor.set(0.5);
    this.addChild(this.scoreValueText);

    this.layout();
  }

  private startRaysAnimation() {
    // Rotate rays continuously
    this.raysAnimation = gsap.to(this.rays, {
      rotation: Math.PI * 2,
      duration: 10,
      repeat: -1,
      ease: "none",
    });
  }

  private createGradientBackground() {
    const width = app.screen.width;
    const height = 300; // Height of the gradient area

    this.background.clear();

    // Create gradient: transparent -> black -> transparent
    // We'll simulate this with multiple rectangles with varying alpha
    const steps = 50;
    // const halfHeight = height / 2;

    for (let i = 0; i < steps; i++) {
      const y = (i / steps) * height;
      let alpha = 0;

      if (i < steps / 2) {
        // First half: fade from transparent to black
        alpha = i / (steps / 2);
      } else {
        // Second half: fade from black to transparent
        alpha = 1 - (i - steps / 2) / (steps / 2);
      }

      this.background.rect(0, y, width, height / steps);
      this.background.fill({ color: 0x000000, alpha: alpha });
    }

    this.background.x = -width / 2;
    this.background.y = -height / 2;
  }

  private layout() {
    const spacing = 20;

    // Position rays at center
    this.rays.x = 0;
    this.rays.y = 0;

    // Position "Final Score" text above the score value
    this.finalScoreText.x = 0;
    this.finalScoreText.y = -spacing - this.scoreValueText.height / 2;

    // Position score value at center
    this.scoreValueText.x = 0;
    this.scoreValueText.y =
      this.finalScoreText.y + this.finalScoreText.height + spacing;
  }

  public updateScore(score: number) {
    this.scoreValueText.text = score.toString();
    this.layout();
  }

  public resize(width: number, height: number) {
    // Position at center of screen
    this.x = width / 2;
    this.y = height / 2 + 200;

    // Recreate background gradient with new width
    this.createGradientBackground();
  }

  public destroy(options?: boolean) {
    // Stop rays animation
    if (this.raysAnimation) {
      this.raysAnimation.kill();
      this.raysAnimation = undefined;
    }
    super.destroy(options);
  }
}

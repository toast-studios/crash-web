import { Container, Graphics } from "pixi.js";

// Function to create a shadow effect
export function createShadowEffect(
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  blurRadius: number,
  offsetX: number,
  offsetY: number,
  alpha: number,
) {
  const shadowContainer = new Container();

  // Create multiple semi-transparent rectangles to simulate blur
  for (let i = 0; i < blurRadius; i++) {
    const blurRect = new Graphics();
    blurRect.roundRect(
      x + offsetX - i,
      y + offsetY - i,
      width + i * 2,
      height + i * 2,
      10,
    );
    blurRect.fill({
      color: color,
      alpha: (alpha / blurRadius) * (1 - i / blurRadius),
    });
    shadowContainer.addChild(blurRect);
  }

  return shadowContainer;
}

import { Application, Text } from "pixi.js";

export const showFPS = (app: Application) => {
  // Create FPS counter
  const fpsText = new Text({
    text: "FPS: 0",
    style: {
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xffffff,
    },
  });
  fpsText.x = 10;
  fpsText.y = 10;
  fpsText.zIndex = 1000; // Ensure it's on top of other elements
  app.stage.addChild(fpsText);

  // Update FPS counter
  let frameCount = 0;
  let lastTime = Date.now();
  app.ticker.add(() => {
    frameCount++;
    const currentTime = Date.now();
    if (currentTime - lastTime >= 1000) {
      const fps = Math.round(frameCount / ((currentTime - lastTime) / 1000));
      fpsText.text = `FPS: ${fps}`;
      frameCount = 0;
      lastTime = currentTime;
    }
  });
};

// register the plugin
import { PixiPlugin } from "gsap/all";
import { CustomEase } from "gsap/CustomEase";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import gsap from "gsap";

gsap.registerPlugin(PixiPlugin);
gsap.registerPlugin(CustomEase);
gsap.registerPlugin(MotionPathPlugin);

import * as PIXI from "pixi.js";
import { app } from "../app";
import { Logger } from "../utils/logger";
PixiPlugin.registerPIXI(PIXI);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__PIXI_STAGE__ = app.stage;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__PIXI_RENDERER__ = app.renderer;

// In the init function, after creating the app
if ("prepare" in app.renderer) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (app.renderer as any).prepare.upload(app.stage, () => {
    Logger.info("Assets uploaded to GPU");
  });
} else {
  Logger.warn("Prepare plugin not available in this renderer");
}

// Enable culling
app.stage.cullable = true;

// app.ticker.stop();

// gsap.ticker.add((delta) => {
//   app.ticker.update(delta);
// });

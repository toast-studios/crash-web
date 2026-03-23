import { Application } from "pixi.js";
import { resizeWindowResolution, visibilityChange } from "./utils/window";
import { Logger } from "./utils/logger";
import { loadBundles, initFonts, initAssets } from "./utils/assets";
import { initLottie } from "./animations/util";
import { bgm } from "./utils/audio";
import { CURRENT_PARTNER, PARTNER_ID } from "./network/constants";

export const MAX_WIDTH = 420;
export const MAX_HEIGHT = 932;
export const app = new Application();
app.stage.sortableChildren = true;

// Helper function to dispatch loading progress
const dispatchProgress = (
  step: string,
  percentage: number,
  message: string,
) => {
  window.dispatchEvent(
    new CustomEvent("loadingProgress", {
      detail: { step, percentage, message },
    }),
  );
};

export async function initApp() {
  Logger.info("window.devicePixelRatio", window.devicePixelRatio);

  try {
    // PIXI app initialization
    dispatchProgress("appInit", 30, "Setting up graphics engine...");

    await app.init({
      resolution: Math.max(window.devicePixelRatio, 1),
      backgroundColor: 0x000000,
      autoDensity: false,
      renderableGCActive: false,
      autoStart: true,
    });

    const gameContainer = document.getElementById("game-container");
    if (gameContainer) {
      document.body.appendChild(app.canvas);
    } else {
      Logger.error(
        "Game container not found",
        new Error("Game container not found"),
      );
    }

    window.addEventListener("resize", () => resizeWindowResolution(app));
    resizeWindowResolution(app);

    // Load basic assets
    dispatchProgress("bundles", 40, "Loading basic assets...");

    // Initialize fonts
    dispatchProgress("bundles", 52, "Loading fonts...");
    await initFonts();

    // Initialize lottie animations
    dispatchProgress("bundles", 55, "Initializing animations...");
    initLottie();

    await initAssets();

    // Load game bundles
    const bundleIds = ["common", "game", "player-profile"];
    for (let i = 0; i < bundleIds.length; i++) {
      const bundleId = bundleIds[i];
      const bundleProgress = 58 + (i / bundleIds.length) * 25; // 58% to 83%

      dispatchProgress("bundles", bundleProgress, `Loading assets...`);

      try {
        await loadBundles(bundleId);
        Logger.info(`Bundle ${bundleId} loaded successfully`);
      } catch (err) {
        Logger.error(`Failed to load bundle ${bundleId}:`, err);
      }
    }

    dispatchProgress("bundles", 83, "All assets loaded successfully!");
    await import("./scripts/app.init"); //todo: remove in prod build

    dispatchProgress("scripts", 95, "Finalizing game setup...");

    // Start background music
    try {
      const isCarnival = CURRENT_PARTNER === PARTNER_ID.bt;
      if (isCarnival) {
        bgm.play("common/carnival_bgm.wav");
      } else {
        bgm.play("common/bgm1_low.wav");
      }
    } catch (error) {
      Logger.error("Failed to start background music:", error);
    }

    // Setup visibility change listener
    document.addEventListener("visibilitychange", visibilityChange);

    // Game assets loaded - ready to show first screen
    if (import.meta.env.VITE_GAME_MODE === "speed") {
      dispatchProgress("scripts", 90, "Authenticating with Speed...");
    } else {
      dispatchProgress("scripts", 98, "Game ready!");
    }
    // Note: GameLoaded event will be sent after first screen is visible
    // to prevent black screen issues

    Logger.info("Game initialization complete");
  } catch (error) {
    Logger.error("Error during app initialization:", error);
    throw error;
  }
}

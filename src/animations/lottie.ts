import { Container } from "pixi.js";
import { calculatePixiChildPosition } from "../utils/htmlDom";
import { lottieAnimations } from "./util";

export const playDrawAnimation = () => {
  lottieAnimations.draw?.play();
  setTimeout(() => {
    lottieAnimations.draw?.stop();
  }, 5000);
};

export const playYouWinAnimation = () => {
  lottieAnimations.youWin?.play();
  setTimeout(() => {
    lottieAnimations.youWin?.stop();
  }, 5000);
};

export const playYouLoseAnimation = () => {
  lottieAnimations.youLose?.play();
  setTimeout(() => {
    lottieAnimations.youLose?.stop();
  }, 5000);
};

export const playBustAnimation = (
  pixiChild: Container,
  top: number = 0,
  left: number = 0,
  target: "player" | "opponent" = "player",
) => {
  const { x, y } = calculatePixiChildPosition(pixiChild);
  const containerId =
    target === "opponent"
      ? "bust-lottie-container-opponent"
      : "bust-lottie-container";
  const bustCanvas = document.getElementById(
    containerId,
  ) as HTMLCanvasElement | null;
  if (!bustCanvas) {
    return;
  }

  bustCanvas.style.zIndex = "1000";
  bustCanvas.style.top = `${y + top}px`;
  bustCanvas.style.left = `${x + left}px`;

  if (target === "opponent") {
    lottieAnimations.bustOpponent?.play();
  } else {
    lottieAnimations.bust?.play();
  }
  setTimeout(() => {
    if (target === "opponent") {
      lottieAnimations.bustOpponent?.stop();
    } else {
      lottieAnimations.bust?.stop();
    }
    bustCanvas.style.zIndex = "-1";
  }, 1500);
};

export const playLogoLottieAnimation = () => {
  lottieAnimations.logo?.play();
};

export const hideLogoLottieAnimation = () => {
  lottieAnimations.logo?.stop();
};

export const stopYouWinAnimation = () => {
  lottieAnimations.youWin?.stop();
};

export const stopYouLoseAnimation = () => {
  lottieAnimations.youLose?.stop();
};

export const stopYouDrawAnimation = () => {
  lottieAnimations.draw?.stop();
};

export const stopYouBustAnimation = () => {
  lottieAnimations.bust?.stop();
};

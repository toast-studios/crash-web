import { calculatePixiChildActualDimensions } from "../utils/htmlDom";
import { Container } from "pixi.js";
import lottie, { AnimationItem } from "lottie-web";

interface LottieAnimations {
  draw: AnimationItem | null;
  youWin: AnimationItem | null;
  youLose: AnimationItem | null;
  bust: AnimationItem | null;
  bustOpponent: AnimationItem | null;
  logo: AnimationItem | null;
}

export const lottieAnimations: LottieAnimations = {
  draw: null,
  youWin: null,
  youLose: null,
  bust: null,
  bustOpponent: null,
  logo: null,
};

export const initLottie = () => {
  initDrawAnimation();
  initYouWinAnimation();
  initYouLoseAnimation();
  initLogoAnimation();
};

export const initBustAnimation = (pixiChild: Container) => {
  const bustCanvas = document.getElementById(
    "bust-lottie-container",
  ) as HTMLCanvasElement;
  const bustCanvasOpponent = document.getElementById(
    "bust-lottie-container-opponent",
  ) as HTMLCanvasElement | null;

  if (
    lottieAnimations.bust &&
    (bustCanvasOpponent ? lottieAnimations.bustOpponent : true)
  ) {
    return;
  }
  const { width, height } = calculatePixiChildActualDimensions(pixiChild);
  bustCanvas.style.width = `${width}px`;
  bustCanvas.style.height = `${height}px`;
  lottieAnimations.bust = lottie.loadAnimation({
    container: bustCanvas,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: `${window.location.origin}/lotties/Bust.json`,
  });
  lottieAnimations.bust?.stop();

  // Initialize opponent bust lottie if container exists
  if (bustCanvasOpponent) {
    bustCanvasOpponent.style.width = `${width}px`;
    bustCanvasOpponent.style.height = `${height}px`;
    lottieAnimations.bustOpponent = lottie.loadAnimation({
      container: bustCanvasOpponent,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: `${window.location.origin}/lotties/Bust.json`,
    });
    lottieAnimations.bustOpponent?.stop();
  }
};

const initYouWinAnimation = () => {
  lottieAnimations.youWin = lottie.loadAnimation({
    name: "youWin",
    container: document.getElementById(
      "youWin-lottie-container",
    ) as HTMLCanvasElement,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: `${window.location.origin}/lotties/YouWin.json`,
  });
  lottieAnimations.youWin?.stop();
};

const initYouLoseAnimation = () => {
  lottieAnimations.youLose = lottie.loadAnimation({
    name: "youLose",
    container: document.getElementById(
      "youLose-lottie-container",
    ) as HTMLCanvasElement,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: `${window.location.origin}/lotties/YouLose.json`,
  });
};

const initDrawAnimation = () => {
  lottieAnimations.draw = lottie.loadAnimation({
    name: "draw",
    container: document.getElementById(
      "draw-lottie-container",
    ) as HTMLCanvasElement,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: `${window.location.origin}/lotties/Draw.json`,
  });
  lottieAnimations.draw?.stop();
};

export const initLogoAnimation = () => {
  lottieAnimations.logo = lottie.loadAnimation({
    name: "partner-logo",
    container: document.getElementById(
      "partner-logo-lottie-container",
    ) as HTMLElement, // the dom element that will contain the animation
    renderer: "svg",
    loop: true,
    autoplay: false,
    path: `${window.location.origin}/lotties/PartnerLogo.json`, // the path to the animation json
  });
  lottieAnimations.logo?.stop();
};

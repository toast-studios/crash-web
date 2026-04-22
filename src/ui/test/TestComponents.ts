// import { app } from "../../main";
// import { app } from "../../app";
// import { InfoPopup } from "../../popups/InfoPopup";
// import { BlankScreen } from "../../screens/BlankScreen";

// import { END_GAME_REASON } from "../../store/storeTypes";

// import { showFPS } from "../FPSCounter";

export const addTestComponents = () => {
  // if (document.documentElement.requestFullscreen) {
  //   try {
  //     document.documentElement.requestFullscreen();
  //   } catch (error) {
  //     Logger.error("requestFullscreen", error);
  //   }
  // }
  // const text = new Text({
  //   text:
  //     "resolution: " +
  //     window.devicePixelRatio +
  //     ", " +
  //     app.screen.width +
  //     ", " +
  //     app.screen.height +
  //     ", " +
  //     window.innerWidth +
  //     ", " +
  //     window.innerHeight,
  //   zIndex: 100,
  // });
  // const line = new Graphics();
  // line.rect(0, 0, 1, app.screen.height);
  // // line.y = app.screen.height / 2;
  // line.x = app.screen.width / 2;
  // line.fill({
  //   color: 0xffffff,
  //   alpha: 0.5,
  // });
  // line.zIndex = 100;
  // app.stage.addChild(line);
  // setTimeout(() => {
  //   const container = new PIXI.Container();
  //   const card = new Card({
  //     cardId: "D10",
  //   });
  //   card.setOverlay();
  //   container.addChild(card);
  //   container.zIndex = 100;
  //   container.x = 200;
  //   container.y = 550;
  //   app.stage.addChild(container);
  // }, 2000);
  // setTimeout(() => {
  //   const resultOverlay = new ResultOverlay({
  //     playerScore: 2,
  //     opponentScore: 1,
  //     playerWon: false,
  //     gameEndType: END_GAME_REASON.DRAW,
  //   });
  //   resultOverlay.zIndex = 100;
  //   resultOverlay.show();
  //   app.stage.addChild(resultOverlay);
  // }, 1000);
  // setTimeout(() => {
  //   playBustAnimation({ top: 100, left: 100 });
  // }, 2000);
  // setTimeout(() => {
  //   const tooltip = new Tooltip("Setup done, match up started", {
  //     x: 100,
  //     y: 100,
  //   });
  //   app.stage.addChild(tooltip);
  // }, 2000);
  // * debug show fps
  // showFPS(app);
  // * test game
  // navigation.showScreen(BlankScreen, {});
  // setTimeout(() => {
  //   navigation.presentPopup(InfoPopup, {
  //     message:
  //       "Sorry, we couldn't find a match for you at this time. Going back to lobby in",
  //     showLoader: false,
  //     showOkButton: true,
  //     showCancelButton: true,
  //     onOkPress: () => {
  //       console.log("onOkPress");
  //       navigation.dismissPopup();
  //     },
  //     onCancelPress: () => {
  //       navigation.dismissPopup();
  //     },
  //   });
  // }, 2000);
  // playYouLoseAnimation();
  // playDrawAnimation();
  // playYouWinAnimation();
};

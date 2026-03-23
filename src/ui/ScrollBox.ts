import { ScrollBox } from "@pixi/ui";
import { app } from "../app";
import { Container } from "pixi.js";

export const initializeScrollBox = (
  cardsColumns: Container[],
  topPadding: number,
): ScrollBox => {
  const elementsMargin = 9;
  const scrollBoxWidth =
    (cardsColumns[0].width + elementsMargin) * cardsColumns.length - 1;

  return new ScrollBox({
    width: scrollBoxWidth,
    height: app.screen.height,
    leftPadding: elementsMargin / 2,
    topPadding: app.screen.height / 2 - cardsColumns[0].height / 2 + topPadding,
    elementsMargin: elementsMargin,
    type: "horizontal",
    items: cardsColumns,
  });
};

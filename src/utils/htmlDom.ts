import { app, MAX_WIDTH } from "../app";
import { Container } from "pixi.js";

export function calculatePixiChildActualDimensions(pixiChild: Container): {
  width: number;
  height: number;
} {
  const canvas = app.renderer.canvas as HTMLCanvasElement;
  const bounds = pixiChild.getBounds();
  const canvasRect = canvas.getBoundingClientRect();

  // Calculate the dimensions relative to the app's dimensions
  let width = (bounds.width / app.renderer.width) * canvasRect.width;
  let height = (bounds.height / app.renderer.height) * canvasRect.height;

  // Adjust for maximum width of 512px
  const maxWidth = MAX_WIDTH;
  const totalDOMWidth = window.innerWidth;
  if (canvasRect.width < totalDOMWidth) {
    const scale = maxWidth / canvasRect.width;
    width *= scale;
    height *= scale;
  }

  return { width, height };
}

export function calculatePixiChildPosition(pixiChild: Container): {
  x: number;
  y: number;
} {
  const canvas = app.renderer.canvas as HTMLCanvasElement;
  const bounds = pixiChild.getBounds();
  const canvasRect = canvas.getBoundingClientRect();

  // Calculate the position relative to the app's width
  let x = (bounds.x / app.renderer.width) * canvasRect.width;
  let y = (bounds.y / app.renderer.height) * canvasRect.height;

  // Add the canvas position to get the absolute position
  x += canvasRect.left;
  y += canvasRect.top;

  // Adjust for maximum width of 430px
  const maxWidth = MAX_WIDTH;
  const totalDOMWidth = window.innerWidth;
  if (canvasRect.width < totalDOMWidth) {
    const scale = maxWidth / canvasRect.width;
    x = (x - canvasRect.left) * scale + canvasRect.left;

    // Calculate the extra space and center the canvas

    const extraSpace = totalDOMWidth - maxWidth;
    const offset = extraSpace / 2;
    x -= offset;
  }

  return { x, y };
}

export function convertPixiCoordinateToDOMPixels(pixiValue: number): number {
  const canvas = app.renderer.canvas as HTMLCanvasElement;
  const canvasRect = canvas.getBoundingClientRect();

  // Convert Pixi coordinate to DOM pixels
  let domPixels = (pixiValue / app.renderer.height) * canvasRect.height;

  // Adjust for maximum width scaling
  const maxWidth = MAX_WIDTH;
  const totalDOMWidth = window.innerWidth;
  if (canvasRect.width < totalDOMWidth) {
    const scale = maxWidth / canvasRect.width;
    domPixels *= scale;
  }

  return domPixels;
}

export function calculatePlayerBustAnimationOffset(
  columnBackgroundHeight: number,
): number {
  // Bust animation is 200px in HTML/CSS
  const bustAnimationHTMLHeight = 160;

  // Convert columnBackground height from Pixi to DOM pixels
  const columnHeightInDOM = convertPixiCoordinateToDOMPixels(
    columnBackgroundHeight,
  );

  // Calculate the offset: columnBackground bottom - bust animation height
  return columnHeightInDOM - bustAnimationHTMLHeight;
}

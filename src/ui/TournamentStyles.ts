import { TextStyleOptions, FillGradient } from "pixi.js";

export const TOURNAMENT_FONT_FAMILY = "Pridi";

export const BASE_TEXT_STYLE: Partial<TextStyleOptions> = {
  fontFamily: TOURNAMENT_FONT_FAMILY,
  // fontWeight: "bold",
  fill: 0xffffff,
};

/**
 * Creates a gradient fill style for "Ready" text based on CSS gradient:
 * linear-gradient(95deg, #DA8207 -0.22%, #DD9318 10.66%, #FFCB3C 26.65%, #FFCB3C 78.95%, #E39C1E 93%, #FBC63A 97.24%)
 */
export const createReadyTextGradient = (): FillGradient => {
  // Convert 95 degrees to radians for calculation
  // CSS 95deg = 5deg past right (90deg), so mostly horizontal with slight vertical component
  // For text gradient, we'll use a horizontal gradient with slight angle
  const angle = 95 * (Math.PI / 180);
  const length = 100; // Approximate text width for gradient span

  // Calculate gradient end point for 95-degree angle
  // CSS: 0deg = up, 90deg = right, 180deg = down
  // 95deg = slightly past right (clockwise from up)
  const x1 = Math.sin(angle) * length;
  const y1 = Math.cos(angle) * length;

  const gradient = new FillGradient(0, 0, x1, y1);

  // Convert CSS hex colors to PIXI format (0xRRGGBB)
  // Convert percentage stops to 0-1 range
  gradient.addColorStop(0, 0xda8207); // -0.22% -> 0 (clamp negative to 0)
  gradient.addColorStop(0.1066, 0xdd9318); // 10.66%
  gradient.addColorStop(0.2665, 0xffcb3c); // 26.65%
  gradient.addColorStop(0.7895, 0xffcb3c); // 78.95%
  gradient.addColorStop(0.93, 0xe39c1e); // 93%
  gradient.addColorStop(0.9724, 0xfbc63a); // 97.24%

  return gradient;
};

export const TOURNAMENT_STYLES = {
  HEADER: {
    TITLE: {
      ...BASE_TEXT_STYLE,
      fontSize: 20,
    },
    PRICE_LABEL: {
      ...BASE_TEXT_STYLE,
      fontSize: 21,
      fill: 0x808080,
      // fontWeight: "600",
    },
    PRICE_VALUE: {
      ...BASE_TEXT_STYLE,
      fontSize: 21,
      // fontWeight: "600",
    },
  },
  LEADERBOARD: {
    TITLE: {
      ...BASE_TEXT_STYLE,
      fontSize: 22,
      fill: 0xc9c9c9,
    },
    PLAYER: {
      RANK: {
        ...BASE_TEXT_STYLE,
        fontSize: 22,
        stroke: {
          color: "#000000",
          width: 2,
        },
      },
      NAME: {
        ...BASE_TEXT_STYLE,
        fontSize: 15,
      },
      SCORE: {
        ...BASE_TEXT_STYLE,
        fontSize: 20,
      },
      READY: {
        ...BASE_TEXT_STYLE,
        fontSize: 10,
        fill: createReadyTextGradient(),
      },
    },
  },
};

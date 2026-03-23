export const FONTS = {
  PRIMARY: "Alumni Sans",
  SECONDARY: "Pridi",
  THIRD: "Inter",
} as const;

export const FONT_WEIGHTS = {
  REGULAR: "400",
  MEDIUM: "500",
  SEMIBOLD: "600",
  BOLD: "700",
} as const;

export const FONT_SIZES = {
  SMALL: 16,
  MEDIUM: 24,
  LARGE: 32,
  XLARGE: 48,
} as const;

export const getDefaultTextStyle = (
  options: Partial<{
    fontSize: number;
    fill: number | string;
    align: string;
    fontWeight: number;
  }> = {},
) => ({
  fontFamily: FONTS.PRIMARY,
  fontSize: options.fontSize || FONT_SIZES.MEDIUM,
  fill: options.fill || 0xffffff,
  align: options.align || "center",
  fontWeight: options.fontWeight || FONT_WEIGHTS.REGULAR,
});

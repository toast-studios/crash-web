// === Crash Game UI — Asset Aliases & Layout Constants ===

export const CRASH_ASSETS = {
  COOL_BUTTON: "cool_button",
  HEAT_BUTTON: "heat_button",
  CASHOUT_BUTTON: "cashout_button",
  PROGRESS_BAR_BG: "progress_bar_background",
  PROGRESS_BAR_FILL: "progress_bar_inside",
  BOOM_BOX: "boom_box",
  DASHBOARD_GLOW: "dashboard_glow",
  PLAYER_BOX: "player_box",
  CRASH_WARS_LOGO: "crash_wars_logo",
  CROSS_BUTTON: "cross_button",
  PLAYER_NAME_HIGHLIGHTER: "player_name_highlighter",
  NO_OF_PLAYERS_BG: "no_of_players_bg",
  CASH_OUT_AMOUNT_CONTAINER: "cash_out_amount_container",
  TRAIL: "trail",
  HEAT_ICON: "heat_icon",
  COOL_ICON: "cool_icon",
  SPACE_STARS: "space_stars",
} as const;

export const CRASH_LAYOUT = {
  ASSET_SCALE: 0.3,

  BUTTON_GAP: 16,
  BUTTON_ROW_GAP: 12,
  PROGRESS_BAR_MARGIN_H: 20,
  DASHBOARD_BOTTOM_PADDING: 24,
  /** Fixed height of the dashboard area (px). Used for y positioning and glow; independent of ASSET_SCALE. */
  DASHBOARD_FIXED_HEIGHT: 350,
  /** Scale factor for the dashboard (width and height). */
  DASHBOARD_SCALE: 1.6,
  /** Extra pixels to move the dashboard down from its default bottom-anchored position. */
  DASHBOARD_EXTRA_DOWN_OFFSET: 130,
  DASHBOARD_SECTION_GAP: 14,

  BADGE_OFFSET_Y: -10,
  BADGE_RADIUS: 14,
  BADGE_FONT_SIZE: 12,

  BOOM_BOX_OFFSET_X: -5,
  PERCENTAGE_PADDING_LEFT: 12,

  BUTTON_PRESS_SCALE_RATIO: 0.92,
  BUTTON_PRESS_DURATION: 0.1,
  BUTTON_RELEASE_DURATION: 0.2,

  SPACESHIP_ROTATION: -35,
} as const;

export const CRASH_LOTTIE_PATHS = {
  SPACESHIP_FLAME: "/lotties/SpaceshipFlame.json",
  SPACESHIP_STOP: "/lotties/SpaceshipStop.json",
  SPACESHIP_BLAST: "/lotties/SpaceshipBlast.json",
} as const;

export const CRASH_LOTTIE_LAYOUT = {
  WIDTH: 150,
  HEIGHT: 150,
  Z_INDEX: 500,
} as const;

export const CRASH_COLORS = {
  BADGE_BG: 0x1a1a3e,
  BADGE_BORDER: 0xffffff,
  BADGE_TEXT: 0xffffff,
  PERCENTAGE_TEXT: 0xffffff,
  DISABLED_TINT: 0x666666,
} as const;

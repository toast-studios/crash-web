import { GAME_ENVIRONMENT, GAME_MODES } from "../constants";
import { CURRENCY_CODES } from "../types";

let BASE_URL = "";
let WEBSOCKET_URL = "";
let LOG_UPLOAD_URL = "";
let WEB_VERSION = "";
let environment = GAME_ENVIRONMENT.DEVELOPMENT;

const CURRENT_GAME_MODE = import.meta.env.VITE_GAME_MODE;

switch (import.meta.env.VITE_GAME_ENVIRONMENT) {
  case GAME_ENVIRONMENT.DEVELOPMENT:
    BASE_URL = "http://localhost:5002";
    WEBSOCKET_URL = "http://localhost:6005";
    LOG_UPLOAD_URL = "https://cdv9p0l9h0.execute-api.ap-south-1.amazonaws.com";
    environment = GAME_ENVIRONMENT.DEVELOPMENT;
    WEB_VERSION = import.meta.env.VITE_WEB_VERSION || "1.0.0";
    break;

  case GAME_ENVIRONMENT.STAGING:
    BASE_URL = "https://api-staging.toaststudios.io";
    WEBSOCKET_URL = "https://api-staging-crash.toaststudios.io";
    LOG_UPLOAD_URL = "https://cdv9p0l9h0.execute-api.ap-south-1.amazonaws.com";
    environment = GAME_ENVIRONMENT.STAGING;
    WEB_VERSION = import.meta.env.VITE_WEB_VERSION || "1.0.0";
    break;

  case GAME_ENVIRONMENT.PRODUCTION:
    BASE_URL = "https://api.toaststudios.io";
    WEBSOCKET_URL = "https://api-blackjack-tournament.toaststudios.io";
    LOG_UPLOAD_URL = "https://cdv9p0l9h0.execute-api.ap-south-1.amazonaws.com";
    environment = GAME_ENVIRONMENT.PRODUCTION;
    WEB_VERSION = import.meta.env.VITE_WEB_VERSION;
    break;
}

export const API_CONSTANTS = {
  BASE_URL,
  WEBSOCKET_URL,
  LOG_UPLOAD_URL,
  GAME_ENVIRONMENT: environment,
  WEB_VERSION,
  GAME_MODES: CURRENT_GAME_MODE,
};

export const PARTNER_ID = {
  kb: "kb",
  fw: "fw",
  bh: "bh",
  gs: "gs",
  bt: "bt",
  st: "st",
  em: "em",
  ts: "ts",
  md: "md",
  sp: "sp",
};

export const CURRENT_PARTNER = import.meta.env.VITE_PARTNER_SHORT;
if (!Object.values(PARTNER_ID).includes(CURRENT_PARTNER)) {
  throw new Error(`Invalid partner ID: ${CURRENT_PARTNER}`);
}

type PartnerConfig = {
  pokerChipTextColor: { color: number; colorStop: number }[];
  winButtonTextColor: { color: number; colorStop: number }[];
  shouldAnimateLogoInMM: boolean;
  typeOfPartnerLogoInMM: "lottie" | "png" | null;
  isDragEnabled: boolean;
  disableExitButtonInGameScreen: boolean;
  disableExitButtonInMM: boolean;
  showPartnerLogoInLobby: boolean;
  disablePartnerLogoInHeader: boolean;
  autoRegisterInRematchOverlay: boolean;
  highScoreColor: number;
  lowScoreColor: number;
  defaultCurrency: CURRENCY_CODES;
  supportsPlayerDetails: boolean; // Whether partner supports getPlayerDetails API
  currencySymbolPosition: "top" | "left"; // Position of currency symbol in poker chip
  showRegisterInLobbyErrorPopup: boolean; // Whether to show error popup when registerInLobby fails
  audioConfig: {
    enableBGM: boolean;
    enableSFX: boolean;
    defaultBGMVolume: number;
    defaultSFXVolume: number;
  };
};

export type PartnerSpecificConfig = {
  [key: string]: PartnerConfig;
};

export const PARTNER_SPECIFIC_CONFIG: PartnerSpecificConfig = {
  [PARTNER_ID.kb]: {
    autoRegisterInRematchOverlay: true,
    pokerChipTextColor: [{ color: 0xf97300, colorStop: 0 }],
    winButtonTextColor: [
      { color: 0xc096db, colorStop: 0 },
      { color: 0x603b77, colorStop: 0.37 },
      { color: 0x34253e, colorStop: 1 },
    ],
    shouldAnimateLogoInMM: true,
    typeOfPartnerLogoInMM: "lottie",
    isDragEnabled: true,
    disableExitButtonInGameScreen: true,
    disableExitButtonInMM: true,
    showPartnerLogoInLobby: true,
    disablePartnerLogoInHeader: true,
    highScoreColor: 0xffffff,
    lowScoreColor: 0xffffff,
    defaultCurrency: CURRENCY_CODES.USD,
    supportsPlayerDetails: false,
    currencySymbolPosition: "top",
    showRegisterInLobbyErrorPopup: true,
    audioConfig: {
      enableBGM: true,
      enableSFX: true,
      defaultBGMVolume: 0.3,
      defaultSFXVolume: 0.5,
    },
  },

  [PARTNER_ID.fw]: {
    autoRegisterInRematchOverlay: false,
    pokerChipTextColor: [
      { color: 0x9b2b2b, colorStop: 0 },
      { color: 0x742222, colorStop: 1 },
    ],
    winButtonTextColor: [
      { color: 0xc096db, colorStop: 0 },
      { color: 0x603b77, colorStop: 0.37 },
      { color: 0x34253e, colorStop: 1 },
    ],
    shouldAnimateLogoInMM: false,
    isDragEnabled: true,
    typeOfPartnerLogoInMM: null,
    disableExitButtonInGameScreen:
      CURRENT_GAME_MODE === GAME_MODES.PRACTICE ? true : false,
    disableExitButtonInMM:
      CURRENT_GAME_MODE === GAME_MODES.PRACTICE ? true : false,
    showPartnerLogoInLobby: false,
    disablePartnerLogoInHeader: true,
    highScoreColor: 0xffffff,
    lowScoreColor: 0xffffff,
    defaultCurrency: CURRENCY_CODES.INR,
    supportsPlayerDetails: false,
    currencySymbolPosition: "left",
    showRegisterInLobbyErrorPopup: true,
    audioConfig: {
      enableBGM: true,
      enableSFX: true,
      defaultBGMVolume: 0.3,
      defaultSFXVolume: 0.5,
    },
  },

  [PARTNER_ID.bh]: {
    autoRegisterInRematchOverlay: true,
    pokerChipTextColor: [{ color: 0x34229c, colorStop: 0 }],
    winButtonTextColor: [
      { color: 0x3d1afd, colorStop: 0 },
      { color: 0x22177d, colorStop: 1 },
    ],
    shouldAnimateLogoInMM: false,
    typeOfPartnerLogoInMM: null,
    isDragEnabled: true,
    disableExitButtonInGameScreen: true,
    disableExitButtonInMM: true,
    showPartnerLogoInLobby: true,
    disablePartnerLogoInHeader: true,
    highScoreColor: 0xffffff,
    lowScoreColor: 0xffffff,
    defaultCurrency: CURRENCY_CODES.USD,
    supportsPlayerDetails: false,
    currencySymbolPosition: "top",
    showRegisterInLobbyErrorPopup: true,
    audioConfig: {
      enableBGM: true,
      enableSFX: true,
      defaultBGMVolume: 0.3,
      defaultSFXVolume: 0.5,
    },
  },
  [PARTNER_ID.gs]: {
    autoRegisterInRematchOverlay: true,
    pokerChipTextColor: [{ color: 0xe65f1f, colorStop: 0 }],
    winButtonTextColor: [
      { color: 0xff5300, colorStop: 0 },
      { color: 0x86310e, colorStop: 1 },
    ],
    shouldAnimateLogoInMM: true,
    typeOfPartnerLogoInMM: "png",
    isDragEnabled: false,
    disableExitButtonInGameScreen: false,
    disableExitButtonInMM: false,
    showPartnerLogoInLobby: true,
    disablePartnerLogoInHeader: true,
    highScoreColor: 0xffffff,
    lowScoreColor: 0xffffff,
    defaultCurrency: CURRENCY_CODES.USD,
    supportsPlayerDetails: false,
    currencySymbolPosition: "top",
    showRegisterInLobbyErrorPopup: true,
    audioConfig: {
      enableBGM: true,
      enableSFX: true,
      defaultBGMVolume: 0.3,
      defaultSFXVolume: 0.5,
    },
  },
  [PARTNER_ID.st]: {
    autoRegisterInRematchOverlay: false,
    pokerChipTextColor: [{ color: 0xe65f1f, colorStop: 0 }],
    winButtonTextColor: [
      { color: 0xff5300, colorStop: 0 },
      { color: 0x86310e, colorStop: 1 },
    ],
    shouldAnimateLogoInMM: true,
    typeOfPartnerLogoInMM: "png",
    isDragEnabled: false,
    disableExitButtonInGameScreen: false,
    disableExitButtonInMM: false,
    showPartnerLogoInLobby: true,
    disablePartnerLogoInHeader: true,
    highScoreColor: 0xffffff,
    lowScoreColor: 0xffffff,
    defaultCurrency: CURRENCY_CODES.USD,
    supportsPlayerDetails: false,
    currencySymbolPosition: "top",
    showRegisterInLobbyErrorPopup: true,
    audioConfig: {
      enableBGM: true,
      enableSFX: true,
      defaultBGMVolume: 0.3,
      defaultSFXVolume: 0.5,
    },
  },
  [PARTNER_ID.bt]: {
    autoRegisterInRematchOverlay: true,
    pokerChipTextColor: [
      { color: 0x9b2b2b, colorStop: 0 },
      { color: 0x742222, colorStop: 1 },
    ],
    winButtonTextColor: [
      { color: 0xc096db, colorStop: 0 },
      { color: 0x603b77, colorStop: 0.37 },
      { color: 0x34253e, colorStop: 1 },
    ],
    shouldAnimateLogoInMM: false,
    isDragEnabled: false,
    typeOfPartnerLogoInMM: null,
    disableExitButtonInGameScreen:
      CURRENT_GAME_MODE === GAME_MODES.PRACTICE ? true : false,
    disableExitButtonInMM: true,
    showPartnerLogoInLobby: false,
    disablePartnerLogoInHeader: true,
    highScoreColor: 0xffffff,
    lowScoreColor: 0xffffff,
    defaultCurrency: CURRENCY_CODES.USD,
    supportsPlayerDetails: false,
    currencySymbolPosition: "top",
    showRegisterInLobbyErrorPopup: true,
    audioConfig: {
      enableBGM: true,
      enableSFX: true,
      defaultBGMVolume: 0.3,
      defaultSFXVolume: 0.5,
    },
  },
  [PARTNER_ID.em]: {
    autoRegisterInRematchOverlay: true,
    pokerChipTextColor: [
      { color: 0x9b2b2b, colorStop: 0 },
      { color: 0x742222, colorStop: 1 },
    ],
    winButtonTextColor: [{ color: 0x1a1c1e, colorStop: 0 }],
    shouldAnimateLogoInMM: true,
    isDragEnabled: false,
    typeOfPartnerLogoInMM: "png",
    disableExitButtonInGameScreen: true, // not required for em
    disableExitButtonInMM: true,
    showPartnerLogoInLobby: true,
    disablePartnerLogoInHeader: true,
    highScoreColor: 0xffffff,
    lowScoreColor: 0xffffff,
    defaultCurrency: CURRENCY_CODES.PLAY_CASH,
    supportsPlayerDetails: true, // Ember supports player details for balance display
    currencySymbolPosition: "top",
    showRegisterInLobbyErrorPopup: true,
    audioConfig: {
      enableBGM: false,
      enableSFX: false,
      defaultBGMVolume: 0,
      defaultSFXVolume: 0,
    },
  },
  [PARTNER_ID.ts]: {
    autoRegisterInRematchOverlay: true,
    pokerChipTextColor: [
      { color: 0x9b2b2b, colorStop: 0 },
      { color: 0x742222, colorStop: 1 },
    ],
    winButtonTextColor: [{ color: 0x1a1c1e, colorStop: 0 }],
    shouldAnimateLogoInMM: true,
    isDragEnabled: false,
    typeOfPartnerLogoInMM: "png",
    disableExitButtonInGameScreen: false,
    disableExitButtonInMM: false,
    showPartnerLogoInLobby: true,
    disablePartnerLogoInHeader: true,
    highScoreColor: 0xffffff,
    lowScoreColor: 0xffffff,
    defaultCurrency: CURRENCY_CODES.USD,
    supportsPlayerDetails: false,
    currencySymbolPosition: "top",
    showRegisterInLobbyErrorPopup: true,
    audioConfig: {
      enableBGM: true,
      enableSFX: true,
      defaultBGMVolume: 0.3,
      defaultSFXVolume: 0.5,
    },
  },
  [PARTNER_ID.md]: {
    autoRegisterInRematchOverlay: true,
    pokerChipTextColor: [
      { color: 0x9b2b2b, colorStop: 0 },
      { color: 0x742222, colorStop: 1 },
    ],
    winButtonTextColor: [{ color: 0x1a1c1e, colorStop: 0 }],
    shouldAnimateLogoInMM: true,
    isDragEnabled: false,
    typeOfPartnerLogoInMM: "png",
    disableExitButtonInGameScreen: true,
    disableExitButtonInMM: true,
    showPartnerLogoInLobby: true,
    disablePartnerLogoInHeader: true,
    highScoreColor: 0xffffff,
    lowScoreColor: 0xffffff,
    defaultCurrency: CURRENCY_CODES.USD,
    supportsPlayerDetails: false,
    currencySymbolPosition: "top",
    showRegisterInLobbyErrorPopup: false, // Midolotto will handle errors in their app
    audioConfig: {
      enableBGM: true,
      enableSFX: true,
      defaultBGMVolume: 0.3,
      defaultSFXVolume: 0.5,
    },
  },
  [PARTNER_ID.sp]: {
    autoRegisterInRematchOverlay: true,
    pokerChipTextColor: [
      { color: 0x9b2b2b, colorStop: 0 },
      { color: 0x742222, colorStop: 1 },
    ],
    winButtonTextColor: [{ color: 0x1a1c1e, colorStop: 0 }],
    shouldAnimateLogoInMM: true,
    isDragEnabled: false,
    typeOfPartnerLogoInMM: "png",
    disableExitButtonInGameScreen: false,
    disableExitButtonInMM: false,
    showPartnerLogoInLobby: false,
    disablePartnerLogoInHeader: true,
    highScoreColor: 0xffffff,
    lowScoreColor: 0xffffff,
    defaultCurrency: CURRENCY_CODES.PLAY_CASH,
    supportsPlayerDetails: true,
    currencySymbolPosition: "top",
    showRegisterInLobbyErrorPopup: true,
    audioConfig: {
      enableBGM: true,
      enableSFX: true,
      defaultBGMVolume: 0.3,
      defaultSFXVolume: 0.5,
    },
  },
};

//@todo in freewin increase active chip scale
//@todo add cash logo in wallet

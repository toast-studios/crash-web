import { CURRENT_PARTNER, PARTNER_ID } from "../../network/constants";
import { CURRENCY_CODES } from "../../types";

export interface BaseUIConfig {
  lobbyScreen: {
    showExitButton: boolean;
    showSettingButton: boolean;
    defaultCurrency: CURRENCY_CODES;
    showPartnerLogo: boolean;
    showWinShowBox: boolean;
  };
}

export const getLobbyScreenUIConfig = (): BaseUIConfig["lobbyScreen"] => {
  switch (CURRENT_PARTNER) {
    case PARTNER_ID.em:
      return {
        showExitButton: false,
        showSettingButton: false,
        defaultCurrency: CURRENCY_CODES.PLAY_CASH,
        showPartnerLogo: false,
        showWinShowBox: false,
      };
    case PARTNER_ID.gs:
      return {
        showExitButton: true,
        showSettingButton: true,
        defaultCurrency: CURRENCY_CODES.USD,
        showPartnerLogo: true,
        showWinShowBox: true,
      };
    case PARTNER_ID.st:
      return {
        showExitButton: true,
        showSettingButton: true,
        defaultCurrency: CURRENCY_CODES.USD,
        showPartnerLogo: true,
        showWinShowBox: false,
      };
    case PARTNER_ID.ts:
      return {
        showExitButton: false,
        showSettingButton: true,
        defaultCurrency: CURRENCY_CODES.USD,
        showPartnerLogo: true,
        showWinShowBox: true,
      };
    case PARTNER_ID.md:
      return {
        showExitButton: false,
        showSettingButton: true,
        defaultCurrency: CURRENCY_CODES.USD,
        showPartnerLogo: true,
        showWinShowBox: false,
      };
    case PARTNER_ID.sp:
      return {
        showExitButton: false,
        showSettingButton: true,
        defaultCurrency: CURRENCY_CODES.PLAY_CASH,
        showPartnerLogo: false,
        showWinShowBox: true,
      };
    default:
      return {
        showExitButton: true,
        showSettingButton: true,
        defaultCurrency: CURRENCY_CODES.PLAY_COINS,
        showPartnerLogo: true,
        showWinShowBox: true,
      };
  }
};

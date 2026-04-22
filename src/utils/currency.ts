import { CURRENCY_CODES } from "../types";
import { formatNumberToShortScale } from "./lobby";

export const formatCurrency = (
  amount: number,
  currencyCode: CURRENCY_CODES,
  currencySymbol: string,
  includeSymbol: boolean = true,
  replaceZeroWith?: string,
): string => {
  let formattedAmount = "";
  if (amount === 0 && replaceZeroWith) {
    return replaceZeroWith;
  }
  if (
    currencyCode === CURRENCY_CODES.PLAY_COINS ||
    currencyCode === CURRENCY_CODES.PLAY_CASH ||
    currencyCode === CURRENCY_CODES.GEMS
  ) {
    formattedAmount = formatNumberToShortScale(amount);
  } else {
    formattedAmount = formatNumberToShortScale(amount / 100);
  }
  if (includeSymbol) {
    return `${currencySymbol}${formattedAmount}`;
  }
  return formattedAmount;
};

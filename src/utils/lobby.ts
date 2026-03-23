// ! this logic will not work case like, 1000500 It will return 1M
// ! considering kind of case when creating a new lobby according to this logic

import { Lobby } from "../store/storeTypes";
import { LOCAL_STORAGE_KEYS, localStorageUtil } from "./localStorageUtil";
import { Currency } from "../types/playable";

const MAX_TARGET_AMOUNT = 1000;
const PERCENTAGE_OF_BALANCE = 0.1;
const formatValue = (
  value: number,
  divisor: number,
  suffix: string,
  isNegative: boolean,
) => {
  const divided = value / divisor;
  // Truncate to 2 decimal places without rounding
  const truncated = Math.floor(divided * 100) / 100;
  // Convert to string with exactly 2 decimal places
  const formatted = truncated.toFixed(2);
  // Remove trailing zeros after decimal point
  const cleanFormatted = formatted.replace(/\.?0+$/, "");
  return `${isNegative ? "-" : ""}${cleanFormatted}${suffix}`;
};

export const formatNumberToShortScale = (
  amount: number,
  minDigitCount: number = 5,
): string => {
  try {
    if (typeof amount === "string") {
      amount = parseFloat(amount);
    }
    // Check if input is valid
    if (typeof amount !== "number" || isNaN(amount) || !isFinite(amount)) {
      throw new Error("Invalid amount");
    }
  } catch (error) {
    console.error("Error formatting number to short scale:", error);
    return "0";
  }

  // Handle negative numbers
  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);
  const digitCount = absoluteAmount.toString().length;

  if (absoluteAmount >= 1000000000 && digitCount >= minDigitCount) {
    // Billion
    return formatValue(absoluteAmount, 1000000000, "B", isNegative);
  } else if (absoluteAmount >= 1000000 && digitCount >= minDigitCount) {
    // Million
    return formatValue(absoluteAmount, 1000000, "M", isNegative);
  } else if (absoluteAmount >= 1000 && digitCount >= minDigitCount) {
    // Thousand
    return formatValue(absoluteAmount, 1000, "K", isNegative);
  }

  // For numbers less than 1000
  return `${isNegative ? "-" : ""}${absoluteAmount}`;
};

export const findClosestLobbyId = (
  allLobbies: Lobby[],
  currencyBalance: number,
): number | null => {
  if (!allLobbies || allLobbies.length === 0) {
    return null;
  }
  const targetAmount = Math.min(
    currencyBalance * PERCENTAGE_OF_BALANCE,
    MAX_TARGET_AMOUNT,
  );
  const eligibleLobbies = allLobbies.filter(
    (value) => value.entryFee <= targetAmount,
  );
  if (eligibleLobbies.length === 0) {
    return null;
  }
  // Find the lobby with entry fee closest to target amount
  let closestLobby = eligibleLobbies[0];
  let closestDifference = Math.abs(targetAmount - closestLobby.entryFee);
  for (let i = 1; i < eligibleLobbies.length; i++) {
    const difference = Math.abs(targetAmount - eligibleLobbies[i].entryFee);
    if (difference < closestDifference) {
      closestLobby = eligibleLobbies[i];
      closestDifference = difference;
    }
  }
  // Return the index of the closest lobby in the original values array
  const foundIndex = allLobbies.findIndex(
    (value) => value._id === closestLobby._id,
  );
  return foundIndex !== -1 ? foundIndex : null;
};

/**
 * Determines the active lobby index based on stored preference or balance-based selection
 */
export const getActiveLobbyIndex = (
  lobbies: Lobby[],
  currencyBalances: Currency,
): number => {
  if (lobbies.length === 0) {
    return 0;
  }

  // First priority: Check for stored default lobby ID
  const defaultLobbyId = localStorageUtil.getItem(
    LOCAL_STORAGE_KEYS.DEFAULT_COIN_LOBBY_ID,
  );
  if (defaultLobbyId) {
    const foundIndex = lobbies.findIndex(
      (lobby) => lobby._id === defaultLobbyId,
    );
    if (foundIndex !== -1) {
      return foundIndex;
    }
  }

  // Second priority: Find closest lobby based on balance

  const balance = currencyBalances.balance || 0;
  const closestLobbyIndex = findClosestLobbyId(lobbies, balance);

  return closestLobbyIndex !== null ? closestLobbyIndex : 0;
};

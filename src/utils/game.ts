/* eslint-disable @typescript-eslint/no-explicit-any */
import { StoreData } from "../store/storeTypes";
import { localStorageUtil } from "./localStorageUtil";
import { LOCAL_STORAGE_KEYS } from "./localStorageUtil";
import { Logger } from "./logger";
import { getUserId } from "./playable";

export const getOpponent = (
  players: StoreData["players"],
  gameUserId: string,
): StoreData["players"][string] => {
  const opponent = Object.values(players).find(
    (player) => player.gameUserId !== gameUserId,
  );
  if (!opponent) {
    throw new Error("Opponent not found");
  }
  return opponent;
};

export const getOpponents = (
  players: StoreData["players"],
  gameUserId: string,
): StoreData["players"][string][] => {
  return Object.values(players).filter(
    (player) => player.gameUserId !== gameUserId,
  );
};

export const timestampToTimeString = (): string => {
  return new Date().toISOString();
};

export const randomUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const delayCall = (delay: number, callback: () => void) =>
  setTimeout(callback, delay);

export const getSessionId = (): string => {
  let sessionId = (window as any).sessionId;
  if (!sessionId) {
    const email =
      localStorageUtil.getItem(LOCAL_STORAGE_KEYS.PLAY_USER_EMAIL) ||
      localStorageUtil.getItem(LOCAL_STORAGE_KEYS.USER_ID) ||
      getUserId() ||
      "";
    (window as any).sessionId = email
      ? email + "-" + new Date().getTime()
      : randomUUID();
    Logger.info("Generated new session ID", (window as any).sessionId);
    sessionId = (window as any).sessionId;
  }
  return sessionId;
};

export function isFreeWin() {
  return localStorageUtil.getItem(LOCAL_STORAGE_KEYS.IS_FREEWIN) === "true";
}

export function isMetaFreeWin() {
  return (
    localStorageUtil.getItem(LOCAL_STORAGE_KEYS.IS_META_FREEWIN) === "true"
  );
}

export function isDragEnabled() {
  return (
    localStorageUtil.getItem(LOCAL_STORAGE_KEYS.IS_DRAG_ENABLED) === "true"
  );
}

/**
 * Selects a random element from an array with uniform distribution.
 * Uses Math.random() which provides uniform distribution in [0, 1).
 * @param array - The array to select from
 * @returns A randomly selected element, or undefined if array is empty
 */
export function getRandomElement<T>(array: T[]): T | undefined {
  if (array.length === 0) {
    return undefined;
  }
  // Math.random() * length gives [0, length)
  // Math.floor() converts to integer index in [0, length-1]
  // This provides uniform distribution across all elements
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

import { randomUUID } from "./game";
import { LOCAL_STORAGE_KEYS } from "./localStorageUtil";
import { localStorageUtil } from "./localStorageUtil";

export function getSessionId() {
  const sessionId = localStorageUtil.getItem(LOCAL_STORAGE_KEYS.SESSION_ID);
  if (!sessionId) {
    //! TODO: Remove this
    localStorageUtil.setItem(
      LOCAL_STORAGE_KEYS.SESSION_ID,
      `DUMMY_SESSION_ID_${randomUUID()}`,
    );
  }
  return localStorageUtil.getItem(LOCAL_STORAGE_KEYS.SESSION_ID) ?? "";
}
export function getUserId() {
  const userId = localStorageUtil.getItem(LOCAL_STORAGE_KEYS.USER_ID);
  if (!userId) {
    //! TODO: Remove this
    localStorageUtil.setItem(
      LOCAL_STORAGE_KEYS.USER_ID,
      `DUMMY_USER_ID_${randomUUID()}`,
    );
  }
  return localStorageUtil.getItem(LOCAL_STORAGE_KEYS.USER_ID) ?? "";
}

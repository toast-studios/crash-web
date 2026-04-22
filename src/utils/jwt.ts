import { jwtDecode } from "jwt-decode";
import { Logger } from "./logger";

interface JWTPayload {
  exp?: number;
  [key: string]: string | number | undefined;
}

export function getJWTData(token: string): JWTPayload | null {
  try {
    // Verify and decode the token
    const decoded = jwtDecode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    Logger.error("Error decoding JWT:", error);
    return null;
  }
}

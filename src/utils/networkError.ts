import { AxiosError } from "axios";

/**
 * Utility function to detect if an error is related to internet disconnection
 * @param error - The error to check
 * @returns The appropriate error code for internet disconnection or the original error
 */
export const mapNetworkError = (
  error: unknown,
): { errorCode: string; isNetworkError: boolean } => {
  if (error instanceof AxiosError) {
    // Check for specific network error codes
    if (error.code === "ERR_INTERNET_DISCONNECTED") {
      return { errorCode: "ERR_INTERNET_DISCONNECTED", isNetworkError: true };
    }

    // Check for network-related error codes
    if (error.code === "ERR_NETWORK" || error.code === "NETWORK_ERROR") {
      return { errorCode: "ERR_INTERNET_DISCONNECTED", isNetworkError: true };
    }

    // Check for connection timeout
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return { errorCode: "ERR_INTERNET_DISCONNECTED", isNetworkError: true };
    }

    // Check if there's no response (network failure)
    if (!error.response && error.request) {
      return { errorCode: "ERR_INTERNET_DISCONNECTED", isNetworkError: true };
    }

    // Check for specific status codes that might indicate network issues
    if (error.response?.status === 0) {
      return { errorCode: "ERR_INTERNET_DISCONNECTED", isNetworkError: true };
    }
  }

  // Check for generic network error messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("network error") ||
      message.includes("internet disconnected") ||
      message.includes("no internet connection") ||
      message.includes("connection failed") ||
      message.includes("fetch failed") ||
      message.includes("network request failed")
    ) {
      return { errorCode: "ERR_INTERNET_DISCONNECTED", isNetworkError: true };
    }
  }

  return { errorCode: "UNKNOWN_ERROR", isNetworkError: false };
};

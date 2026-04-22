import axios, { AxiosError, AxiosInstance } from "axios";
import { Logger } from "../utils/logger";
import { logApiError } from "../scripts/sentry";
import { API_CONSTANTS } from "./constants";
import { mapNetworkError } from "../utils/networkError";
import { getSessionId, getUserId } from "../utils/playable";
import { PlayerDetails, PlayGameData } from "../types/playable";
import { Lobby } from "../store/storeTypes";
import { LOCAL_STORAGE_KEYS } from "../utils/localStorageUtil";
import { localStorageUtil } from "../utils/localStorageUtil";

class ApiClient {
  private instance: AxiosInstance;
  private baseURL: string;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private maxRetries = 3;
  constructor() {
    this.baseURL = API_CONSTANTS.BASE_URL;
    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private extractErrorDetails(error: AxiosError | Error) {
    const isAxiosError = error instanceof AxiosError;

    return {
      url: isAxiosError ? error.config?.url : undefined,
      method: isAxiosError ? error.config?.method?.toUpperCase() : undefined,
      statusCode: isAxiosError ? error.response?.status : undefined,
      statusText: isAxiosError ? error.response?.statusText : undefined,
      responseData: isAxiosError ? error.response?.data : undefined,
      requestData: isAxiosError ? error.config?.data : undefined,
      headers: isAxiosError ? error.config?.headers : undefined,
      timeout: isAxiosError ? error.code === "ECONNABORTED" : false,
      networkError: isAxiosError ? !error.response : false,
      reason: isAxiosError
        ? error.response
          ? `HTTP ${error.response.status}`
          : error.code === "ECONNABORTED"
            ? "Request timeout"
            : error.code === "ERR_NETWORK"
              ? "Network error"
              : error.code === "ERR_INTERNET_DISCONNECTED"
                ? "No internet connection"
                : error.message
        : error.message,
    };
  }

  private logApiError(
    error: Error,
    errorDetails?: {
      url?: string;
      method?: string;
      statusCode?: number;
      statusText?: string;
      responseData?: unknown;
      requestData?: unknown;
      headers?: Record<string, string>;
      timeout?: boolean;
      networkError?: boolean;
      reason?: string;
    },
  ) {
    // Use provided errorDetails or extract them if not provided
    const details =
      errorDetails || this.extractErrorDetails(error as AxiosError);
    logApiError(error, details);
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers["Authorization"] = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Extract error details to check if we should skip logging
        const errorDetails = this.extractErrorDetails(error as AxiosError);

        // Only log API errors to Sentry if they're not 402 or network errors
        // This prevents false error triggers for expected business logic errors
        if (errorDetails.statusCode !== 402 && !errorDetails.networkError) {
          // Pass errorDetails to avoid extracting twice
          this.logApiError(error, errorDetails);
        }

        if (
          // error?.response?.status can be undefined in case of network error
          error?.response?.status === 401 &&
          (!originalRequest._retryCount ||
            originalRequest._retryCount < this.maxRetries)
        ) {
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
          try {
            await this.refreshAuthToken();
            return this.instance(originalRequest);
          } catch (refreshError) {
            Logger.error("Token refresh failed", refreshError);
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      },
    );
  }

  public setAuthToken(token: string) {
    this.authToken = token;
  }

  public setRefreshToken(token: string) {
    this.refreshToken = token;
  }

  public getAuthToken(): string {
    return this.authToken as string;
  }

  public async authenticatePlayUser(email: string): Promise<PlayGameData> {
    try {
      const gameName = "crash";
      const deviceType = "android";
      const deviceId = getSessionId();
      const userId = getUserId();
      const response = await this.instance.get(
        `${API_CONSTANTS.BASE_URL}/play/auth`,
        {
          params: {
            email,
            gameName,
            deviceType,
            deviceId,
            userId,
          },
        },
      );
      if (response.status === 200) {
        this.setAuthToken(response.data?.data?.game?.gameAuthToken);
        this.setRefreshToken(response.data?.data?.game?.gameRefreshToken);
        localStorageUtil.setItem(
          LOCAL_STORAGE_KEYS.AUTH_TOKEN,
          response.data?.data?.game?.gameAuthToken,
        );
        localStorageUtil.setItem(
          LOCAL_STORAGE_KEYS.REFRESH_TOKEN,
          response.data?.data?.game?.gameRefreshToken,
        );
        return response.data?.data;
      }
    } catch (error) {
      Logger.error("Failed to authenticate play user", error);
      throw error;
    }
    return {
      game: {
        gameAuthToken: "",
        gameRefreshToken: "",
      },
      isRejoin: false,
    };
  }

  public async getPlayerDetails(): Promise<PlayerDetails> {
    try {
      const response = await this.instance.get("/game/player-details");
      const data = response.data?.data;
      if (data && data.currencies) {
        return data;
      }
      throw new Error("No player details found", {
        cause: data,
      });
    } catch (error) {
      Logger.error("Failed to get player details", error);
      throw error;
    }
  }

  public async getGameLobbies(): Promise<{
    lobbies: Lobby[];
    banners: string[];
  }> {
    try {
      const response = await this.instance.get(
        `${API_CONSTANTS.BASE_URL}/game/lobby`,
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        },
      );
      return response.data?.data;
    } catch (error) {
      Logger.error("Failed to get game lobbies", error);
      throw error;
    }
  }

  public async getRejoinGameData(gameUserId: string): Promise<object> {
    try {
      const response = await this.instance.get(
        `${API_CONSTANTS.BASE_URL}/game/rejoin-info/${gameUserId}`,
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        },
      );
      return response.data?.data;
    } catch (error) {
      Logger.error("Failed to get game rejoin info", error);
      throw error;
    }
  }

  public async registerInLobby(
    lobbyId: string,
    orderId?: string,
  ): Promise<
    | {
        data: {
          registrationId: string;
        };
        success: true;
        error: { message: string };
      }
    | {
        data: {
          message: string;
          errorCode?: string;
        };
        success: false;
        error: { message: string; errorCode?: string };
      }
  > {
    try {
      const requestBody: {
        lobbyId: string;
        orderId?: string;
      } = {
        lobbyId,
      };

      // Add orderId if provided (e.g., Speed orderId)
      if (orderId) {
        requestBody.orderId = orderId;
      }

      const response = await this.instance.post(
        `${API_CONSTANTS.BASE_URL}/game/register`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        },
      );
      if (response.status === 200) {
        return response.data;
      }
      throw new Error(response.data?.message || "Failed to register in lobby");
    } catch (error) {
      if (error instanceof AxiosError) {
        Logger.error("Failed to register in lobby", error.response?.data);

        // Map network errors to ERR_INTERNET_DISCONNECTED
        const { errorCode, isNetworkError } = mapNetworkError(error);

        // If we have response data, use it but add the mapped error code
        if (error.response?.data) {
          return {
            ...error.response.data,
            error: {
              ...error.response.data.error,
              errorCode: isNetworkError
                ? errorCode
                : error.response.data.error?.errorCode,
            },
          };
        }

        // For network errors without response data, return structured error
        return {
          data: {
            message: isNetworkError
              ? "No internet connection"
              : "Failed to register in lobby",
            errorCode,
          },
          success: false,
          error: {
            message: isNetworkError
              ? "No internet connection"
              : "Failed to register in lobby",
            errorCode,
          },
        };
      }
      throw error;
    }
  }

  private async refreshAuthToken() {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }
    try {
      const response = await this.instance.post("/refresh-token", {
        refreshToken: this.refreshToken,
      });
      this.setAuthToken(response.data.accessToken);
      return response.data.accessToken;
    } catch (error) {
      Logger.error("Failed to refresh token", error);
      throw error;
    }
  }

  public async updatePlayerOnboardingStatus() {
    try {
      const response = await this.instance.post(
        "/game/user/on-boarding-finished",
      );
      return response.data?.data;
    } catch (error) {
      Logger.error("Failed to update player onboarding status", error);
      throw error;
    }
  }

  public async getActivePoolInfo(): Promise<{
    poolId: string;
    endTime: string;
    status:
      | "OPEN_TO_JOIN"
      | "MATCHMAKING_IN_PROGRESS"
      | "MATCHMAKING_COMPLETED";
  }> {
    try {
      const response = await this.instance.get(
        `${API_CONSTANTS.BASE_URL}/game/active-pool-info`,
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        },
      );
      return response.data?.data;
    } catch (error) {
      Logger.error("Failed to get active pool info", error);
      throw error;
    }
  }

  public async getLeaderboard(matchId: string): Promise<{
    success: boolean;
    data: {
      leaderboard: {
        _id: string;
        matchId: string;
        lobbyFormat: string;
        entryFee: number;
        winAmount: number;
        currencyCode: string;
        totalPlayers: number;
        status: string;
        players: Array<{
          gameUserId: string;
          username: string;
          profilePicture: string;
          score: number;
          rank: number;
          winAmount: number;
          status: "PLAYING" | "COMPLETED";
          isTie: boolean;
        }>;
        createdAt: number;
        updatedAt: number;
      };
    };
  }> {
    try {
      const response = await this.instance.get(
        `${API_CONSTANTS.BASE_URL}/game/leaderboard/${matchId}`,
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      Logger.error("Failed to get leaderboard", error);
      throw error;
    }
  }

  public async createSpeedOrder(request: {
    lobbyId: string;
    withdraw_request: string;
  }): Promise<{
    orderId: string;
    paymentRequestData: {
      accountId: string;
      amount: number;
      currency: "SATS" | "BTC" | "USD" | "EUR";
      targetCurrency: "SATS" | "USDT";
      depositAddress: string;
      note: string;
    };
  }> {
    try {
      Logger.info("Creating Speed order:", request);
      const response = await this.instance.post(
        "/partner/speed/payment/create-order",
        request,
      );

      Logger.info("Speed order created successfully:", response.data);
      if (response.status === 200 && response.data?.success) {
        return response.data.data;
      }

      throw new Error(response.data?.error || "Order creation failed");
    } catch (error) {
      Logger.error("Failed to create Speed order", error);
      throw error;
    }
  }

  public async verifySpeedPayment(orderId: string): Promise<{
    success: boolean;
    status: string;
    transactionId: string;
    orderId: string;
  }> {
    try {
      Logger.info("Verifying Speed payment for orderId:", orderId);
      const response = await this.instance.post(
        `/partner/speed/payment/verify-payment/${orderId}`,
      );

      if (response.status === 200 && response.data) {
        return response.data.data;
      }

      throw new Error(response.data?.error || "Payment verification failed");
    } catch (error) {
      Logger.error("Failed to verify Speed payment", error);
      throw error;
    }
  }

  get get() {
    return this.instance.get;
  }

  get post() {
    return this.instance.post;
  }

  get put() {
    return this.instance.put;
  }
}

export const apiClient = new ApiClient();

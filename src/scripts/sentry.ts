import * as Sentry from "@sentry/browser";

export const initSentry = () => {
  Sentry.init({
    dsn: "https://5a4df858e2d06e9f7783bf0f62cf4040@o4507412151205888.ingest.us.sentry.io/4508086884237312",

    // Use VITE_WEB_VERSION from environment variables
    release: `blackjack@${import.meta.env.VITE_WEB_VERSION || "1.0.0"}`,
    environment: import.meta.env.VITE_GAME_ENVIRONMENT || "staging", // ! TODO: change to production
    integrations: [
      // Keep the Replay integration as before
      Sentry.replayIntegration(),
      // The following is all you need to enable canvas recording with Replay
      Sentry.replayCanvasIntegration(),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for tracing.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,

    // Set `tracePropagationTargets` to control for which URLs trace propagation should be enabled
    tracePropagationTargets: ["*"],

    // Capture Replay for 10% of all sessions,
    // plus for 100% of sessions with an error
    // replaysSessionSampleRate: 0.1,
    // replaysOnErrorSampleRate: 1.0,
  });
  // removed duplicate error capture code because it's already handled by the logger

  // * no Logger.info because this is called before Logger is initialized
  console.log("Sentry initialized");
};

// Helper function to check if an object has API response structure
const hasApiResponseStructure = (obj: unknown): boolean => {
  if (typeof obj !== "object" || obj === null || obj instanceof Error) {
    return false;
  }
  const keys = Object.keys(obj);
  // If object has data, error, and success keys, it's likely an API response, not an error
  return (
    keys.includes("data") && keys.includes("error") && keys.includes("success")
  );
};

export const logError = (error: Error, context?: Record<string, unknown>) => {
  if (!Sentry.isInitialized()) {
    return;
  }

  // Skip if error is not actually an Error instance
  if (!(error instanceof Error)) {
    return;
  }

  // Skip if error object itself has API response structure (defensive check)
  if (hasApiResponseStructure(error)) {
    return;
  }

  // Skip if context contains objects that look like API response objects (not actual errors)
  if (context) {
    const contextValues = Object.values(context);
    const hasApiResponse = contextValues.some(hasApiResponseStructure);
    if (hasApiResponse) {
      return;
    }
  }

  Sentry.captureException(error, { extra: context });
};

export const logApiError = (
  error: Error,
  apiContext: {
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
) => {
  if (!Sentry.isInitialized()) {
    return;
  }

  // Extract detailed error information
  const errorDetails = {
    errorType: error.name,
    errorMessage: error.message,
    stack: error.stack,
    ...apiContext,
  };

  // Create a more descriptive error message
  let descriptiveMessage = error.message;

  if (apiContext.networkError) {
    descriptiveMessage = `Network Error: ${apiContext.reason || "Failed to fetch"} - ${apiContext.url}`;
  } else if (apiContext.statusCode) {
    descriptiveMessage = `API Error ${apiContext.statusCode}: ${apiContext.statusText || "Unknown error"} - ${apiContext.method} ${apiContext.url}`;
  } else if (apiContext.timeout) {
    descriptiveMessage = `Request Timeout: ${apiContext.method} ${apiContext.url}`;
  }

  // Create enhanced error object
  const enhancedError = new Error(descriptiveMessage);
  enhancedError.name = error.name;
  enhancedError.stack = error.stack;

  Sentry.captureException(enhancedError, {
    extra: {
      originalError: errorDetails,
      apiContext,
      timestamp: new Date().toISOString(),
    },
    tags: {
      errorType: "api_error",
      method: apiContext.method,
      statusCode: apiContext.statusCode?.toString(),
    },
  });
};

import { Logger } from "../utils/logger";

type WebViewPlatform =
  | "android"
  | "ios"
  | "reactNative"
  | "flutter"
  | "browser";
type messageHandler = (message: string) => void;

const windowWithAppTypes = window as Window & {
  Android?: { postMessage: messageHandler };
  webkit?: {
    messageHandlers?: { postMessageHandler: { postMessage: messageHandler } };
  };
  messageHandler?: { postMessage: messageHandler };
  ReactNativeWebView?: { postMessage: messageHandler };
};

const platformBridges: Record<WebViewPlatform, messageHandler> = {
  // * https://developer.android.com/develop/ui/views/layout/webapps/webview#BindingJavaScript
  android: (message) => windowWithAppTypes.Android?.postMessage(message),

  // * https://forums.developer.apple.com/forums/thread/93886
  ios: (message) =>
    windowWithAppTypes.webkit?.messageHandlers?.postMessageHandler?.postMessage(
      message,
    ),

  // * https://anmol-gupta.medium.com/bridging-worlds-achieving-two-way-communication-between-flutter-and-webview-835716ff4109
  flutter: (message) => windowWithAppTypes.messageHandler?.postMessage(message),

  // * https://medium.com/@svbala99/communication-between-react-native-web-view-and-react-app-c0fb0af7e5a6
  reactNative: (message) =>
    windowWithAppTypes.ReactNativeWebView?.postMessage(message),

  // * Support for regular browser environments
  browser: (message) => {
    window.parent.postMessage(
      {
        ...JSON.parse(message),
        source: "toast-message",
        timestamp: Date.now(),
      },
      "*",
    );
    Logger.info("Browser message sent:", message);
  },
};

export const detectWebView = (): WebViewPlatform => {
  const features: Record<WebViewPlatform, boolean> = {
    android:
      !!windowWithAppTypes.Android && !!windowWithAppTypes.Android.postMessage,
    ios:
      !!windowWithAppTypes.webkit &&
      !!windowWithAppTypes.webkit.messageHandlers &&
      !!windowWithAppTypes.webkit.messageHandlers.postMessageHandler &&
      !!windowWithAppTypes.webkit.messageHandlers.postMessageHandler
        .postMessage,
    flutter:
      !!windowWithAppTypes.messageHandler &&
      !!windowWithAppTypes.messageHandler.postMessage,
    reactNative:
      !!windowWithAppTypes.ReactNativeWebView &&
      !!windowWithAppTypes.ReactNativeWebView.postMessage,
    browser: !!window && !!window.parent && !!window.parent.postMessage,
  };

  const platform = Object.keys(features).find(
    (key) => features[key as WebViewPlatform],
  ) as WebViewPlatform;

  // If no specific features detected, fallback to user agent
  if (!platform) {
    const ua = navigator.userAgent.toLowerCase();

    if (Object.keys(features).some((key) => ua.includes(key))) {
      return ua.includes("android") ? "android" : "ios";
    }
  }

  return platform;
};

const fallbackWebviewMethod: messageHandler = (message) => {
  Logger.info("fallback webviewMethod", { message });
};

let webviewMethod: messageHandler = fallbackWebviewMethod;
try {
  webviewMethod = platformBridges[detectWebView()];
  if (!webviewMethod || typeof webviewMethod !== "function") {
    webviewMethod = fallbackWebviewMethod;
  }
} catch (error) {
  Logger.error("Error detecting webview method:", error);
}

export const sendMessageToApp = (params: {
  eventName: string;
  context?: NonNullable<unknown>;
}) => {
  try {
    // Ensure params is serializable by creating a clean object
    const safeParams = {
      eventName: params.eventName,
      context: params.context
        ? JSON.parse(JSON.stringify(params.context))
        : undefined,
    };

    const message = JSON.stringify(safeParams);

    // Additional validation for React Native WebView
    if (typeof message !== "string") {
      throw new Error("Message must be a string");
    }

    webviewMethod(message);
    Logger.info("Message sent to app:", params);
  } catch (error) {
    Logger.error("Error sending message to app:", error, params);
  }
};

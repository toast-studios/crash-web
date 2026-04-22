# WebView Messaging Bridge Documentation

## Overview

This module provides a unified interface for sending messages from a web application to different WebView platforms including Android, iOS, React Native, and Flutter. It automatically detects the platform and uses the appropriate messaging method.

## Types

### `WebViewPlatform`

```typescript
type WebViewPlatform = "android" | "ios" | "reactNative" | "flutter";
```

Represents the supported WebView platforms.

### `messageHandler`

```typescript
type messageHandler = (message: string) => void;
```

Function type for handling message posting to different platforms.

## Core Functions

### `detectWebView()`

Detects the current WebView platform based on available features and user agent.

**Returns:** `WebViewPlatform`

- Checks for platform-specific features in the window object
- Falls back to user agent detection if no specific features are found
- Returns the detected platform type

### `sendMessageToApp()`

Sends a message to the native application through the appropriate WebView bridge.

**Parameters:**

```typescript
{
  eventName: string;    // Name of the event to trigger
  context?: NonNullable<unknown>  // Optional context data
}
```

**Usage Example:**

```typescript
sendMessageToApp({
  eventName: "userAction",
  context: { id: 123, action: "click" },
});
```

## Platform-Specific Implementation Details

### Android

- Uses `window.Android.postMessage`
- Implementation References: [Android WebView JavaScript Binding](https://developer.android.com/develop/ui/views/layout/webapps/webview#BindingJavaScript)

### iOS

- Uses `window.webkit.messageHandlers.postMessageHandler.postMessage`
- Implementation References: [Apple Developer Forums Reference](https://forums.developer.apple.com/forums/thread/93886)

### Flutter

- Uses `window.messageHandler.postMessage`
- Implementation References: [Flutter WebView Communication](https://anmol-gupta.medium.com/bridging-worlds-achieving-two-way-communication-between-flutter-and-webview-835716ff4109)

### React Native

- Uses `window.ReactNativeWebView.postMessage`
- Implementation References: [React Native WebView Communication](https://medium.com/@svbala99/communication-between-react-native-web-view-and-react-app-c0fb0af7e5a6)

## Error Handling

The implementation includes comprehensive error handling:

1. **Platform Detection Fallback:**

   - If specific features aren't detected, falls back to user agent detection
   - Provides graceful degradation for unsupported platforms

2. **Message Handler Validation:**

   - Validates the existence and type of message handler
   - Falls back to console logging if no valid handler is found

3. **Exception Handling:**
   - Catches and logs errors during platform detection
   - Catches and logs errors during message sending
   - Uses Logger utility for consistent error reporting

## Implementation Notes

1. The module uses TypeScript for type safety and better developer experience.
2. Platform detection is done through feature detection first, with user agent as fallback.
3. All external communication is wrapped in try-catch blocks for reliability.
4. Console fallback ensures messages are not lost even if bridge fails.

## Window Interface Extension

```typescript
type WindowWithAny = Window & {
  Android?: { postMessage: messageHandler };
  webkit?: {
    messageHandlers?: {
      postMessageHandler: {
        postMessage: messageHandler;
      };
    };
  };
  messageHandler?: { postMessage: messageHandler };
  ReactNativeWebView?: { postMessage: messageHandler };
};
```

## Dependencies

- Requires `Logger` utility from "../utils/logger"
- Needs access to global `window` object
- Depends on platform-specific WebView implementations

## Security Considerations

1. All messages are stringified before sending
2. Error handling prevents exposure of sensitive information
3. Platform detection uses safe fallback mechanisms

## Maintainability Notes

- Platform-specific code is isolated in the `platformBridges` object
- Easy to add new platforms by extending the `WebViewPlatform` type and `platformBridges`
- Centralized error handling through Logger utility

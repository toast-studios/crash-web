---
name: crash-game-development
description: >-
  Use when working on HeatWave PvP crash game features: adding socket events,
  modifying game UI (dashboard, heat bar, player boxes, action buttons),
  crash-specific state management, timing/animation adjustments, or WebView bridge
  events. This skill provides the file map and ownership boundaries for the crash
  game vertical slice.
---

# Crash Game Development Guide

Use this skill when you need to:
- Add or modify crash game socket events
- Work on crash game UI (dashboard, heat progress, player boxes, action buttons)
- Update crash game state or timing
- Debug crash-specific WebView bridge communication
- Understand socket event ownership (global router vs screen)

**Before you begin**: Always read the memory files first (`.cursor/memory/architecture.md`, `active-context.md`, `conventions.md`) as directed by `project-context.mdc`.

---

## 1. File Map — The Crash Game Vertical Slice

The crash game is a separate vertical slice from the blackjack/duel code. Here's where everything lives:

### Core Types & State

| File | Purpose |
|------|---------|
| `src/types/crashGame.ts` | **All crash types**: `CrashPlayer`, `CrashGameConfig`, socket payloads (`GameTableInfoPayload`, `GameStartPayload`, etc.), and **`CrashGameSessionState`** (single source of truth for game state) |
| `src/network/SocketEventHandler.ts` | **Typed event maps**: `CrashServerToClientEvents`, `CrashClientToServerEvents` — all socket event names + payload types |

### Constants

| File | Purpose |
|------|---------|
| `src/constants/index.ts` | `CRASH_EVENTS` (server→client like `gameTableInfo`, `gameStart`, `gameStateSync`) and `CRASH_ACTIONS` (client→server like `crashAction`, `leaveGame`) |
| `src/constants/crashTiming.ts` | All timing delays: `COUNTDOWN_SECONDS`, `STATE_BROADCAST_INTERVAL_MS`, `RESULT_SCREEN_NAV_DELAY_MS`, `GAME_OVER_HOLD_DURATION_MS` |
| `src/constants/crashLayout.ts` | UI layout constants: `CRASH_ASSETS` (sprite aliases), `CRASH_LAYOUT` (scales, gaps, offsets), `CRASH_LOTTIE_PATHS`, `CRASH_COLORS` |

### Screens & UI

| File | Lines | Purpose |
|------|-------|---------|
| `src/screens/CrashGameScreen.ts` | 1481 | **Main crash game screen** — owns socket listeners during active gameplay, manages dashboard, action buttons, heat bar, player boxes, lottie animations. **SRP VIOLATION** — needs refactor into focused managers |
| `src/screens/NewMatchMakingScreen.ts` | 1562 | Matchmaking screen with 4-phase animation state machine. **SRP VIOLATION** — needs refactor |
| `src/screens/CrashResultScreen.ts` | 544 | Post-game results screen |
| `src/ui/crash/` | — | Crash-specific UI components: `ActionBubbleEffect`, `CrashActionButton`, `CrashFeed`, `CrossButton`, `HeatDeltaText`, `HeatProgressBar`, `LottiePlayer`, `PlayerBox`, `PlayerCountHeader`, `ShipSpeedLabel`, `SurviveTimer` |

### Network Layer

| File | Purpose |
|------|---------|
| `src/network/eventListeners.ts` | **Global pre-screen socket event router** — listens to `CRASH_EVENTS.GAME_TABLE_INFO` and `CRASH_EVENTS.MATCH_FOUND` **before** `CrashGameScreen` exists; routes to screen creation |
| `src/network/SocketManager.ts` | Low-level Socket.IO transport with reconnection, ping/heartbeat |

### WebView Bridge

| File | Purpose |
|------|---------|
| `src/scripts/webToAppCommunication.helper.ts` | **WebView bridge**: `sendMessageToApp()` — sends messages to native Android/iOS/Flutter/React Native wrapper |
| `src/utils/clientEvent.ts` | **Outbound analytics/bridge events**: `CLIENT_EVENT` enum (e.g., `GAME_STARTED`, `GAME_ENDED`, `MATCH_FOUND`, `HAPTIC_FEEDBACK`) |

---

## 2. Socket Event Ownership — One Owner Per Event

**Rule**: Each socket event must have **one owner** per lifecycle phase. No dual listeners.

### Event Flow Diagram

```
SocketManager (low-level transport)
  │
  ▼
eventListeners.ts (global router — ONLY for pre-screen events)
  │  Owns: CRASH_EVENTS.GAME_TABLE_INFO (triggers screen creation)
  │       CRASH_EVENTS.MATCH_FOUND (captures currentGameUserId)
  │
  ▼
CrashGameScreen (active screen — owns all in-game events)
  │  Owns: CRASH_EVENTS.GAME_START
  │       CRASH_EVENTS.GAME_STATE_SYNC
  │       CRASH_EVENTS.PLAYER_ACTION
  │       CRASH_EVENTS.ROUND_OVER
  │       CRASH_EVENTS.GAME_RESULT_SCREEN
  │       CRASH_EVENTS.GAME_ERROR
  │
  ▼
UI Components (receive data via method calls, NOT socket listeners)
  │  PlayerBox, HeatProgressBar, CrashFeed, etc. — NEVER listen to socket events
```

### Where Events Are Registered

| Event | Owner | File | Method |
|-------|-------|------|--------|
| `CRASH_EVENTS.GAME_TABLE_INFO` | Global router (pre-screen) | `network/eventListeners.ts` | Registered in `attachEventListeners()` |
| `CRASH_EVENTS.MATCH_FOUND` | Global router (pre-screen) | `network/eventListeners.ts` | Registered in `attachEventListeners()` |
| `CRASH_EVENTS.GAME_START` | CrashGameScreen | `screens/CrashGameScreen.ts` | `startSocketEventListeners()` |
| `CRASH_EVENTS.GAME_STATE_SYNC` | CrashGameScreen | `screens/CrashGameScreen.ts` | `startSocketEventListeners()` |
| `CRASH_EVENTS.PLAYER_ACTION` | CrashGameScreen | `screens/CrashGameScreen.ts` | `startSocketEventListeners()` |
| `CRASH_EVENTS.ROUND_OVER` | CrashGameScreen | `screens/CrashGameScreen.ts` | `startSocketEventListeners()` |
| `CRASH_EVENTS.GAME_RESULT_SCREEN` | CrashGameScreen | `screens/CrashGameScreen.ts` | `startSocketEventListeners()` |
| `CRASH_EVENTS.GAME_ERROR` | CrashGameScreen | `screens/CrashGameScreen.ts` | `startSocketEventListeners()` |

### Handoff Pattern (Pre-screen → Screen)

When `GAME_TABLE_INFO` arrives before `CrashGameScreen` exists:

```ts
// In eventListeners.ts (global router):
socketManager.on(CRASH_EVENTS.GAME_TABLE_INFO, (data: GameTableInfoPayload) => {
  // Capture essentials, then create screen
  currentGameUserId = data.gameUserId;
  navigation.showScreen(CrashGameScreen, data);
});

// In CrashGameScreen.show():
async show() {
  await this.initLayout();
  this.isReady = true;
  
  // If state had pendingTurnInfo buffered during init, process now
  if (this.state.pendingTurnInfo) {
    this.handleTurnInfo(this.state.pendingTurnInfo);
    this.state.pendingTurnInfo = null;
  }
  
  this.startSocketEventListeners(); // NOW screen owns its events
}
```

**Never**:
- Listen to the same event in both `eventListeners.ts` AND `CrashGameScreen`
- Use `delayCall(100, ...)` hacks to work around race conditions
- Use `TurnInfoManage` singleton buffer pattern

**Always**:
- Use `pendingTurnInfo` field on `CrashGameSessionState`
- Pass specific callback refs to `.off()` — never call `.off(EVENT)` without a callback
- Call `stopSocketEventListeners()` in `hide()` — screen must not receive events while offscreen

---

## 3. State Management — `CrashGameSessionState`

**Single source of truth**: `CrashGameSessionState` (defined in `src/types/crashGame.ts`).

### Lifecycle

1. **Create once** when `GAME_TABLE_INFO` arrives (in `CrashGameScreen` constructor)
2. **Pass by reference** to all UI components (e.g., `PlayerBox`, `HeatProgressBar`)
3. **Mutate in place** — screens/phases read and write this shared object
4. **Reset** via `state.reset()` on game end

### Key Methods

```ts
class CrashGameSessionState {
  applyGameTableInfo(payload: GameTableInfoPayload): void;
  applyGameStart(payload: GameStartPayload): void;
  applyGameStateSync(payload: GameStateSyncPayload): void;
  applyRoundOver(payload: RoundOverPayload): void;
  
  computeHeatDelta(action: CrashActionType): number;
  getMyPlayer(): CrashPlayer | undefined;
  isMyPlayerAlive(): boolean;
  
  reset(): void; // Call on game end
}
```

### Where State Lives

| State Field | Set By | Read By |
|-------------|--------|---------|
| `phase`, `heat`, `heatZone`, `velocity`, `shipSpeed` | `applyGameStateSync()` | `HeatProgressBar`, `PlayerBox`, `CrashGameScreen` |
| `players[]` | `applyGameStateSync()`, `applyRoundOver()` | `PlayerBox`, `PlayerCountHeader`, `CrashFeed` |
| `feedMessages[]` | `applyGameStateSync()` | `CrashFeed` |
| `coolUsesLeft`, `boostUsesLeft` | `applyGameStateSync()` (derived from `myPlayer.coolCount`, `boostCount`) | `CrashActionButton` |
| `myPlayerId` | Constructor (from `GameTableInfoPayload.gameUserId`) | `getMyPlayer()`, `isMyPlayerAlive()` |

**Anti-pattern**: Never create private copies of state in child components. Always read from the shared `CrashGameSessionState` instance.

---

## 4. Adding a New Socket Event (Crash Game)

### Checklist

1. **Add payload type** to `src/types/crashGame.ts`:
   ```ts
   export interface NewEventPayload {
     fieldA: string;
     fieldB: number;
   }
   ```

2. **Add event constant** to `src/constants/index.ts`:
   ```ts
   export const CRASH_EVENTS = {
     // ... existing events
     NEW_EVENT: "newEvent",
   } as const;
   ```

3. **Extend typed event map** in `src/network/SocketEventHandler.ts`:
   ```ts
   export interface CrashServerToClientEvents {
     // ... existing events
     [CRASH_EVENTS.NEW_EVENT]: (data: NewEventPayload) => void;
   }
   ```

4. **Register in ONE owner** (either `eventListeners.ts` or `CrashGameScreen.startSocketEventListeners()`):
   ```ts
   // In CrashGameScreen:
   private handleNewEvent = (data: NewEventPayload) => {
     if (this.destroyed) return; // Guard
     Logger.info("New event received", data);
     // Update state, trigger UI
   };
   
   startSocketEventListeners() {
     this.socketManager.on(CRASH_EVENTS.NEW_EVENT, this.handleNewEvent);
     // ... other listeners
   }
   
   stopSocketEventListeners() {
     this.socketManager.off(CRASH_EVENTS.NEW_EVENT, this.handleNewEvent);
     // ... other listeners
   }
   ```

5. **Never**:
   - Use `any` for payload type
   - Listen to the same event in both `eventListeners.ts` and `CrashGameScreen`
   - Forget to call `.off()` with the specific callback ref in `stopSocketEventListeners()`

---

## 5. WebView Bridge Communication

The game runs inside a WebView (Android/iOS/Flutter/React Native). Communication is bidirectional:

### Host App → WebView (Inbound)

The host app sends messages via `window.postMessage` or platform-specific bridge. The game listens for:

```ts
// In CrashGameScreen.show() or app.init.ts:
private handleMessage = (event: MessageEvent) => {
  if (event.data.type === "NAVIGATE_BACK") {
    // Handle navigation
  }
  if (event.data.type === "SET_VOLUME") {
    // Update audio volume
  }
};

show() {
  window.addEventListener("message", this.handleMessage);
  window.addEventListener("appMessage", this.handleMessage);
}

hide() {
  window.removeEventListener("message", this.handleMessage);
  window.removeEventListener("appMessage", this.handleMessage);
}
```

**Rule**: Store bound handler as arrow function class field — never use `.bind(this)` inline (creates non-removable reference).

### WebView → Host App (Outbound)

Use `sendMessageToApp()` from `webToAppCommunication.helper.ts`:

```ts
import { sendMessageToApp } from "../scripts/webToAppCommunication.helper";
import { CLIENT_EVENT } from "../utils/clientEvent";

// Notify host that game started:
sendMessageToApp({
  eventName: CLIENT_EVENT.GAME_STARTED,
  context: { matchId, gameUserId },
});

// Notify host that game ended:
sendMessageToApp({
  eventName: CLIENT_EVENT.GAME_ENDED,
  context: { winnerId, prize, survivalTime },
});

// Trigger haptic feedback:
sendMessageToApp({
  eventName: CLIENT_EVENT.HAPTIC_FEEDBACK,
  context: { intensity: "medium" },
});
```

### Available `CLIENT_EVENT` Types (Crash-Relevant)

| Event | When to Send | Context Fields |
|-------|--------------|----------------|
| `GAME_LOADED` | After PixiJS app init + assets loaded | `{ sessionId, gameMode }` |
| `MATCH_FOUND` | When `CRASH_EVENTS.MATCH_FOUND` received | `{ matchId, gameUserId, players[] }` |
| `GAME_STARTED` | When `CRASH_EVENTS.GAME_START` received | `{ matchId, gameUserId }` |
| `GAME_ENDED` | When `CRASH_EVENTS.GAME_RESULT_SCREEN` received | `{ winnerId, prize, survivalTime, rank }` |
| `HAPTIC_FEEDBACK` | On action button press (cool/boost/exit) | `{ intensity: "light" \| "medium" \| "heavy" }` |
| `QUIT_VIEW` | When user presses back/quit button | `{ matchId, reason: "user_quit" }` |

**Where to send these**:
- `GAME_LOADED`: in `app.ts` after `navigation.showScreen(LobbyScreen)`
- `MATCH_FOUND` / `GAME_STARTED` / `GAME_ENDED`: in `CrashGameScreen` socket event handlers
- `HAPTIC_FEEDBACK`: in `CrashActionButton` pointer event handler

---

## 6. Common Pitfalls — Do NOT Duplicate Listeners

### ❌ BAD: Dual Listeners for Same Event

```ts
// eventListeners.ts (global router):
socketManager.on(CRASH_EVENTS.GAME_START, (data) => {
  Logger.info("Game starting");
});

// CrashGameScreen.ts:
socketManager.on(CRASH_EVENTS.GAME_START, (data) => {
  this.handleGameStart(data); // CONFLICT: both fire!
});
```

**Result**: Handler runs twice, causes duplicate animations, state corruption.

### ✅ GOOD: One Owner Per Event

```ts
// eventListeners.ts — does NOT listen to GAME_START

// CrashGameScreen.ts — sole owner:
startSocketEventListeners() {
  this.socketManager.on(CRASH_EVENTS.GAME_START, this.handleGameStart);
}
```

---

### ❌ BAD: Removing Listener Without Callback Ref

```ts
// Removes ALL listeners for this event, including global ones:
socketManager.off(CRASH_EVENTS.GAME_STATE_SYNC);
```

**Result**: Global router's listener for the same event is also removed, breaking pre-screen logic.

### ✅ GOOD: Pass Specific Callback to `.off()`

```ts
// Removes ONLY this screen's listener:
socketManager.off(CRASH_EVENTS.GAME_STATE_SYNC, this.handleGameStateSync);
```

---

### ❌ BAD: UI Component Listening to Socket Events Directly

```ts
// ui/crash/HeatProgressBar.ts:
class HeatProgressBar extends Container {
  constructor() {
    super();
    socketManager.on(CRASH_EVENTS.GAME_STATE_SYNC, (data) => {
      this.heat = data.heat; // WRONG: violates ownership
    });
  }
}
```

**Result**: UI components become untestable, ownership is scattered, cleanup is impossible.

### ✅ GOOD: Screen Calls UI Component Methods

```ts
// CrashGameScreen.ts:
private handleGameStateSync = (data: GameStateSyncPayload) => {
  this.state.applyGameStateSync(data); // Update shared state
  this.heatProgressBar.updateHeat(this.state.heat); // Push to UI
};

// ui/crash/HeatProgressBar.ts:
class HeatProgressBar extends Container {
  updateHeat(value: number): void {
    this.heat = value;
    this.render();
  }
}
```

---

### ❌ BAD: Module-Level Mutable State

```ts
// eventListeners.ts (module scope):
let currentGameUserId: string | null = null;
let currentRound: number = 1;
let lastColumnResultHadDealerBust: boolean = false;
```

**Result**: Hidden global state survives screen transitions, can't be reset cleanly, makes debugging difficult.

### ✅ GOOD: Encapsulate in `CrashGameSessionState`

```ts
// types/crashGame.ts:
export class CrashGameSessionState {
  currentGameUserId: string | null = null;
  currentRound = 1;
  lastColumnResultHadDealerBust = false;

  reset() {
    this.currentGameUserId = null;
    this.currentRound = 1;
    this.lastColumnResultHadDealerBust = false;
  }
}
```

---

## 7. Quick Reference — Where Do I Touch?

| Task | File(s) to Modify |
|------|-------------------|
| Add new socket event | `types/crashGame.ts` (payload), `constants/index.ts` (event constant), `SocketEventHandler.ts` (typed map), `CrashGameScreen.ts` (listener) |
| Change countdown duration | `constants/crashTiming.ts` (`COUNTDOWN_SECONDS`) |
| Adjust heat bar animation speed | `constants/crashTiming.ts` (`STATE_BROADCAST_INTERVAL_MS`) |
| Modify action button layout | `constants/crashLayout.ts` (`BUTTON_GAP`, `BUTTON_ROW_GAP`) |
| Add new Lottie animation | `constants/crashLayout.ts` (`CRASH_LOTTIE_PATHS`), `ui/crash/LottiePlayer.ts` |
| Change dashboard scale | `constants/crashLayout.ts` (`DASHBOARD_SCALE`, `DASHBOARD_FIXED_HEIGHT`) |
| Send new WebView bridge event | `utils/clientEvent.ts` (add to `CLIENT_EVENT` enum), `CrashGameScreen.ts` (call `sendMessageToApp()`) |
| Fix memory leak in CrashGameScreen | Check `destroy()` calls `hide()`, kills GSAP tweens, clears timers, removes socket/DOM listeners |
| Refactor CrashGameScreen (SRP) | Extract managers: `CrashScreenEventHandler`, `CrashAnimationController`, `CrashTimerManager`, `CrashFTUEController` |

---

## 8. Architecture Constraints

**The following are ALWAYS true for crash game code**:

1. **Zero `any` types** — use `unknown` + type guards or proper type definitions
2. **No `alert()`** — use `navigation.presentPopup(InfoPopup, { message, showOkButton, onOkPress })`
3. **No hardcoded colors** — define in `CRASH_COLORS` in `crashLayout.ts`
4. **No magic numbers** — define in `CRASH_TIMING` or `CRASH_LAYOUT`
5. **No `console.*`** — use `Logger.info()`, `Logger.error()` from `utils/logger.ts`
6. **No `.bind(this)` in event listeners** — use arrow function class fields
7. **No `CURRENT_PARTNER ===` checks** — call through `PartnerBehavior` interface (future: crash may need partner-specific UI variants)
8. **No PixiJS display objects in `network/` layer** — network is data-only; UI belongs in screens/components
9. **GSAP over `setTimeout`** — use `gsap.delayedCall()` and `gsap.timeline()` for cancellability
10. **Guard destroyed objects** — check `if (this.destroyed) return` in all async callbacks, tween `onComplete`, promise `.then()`

---

## 9. Testing & Debugging

### Local Testing
```bash
# Start dev server with crash game mode:
VITE_GAME_MODE=gameplay npm start
```

### Check Socket Events
In browser DevTools:
```js
// Expose socket manager (already done in app.init.ts):
window.__socket = socketManager;

// Log all incoming events:
window.__socket.onAny((eventName, ...args) => {
  console.log("Socket event:", eventName, args);
});
```

### Check State
```js
// Expose CrashGameScreen instance (add in CrashGameScreen.show()):
window.__crashScreen = this;

// Inspect state:
console.log(window.__crashScreen.state);
```

### Verify Listener Cleanup
```js
// Check if listeners are removed on screen hide:
window.__crashScreen.hide();
window.__socket.emit(CRASH_EVENTS.GAME_STATE_SYNC, mockPayload);
// Should NOT trigger handler if cleanup is correct
```

---

## Summary

When working on crash game features:

1. **Find your file** using Section 1 (File Map)
2. **Check event ownership** using Section 2 (Socket Event Ownership)
3. **Update state** via `CrashGameSessionState` methods (Section 3)
4. **Add new events** following the checklist (Section 4)
5. **Send WebView bridge events** using Section 5
6. **Avoid common pitfalls** from Section 6
7. **Follow architecture constraints** from Section 8

**Always read the memory files first** (`.cursor/memory/architecture.md`, `active-context.md`, `conventions.md`) and **never create dual listeners** for the same event.

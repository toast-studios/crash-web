// === Toast Auth Service ===
// Handles silent auth via Toast gateway → lobby fetch → register.
// No phone/email input required — email is auto-generated from ?org= URL param.

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOAST_GATEWAY_URL = 'https://api-staging.toaststudios.io';
const PARTNER_ID = 'ts';
const GAME_NAME = 'crash';
const STORAGE_KEY_SESSION = 'toast_session';
const STORAGE_KEY_MATCH_CTX = 'toast_match_ctx';

export interface LobbyDetails {
  _id: string;
  entryFee: number;
  winAmount: number;
  currencyCode: string;
  currencySymbol: string;
  lobbyType: string;
}

export interface ToastSession {
  gameAuthToken: string;
  gameRefreshToken: string;
  gameUserId: string;
  email: string;
}

export interface MatchContext {
  matchId: string;
  registrationId: string;
  partnerId: string;
  gameUserId: string;
  partnerUserId: string;
  username: string;
  lobbyDetails: LobbyDetails;
}

let session: ToastSession | null = null;
let matchContext: MatchContext | null = null;

function generateEmail(): string {
  const orgName =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('org') ?? 'playtoast'
      : 'playtoast';
  const randNum = Math.floor(Math.random() * 10000) + Date.now();
  return `player${randNum}@${orgName}.com`;
}

export interface WebviewTokenPayload {
  guid: string;
  un: string;
  pp: string;
}

export const ToastAuthService = {
  /**
   * Parse ?at= and ?rt= from window.location.search.
   * Returns { at, rt } if both are present, otherwise null.
   */
  parseUrlTokens(): { at: string; rt: string } | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const at = params.get('at');
    const rt = params.get('rt');
    if (at && rt) return { at, rt };
    return null;
  },

  /**
   * Initialise session from a webview-injected JWT (no HTTP calls).
   * Decodes the JWT payload to extract guid, un, pp.
   * Returns the decoded payload so App.tsx can use it immediately.
   */
  async initFromWebviewToken(
    at: string,
    rt: string,
  ): Promise<WebviewTokenPayload> {
    // Base64-decode the middle segment of the JWT (no verification needed client-side)
    const segments = at.split('.');
    if (segments.length < 2) throw new Error('Invalid JWT format');
    const payload = JSON.parse(atob(segments[1])) as WebviewTokenPayload;

    if (!payload.guid) throw new Error('JWT missing guid');

    session = {
      gameAuthToken: at,
      gameRefreshToken: rt,
      gameUserId: payload.guid,
      email: payload.un,
    };

    await AsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));

    return payload;
  },

  /**
   * Always calls /play/auth on startup to get a fresh token and check isRejoin.
   * Returns isRejoin so App.tsx can decide whether to auto-reconnect.
   */
  async init(): Promise<{ isRejoin: boolean }> {
    return ToastAuthService.authenticate();
  },

  /** Authenticate with Toast gateway. Returns isRejoin flag. */
  async authenticate(): Promise<{ isRejoin: boolean }> {
    // Reuse stored identity (email/deviceId/userId) so the server
    // can match us to an existing session and set isRejoin=true.
    let storedSession: ToastSession | null = null;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_SESSION);
      if (stored) storedSession = JSON.parse(stored) as ToastSession;
    } catch {}

    const email = storedSession?.email ?? generateEmail();
    const deviceId = storedSession
      ? `session_${storedSession.gameUserId}`
      : `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const userId = storedSession?.gameUserId
      ?? `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const res = await fetch(
      `${TOAST_GATEWAY_URL}/play/auth?email=${encodeURIComponent(email)}&gameName=${GAME_NAME}&deviceType=android&deviceId=${encodeURIComponent(deviceId)}&userId=${encodeURIComponent(userId)}`,
    );

    if (!res.ok) throw new Error(`Toast auth HTTP ${res.status}`);
    const data = await res.json();

    if (!data.data?.game?.gameAuthToken) {
      throw new Error('Toast auth: missing gameAuthToken in response');
    }

    const isRejoin: boolean = data.data.isRejoin === true;

    session = {
      gameAuthToken: data.data.game.gameAuthToken,
      gameRefreshToken: data.data.game.gameRefreshToken,
      gameUserId: userId,
      email,
    };

    await AsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));

    // On rejoin, load persisted matchContext
    if (isRejoin) {
      await ToastAuthService.loadMatchContext();
    }

    return { isRejoin };
  },

  /** Load persisted matchContext from AsyncStorage (used on rejoin). */
  async loadMatchContext(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_MATCH_CTX);
      if (stored) matchContext = JSON.parse(stored) as MatchContext;
    } catch {}
  },

  /**
   * Fetch available lobbies and register in the first one.
   * Returns the MatchContext needed for joinCrashGame.
   */
  async fetchAndRegister(): Promise<MatchContext> {
    if (!session) throw new Error('ToastAuthService: not authenticated');

    // Fetch lobbies
    const lobbiesRes = await fetch(`${TOAST_GATEWAY_URL}/game/lobby`, {
      headers: { Authorization: `Bearer ${session.gameAuthToken}` },
    });
    if (!lobbiesRes.ok) throw new Error(`Lobby fetch HTTP ${lobbiesRes.status}`);
    const lobbiesData = await lobbiesRes.json();

    const raw = lobbiesData.data.lobbies[0] as {
      _id: string;
      entryFee: number;
      winAmount: number;
      currencyCode: string;
      currencySymbol?: string;
      lobbyFormat?: string;
      lobbyType?: string;
    };

    const lobbyDetails: LobbyDetails = {
      _id: raw._id,
      entryFee: raw.entryFee,
      winAmount: raw.winAmount,
      currencyCode: raw.currencyCode,
      currencySymbol: raw.currencySymbol ?? '$',
      lobbyType: raw.lobbyFormat ?? raw.lobbyType ?? 'duel',
    };

    // Register in lobby
    const regRes = await fetch(`${TOAST_GATEWAY_URL}/game/register`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.gameAuthToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lobbyId: lobbyDetails._id }),
    });
    if (!regRes.ok) throw new Error(`Register HTTP ${regRes.status}`);
    const regData = await regRes.json();
    if (!regData.success) throw new Error('Toast register failed');

    const registrationId: string = regData.data.registrationId;

    matchContext = {
      matchId: registrationId,
      registrationId,
      partnerId: PARTNER_ID,
      gameUserId: session.gameUserId,
      partnerUserId: session.gameUserId,
      username: session.email.split('@')[0],
      lobbyDetails,
    };

    // Persist so it survives page reload (needed for rejoin)
    await AsyncStorage.setItem(STORAGE_KEY_MATCH_CTX, JSON.stringify(matchContext));

    return matchContext;
  },

  getToken(): string | null {
    return session?.gameAuthToken ?? null;
  },

  getSession(): ToastSession | null {
    return session;
  },

  isAuthenticated(): boolean {
    return session !== null;
  },

  getMatchContext(): MatchContext | null {
    return matchContext;
  },

  clearMatchContext(): void {
    matchContext = null;
    AsyncStorage.removeItem(STORAGE_KEY_MATCH_CTX).catch(() => {});
  },

  async signOut(): Promise<void> {
    session = null;
    matchContext = null;
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY_SESSION),
      AsyncStorage.removeItem(STORAGE_KEY_MATCH_CTX),
    ]);
  },
};

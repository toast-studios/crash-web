// === Toast Auth Service ===
// Handles silent auth via Toast gateway → lobby fetch → register.
// No phone/email input required — email is auto-generated from ?org= URL param.

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOAST_GATEWAY_URL = 'https://api-staging.toaststudios.io';
const PARTNER_ID = 'ts';
const GAME_NAME = 'crash';
const STORAGE_KEY_SESSION = 'toast_session';

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

export const ToastAuthService = {
  /** Load persisted session or perform a fresh silent auth. */
  async init(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_SESSION);
      if (stored) {
        session = JSON.parse(stored) as ToastSession;
        return;
      }
    } catch {
      // fall through to fresh auth
    }
    await ToastAuthService.authenticate();
  },

  /** Authenticate with Toast gateway, persist the session. */
  async authenticate(): Promise<void> {
    const email = generateEmail();
    const deviceId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const res = await fetch(
      `${TOAST_GATEWAY_URL}/play/auth?email=${encodeURIComponent(email)}&gameName=${GAME_NAME}&deviceType=android&deviceId=${encodeURIComponent(deviceId)}&userId=${encodeURIComponent(userId)}`,
    );

    if (!res.ok) throw new Error(`Toast auth HTTP ${res.status}`);
    const data = await res.json();

    if (!data.data?.game?.gameAuthToken) {
      throw new Error('Toast auth: missing gameAuthToken in response');
    }

    session = {
      gameAuthToken: data.data.game.gameAuthToken,
      gameRefreshToken: data.data.game.gameRefreshToken,
      gameUserId: userId,
      email,
    };

    await AsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  },

  /**
   * Fetch available lobbies and register in the first one.
   * Returns the MatchContext needed for joinCrashGame.
   * NOTE: matchId is set to registrationId — confirm with Toast if a separate matchId is returned.
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
      lobbyType?: string;
      format?: string;
    };

    const lobbyDetails: LobbyDetails = {
      _id: raw._id,
      entryFee: raw.entryFee,
      winAmount: raw.winAmount,
      currencyCode: raw.currencyCode,
      currencySymbol: raw.currencySymbol ?? '₹',
      lobbyType: raw.lobbyType ?? raw.format ?? 'DUEL',
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
      matchId: registrationId, // TODO: confirm with Toast if a separate matchId field exists
      registrationId,
      partnerId: PARTNER_ID,
      gameUserId: session.gameUserId,
      partnerUserId: session.gameUserId,
      username: session.email.split('@')[0],
      lobbyDetails,
    };

    return matchContext;
  },

  getToken(): string | null {
    return session?.gameAuthToken ?? null;
  },

  isAuthenticated(): boolean {
    return session !== null;
  },

  getMatchContext(): MatchContext | null {
    return matchContext;
  },

  clearMatchContext(): void {
    matchContext = null;
  },

  async signOut(): Promise<void> {
    session = null;
    matchContext = null;
    await AsyncStorage.removeItem(STORAGE_KEY_SESSION);
  },
};

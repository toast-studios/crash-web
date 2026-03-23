import { CURRENT_PARTNER, PARTNER_ID } from "../../network/constants";
import { EmberLobbyScreen } from "./EmberLobby";
import { GamerSaloonLobbyScreen } from "./GamerSaloonLobby";
import { SparketLobbyScreen } from "./SparketLobby";
import { LobbyScreenDefault } from "./LobbyScreen.default";

export function getLobbyScreenConstructor() {
  switch (CURRENT_PARTNER) {
    case PARTNER_ID.em:
      return EmberLobbyScreen;

    case PARTNER_ID.gs:
      return GamerSaloonLobbyScreen;

    case PARTNER_ID.st:
      return SparketLobbyScreen;

    // Add more partners here as they are implemented
    case PARTNER_ID.kb:
    case PARTNER_ID.fw:
    case PARTNER_ID.bh:
    case PARTNER_ID.bt:
    case PARTNER_ID.ts:
    case PARTNER_ID.sp:
    default:
      return LobbyScreenDefault;
  }
}


import { GameState } from './models';

export type NetworkRole = 'HOST' | 'CLIENT';

export type NetworkMessageType = 'HANDSHAKE' | 'GAME_STATE_SYNC' | 'PLAYER_ACTION' | 'EMOTE';

export interface NetworkMessage {
  id: string;
  sender: NetworkRole;
  type: NetworkMessageType;
  payload: any;
  timestamp: number;
}

// Actions that a player can perform
export type GameActionType = 'CLICK_CARD' | 'USE_INSTANT' | 'CONFIRM_INTERACTION';

export interface GameActionPayload {
  actionType: GameActionType;
  cardId?: string;
  value?: number;
  interactionId?: string;
}

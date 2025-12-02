
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
export type GameActionType = 'UPDATE_SELECTION' | 'USE_INSTANT' | 'CONFIRM_INTERACTION' | 'TOGGLE_READY';

export interface GameActionPayload {
  actionType: GameActionType;
  cardId?: string | null; // Allow null for deselection
  value?: number;
  interactionId?: string;
}

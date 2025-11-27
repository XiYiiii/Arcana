
import { Card } from './models';

export interface PendingEffect {
  type: 'ON_DRAW' | 'ON_REVEAL' | 'INSTANT' | 'MARK_TRIGGER' | 'STATUS_PHASE' | 'ON_DISCARD';
  card: Card;
  playerId: number;
  description?: string; // Optional text override for the overlay
}

export interface DelayedEffect {
  turnsRemaining: number;
  action: 'DRAW' | 'DISCARD' | 'ATK_CHANGE';
  amount: number;
  sourceCardName: string;
}

export interface VisualEvent {
  id: string;
  type: 'FLY_CARD' | 'TRANSFORM_CARD';
  fromPid?: number;
  toPid?: number;
  cardName?: string; // For visual context
}

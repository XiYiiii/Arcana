
import { Card } from './models';

export interface InteractionRequest {
  id: string;
  playerId: number;
  title: string;
  description: string;
  inputType?: 'BUTTON' | 'NUMBER_INPUT' | 'CARD_SELECT'; // Added CARD_SELECT
  min?: number; 
  max?: number; 
  onConfirm?: (val: number) => void; 
  options?: { 
    label: string; 
    action: () => void;
    hoverCard?: Card; // Card to show when hovering this option
  }[]; 
  // New for Card Select
  cardsToSelect?: Card[];
  onCardSelect?: (card: Card) => void;
}

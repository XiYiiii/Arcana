
import { Card, CardSuit, CardDefinition } from '../types';
import { INITIAL_DECK_SIZE } from '../constants';
import { CARD_DEFINITIONS } from '../data/cards';

export const compareCards = (a: Card | null, b: Card | null): number => {
  if (!a && !b) return 0;
  if (!a) return 1; // Null is last
  if (!b) return -1; 

  // Check for temporary ranks (e.g. Magician)
  const rankA = a.tempRank !== undefined ? a.tempRank : a.rank;
  const rankB = b.tempRank !== undefined ? b.tempRank : b.rank;

  return rankA - rankB;
};

export const generateDeck = (playerId: number, allowedDefinitions: CardDefinition[] = CARD_DEFINITIONS): Card[] => {
  const deck: Card[] = [];
  
  allowedDefinitions
    .filter(def => !def.isTreasure) // Filter out treasures, they must be earned
    .forEach(def => {
      deck.push({
        ...def,
        instanceId: `p${playerId}-${def.id}-${Date.now()}`,
        marks: [],
        description: def.description || ""
      });
    });

  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

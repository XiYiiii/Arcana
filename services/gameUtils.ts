
import { Card, CardSuit, CardDefinition, PlayerState, GameState, FieldState } from '../types';
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

const ARCANA_NAMES = [
  '愚者', '魔术师', '女祭司', '女皇', '皇帝', '教皇', '恋人', '战车', '力量', '隐者',
  '命运之轮', '正义', '倒吊人', '死神', '节制', '恶魔', '高塔', '星星', '月亮', '太阳',
  '审判', '世界'
];

export const getArcanaNumber = (card: Card): number => {
  // Find which arcana name is in the card name
  const index = ARCANA_NAMES.findIndex(name => card.name.includes(name));
  return index !== -1 ? index : -1;
};

// --- Network Serialization Helpers ---

/**
 * Strips functions from the GameState to make it JSON-serializable for PeerJS.
 * Using JSON.parse(JSON.stringify(obj)) is a simple way to strip undefined and functions.
 */
export const sanitizeGameState = (state: GameState): any => {
  try {
    // This strips functions and undefined values
    return JSON.parse(JSON.stringify(state));
  } catch (e) {
    console.error("Failed to sanitize game state", e);
    // CRITICAL FIX: Do NOT return the original state if serialization fails.
    // The original state contains functions which will crash PeerJS/DataConnection.send().
    // Return a safe fallback or minimal error state.
    return { error: "Serialization Failed", timestamp: Date.now() };
  }
};

/**
 * Re-attaches static definitions (functions) to the sanitized card objects received from network.
 */
const hydrateCard = (card: Card): Card => {
  const def = CARD_DEFINITIONS.find(c => c.id === card.id);
  if (!def) return card;
  // Merge the definition functions back into the instance data
  return {
    ...def,       // Static functions/data
    ...card,      // Instance data (hp, marks, specific descriptions) overrides static if scalar
  };
};

const hydratePlayer = (player: PlayerState): PlayerState => {
  return {
    ...player,
    deck: player.deck.map(hydrateCard),
    hand: player.hand.map(hydrateCard),
    discardPile: player.discardPile.map(hydrateCard),
    fieldSlot: player.fieldSlot ? hydrateCard(player.fieldSlot) : null,
  };
};

const hydrateField = (field: FieldState): FieldState => {
    return {
        ...field,
        card: hydrateCard(field.card)
    };
};

export const hydrateGameState = (state: any): GameState => {
  if (!state || state.error) return state; // Handle error state
  
  return {
    ...state,
    player1: hydratePlayer(state.player1),
    player2: hydratePlayer(state.player2),
    field: state.field ? hydrateField(state.field) : null,
    // Note: PendingEffect also contains a 'card' property that needs hydration
    pendingEffects: state.pendingEffects?.map((pe: any) => ({
        ...pe,
        card: hydrateCard(pe.card)
    })) || [],
    activeEffect: state.activeEffect ? { ...state.activeEffect, card: hydrateCard(state.activeEffect.card) } : null,
    // Interaction might contain cards too
    interaction: state.interaction ? {
        ...state.interaction,
        options: state.interaction.options?.map((opt: any) => ({
            ...opt,
            hoverCard: opt.hoverCard ? hydrateCard(opt.hoverCard) : undefined
        })),
        cardsToSelect: state.interaction.cardsToSelect?.map(hydrateCard)
    } : null
  };
};

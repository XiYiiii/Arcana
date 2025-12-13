
import React from 'react';
import { CardSuit, GamePhase, InstantWindow, Keyword, AITag } from './enums';
import { DelayedEffect, PendingEffect, VisualEvent } from './events';
import { InteractionRequest } from './ui';

export type EffectContext = {
  gameState: GameState;
  sourcePlayerId: number;
  card: Card;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  log: (msg: string) => void;
  isReversed?: boolean; // If true, targets should be swapped
  gameMode?: 'LOCAL' | 'ONLINE'; // To control log privacy
};

export interface CardAIInfo {
  onReveal?: AITag[];    // Tags for "On Play" effects
  onInstant?: AITag[];   // Tags for "Instant" effects
  onDraw?: AITag[];      // Tags for "On Draw" effects
  onDiscard?: AITag[];   // Tags for "On Discard" effects
}

export interface CardDefinition {
  id: string;
  name: string;
  suit: CardSuit;
  rank: number; // Absolute Priority Number (Lower = Faster)
  description?: string; // Optional: Loaded from central file
  keywords?: Keyword[]; // For UI tooltips and filtering
  isTreasure?: boolean; // Immune to invalidate/reverse/swap/seize
  
  // AI Metadata
  aiTags?: CardAIInfo;

  // Logic Hooks
  canSet?: boolean; // Default true
  // Returns true if card can be used as instant in this window
  canInstant?: (window: InstantWindow) => boolean; 
  
  onDraw?: (ctx: EffectContext) => void;
  
  // Priority -1 Phase: Logic here runs BEFORE rank sorting.
  // Used for Reverse/Invalidate effects attached to the main card.
  onResolveStatus?: (ctx: EffectContext) => void;

  // Standard Phase: Logic here runs based on Rank order.
  onReveal?: (ctx: EffectContext) => void; 
  
  onInstant?: (ctx: EffectContext) => void; 
  onDiscard?: (ctx: EffectContext) => void; // Triggers when discarded from HAND/DECK, not field
}

export interface Card extends CardDefinition {
  instanceId: string;
  marks: string[]; // Cards can hold multiple marks (Now restricted to 1 by logic)
  isLocked?: boolean; // New: Cannot be set if true
  lockedTurns?: number; // New: Duration of lock in cleanup cycles
  tempRank?: number; // New: For temporary rank changes (Magician)
  description: string; // Required in runtime instance
}

export interface FieldState {
  card: Card;
  ownerId: number;
  counter: number; // General purpose counter (e.g. discards)
  active: boolean; // Is the field effect currently active?
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
}

export interface PlayerState {
  id: number;
  name: string;
  hp: number;
  atk: number; 
  
  deck: Card[];
  hand: Card[];
  discardPile: Card[];
  
  fieldSlot: Card | null; 
  isFieldCardRevealed: boolean;
  
  // Status Effects
  immunityThisTurn: boolean; 
  immunityNextTurn: boolean; 
  effectDoubleNext: boolean;
  
  // New Status Flags
  isReversed: boolean; // Next effect is reversed
  isInvalidated: boolean; // Next effect is invalidated
  hpRecoverNextTurn: number; // HP to recover next turn (Cup Hanged Man)
  invalidateNextPlayedCard: boolean; // Wands Temperance logic (Current effect)
  invalidateNextTurn: boolean; // Wands Temperance logic (Next Turn trigger)
  preventTransform: number; // Pentacles Hanged Man: Number of transforms to prevent
  
  // Swords Status Flags
  preventHealing: boolean; // Empress: Cannot heal
  hasLifesteal: boolean; // Priestess: Heal on damage deal
  damageReflection: boolean; // Priestess: Take dmg when taking dmg
  incomingDamageConversion: boolean; // Priestess Instant: Convert dmg > atk to heal
  nextDamageDouble: boolean; // Fool Instant: Next incoming damage doubled
  swordsHangedManActive: boolean; // Swords Hanged Man: Reflect dealt damage to self
  
  // Damage Tracking
  damageTakenThisTurn: number; // Tracks damage taken during the current turn (for Pentacles Judgment)
  piercingDamageThisTurn: boolean; // Current turn attacks pierce
  piercingDamageNextTurn: boolean; // Next turn attacks pierce

  delayedEffects: DelayedEffect[]; // For Wands Hanged Man
  
  // Persistent Stats
  maxHandSize: number; // Default 3
  skipDiscardThisTurn: boolean; // For Treasure Wands
  
  quests: Quest[]; // Active quests
  
  // Special Quest State
  swordsSunDamageMult: number; // For Swords Sun quest loop
}

export interface GameState {
  phase: GamePhase;
  instantWindow: InstantWindow; // Controls which instants are usable
  turnCount: number;
  player1: PlayerState;
  player2: PlayerState;
  playerReadyState: { [key: number]: boolean }; // Track readiness for next phase
  field: FieldState | null; // The global field card
  logs: string[];
  isResolving: boolean; 
  pendingEffects: PendingEffect[];
  activeEffect: PendingEffect | null; // For Visual Overlay
  interaction: InteractionRequest | null; // For User Choices (Star, etc)
  visualEvents: VisualEvent[]; // Queue for one-shot animations
}

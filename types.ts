

import React from 'react';

export enum GamePhase {
  DRAW = 'DRAW',
  SET = 'SET',
  REVEAL = 'REVEAL', // Now handles Before Reveal, Reveal, After Reveal, Resolve
  DISCARD = 'DISCARD',
  GAME_OVER = 'GAME_OVER', // New Phase
}

export enum InstantWindow {
  NONE = 'NONE',
  BEFORE_SET = 'BEFORE_SET',      // "置牌前"
  BEFORE_REVEAL = 'BEFORE_REVEAL', // "亮牌前"
  AFTER_REVEAL = 'AFTER_REVEAL',   // "亮牌后" (翻开后，特效前)
  AFTER_EFFECT = 'AFTER_EFFECT',   // "特效后" (未实现通用逻辑，保留扩展位)
}

export enum CardSuit {
  CUPS = 'CUPS',
  SWORDS = 'SWORDS',
  WANDS = 'WANDS',
  PENTACLES = 'PENTACLES',
  EMPTY = 'EMPTY',
  TREASURE = 'TREASURE', // Special Suit for Treasures
}

export enum Keyword {
  SCRY = 'SCRY',         // 占卜
  CLASH = 'CLASH',       // 拼点
  SEIZE = 'SEIZE',       // 夺取
  BLIND_SEIZE = 'BLIND_SEIZE', // 盲夺
  RETURN = 'RETURN',     // 归来
  DESTROY = 'DESTROY',   // 销毁
  INVALIDATE = 'INVALIDATE', // 无效
  REVERSE = 'REVERSE',   // 反转
  TREASURE = 'TREASURE', // 宝藏
  IMPRINT = 'IMPRINT',   // 印记
  SUBSTITUTE = 'SUBSTITUTE', // 替身
  PIERCE = 'PIERCE',     // 穿透
  SHUFFLE = 'SHUFFLE',   // 打乱
  FIELD = 'FIELD',       // 场地
  QUEST = 'QUEST',       // 任务
  LOCK = 'LOCK',         // 锁定
  TRANSFORM = 'TRANSFORM', // 变化
}

export type EffectContext = {
  gameState: GameState;
  sourcePlayerId: number;
  card: Card;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  log: (msg: string) => void;
  isReversed?: boolean; // If true, targets should be swapped
};

export interface CardDefinition {
  id: string;
  name: string;
  suit: CardSuit;
  rank: number; // Absolute Priority Number (Lower = Faster)
  description?: string; // Optional: Loaded from central file
  keywords?: Keyword[]; // For UI tooltips and filtering
  isTreasure?: boolean; // Immune to invalidate/reverse/swap/seize
  
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
  tempRank?: number; // New: For temporary rank changes (Magician)
  description: string; // Required in runtime instance
}

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

export interface VisualEvent {
  id: string;
  type: 'FLY_CARD' | 'TRANSFORM_CARD';
  fromPid?: number;
  toPid?: number;
  cardName?: string; // For visual context
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
  invalidateNextPlayedCard: boolean; // Wands Temperance logic
  
  // Swords Status Flags
  preventHealing: boolean; // Empress: Cannot heal
  hasLifesteal: boolean; // Priestess: Heal on damage deal
  damageReflection: boolean; // Priestess: Take dmg when taking dmg
  incomingDamageConversion: boolean; // Priestess Instant: Convert dmg > atk to heal
  nextDamageDouble: boolean; // Fool Instant: Next incoming damage doubled
  swordsHangedManActive: boolean; // Swords Hanged Man: Reflect dealt damage to self
  
  delayedEffects: DelayedEffect[]; // For Wands Hanged Man
  
  // Persistent Stats
  maxHandSize: number; // Default 3
  skipDiscardThisTurn: boolean; // For Treasure Wands
  
  quests: Quest[]; // Active quests
  
  // Special Quest State
  swordsSunDamageMult: number; // For Swords Sun quest loop
}

export interface InteractionRequest {
  id: string;
  playerId: number;
  title: string;
  description: string;
  inputType?: 'BUTTON' | 'NUMBER_INPUT' | 'CARD_SELECT'; // Added CARD_SELECT
  min?: number; 
  max?: number; 
  onConfirm?: (val: number) => void; 
  options?: { label: string; action: () => void }[]; 
  // New for Card Select
  cardsToSelect?: Card[];
  onCardSelect?: (card: Card) => void;
}

export interface GameState {
  phase: GamePhase;
  instantWindow: InstantWindow; // Controls which instants are usable
  turnCount: number;
  player1: PlayerState;
  player2: PlayerState;
  field: FieldState | null; // The global field card
  logs: string[];
  isResolving: boolean; 
  pendingEffects: PendingEffect[];
  activeEffect: PendingEffect | null; // For Visual Overlay
  interaction: InteractionRequest | null; // For User Choices (Star, etc)
  visualEvents: VisualEvent[]; // Queue for one-shot animations
}


import { AITag, CardAIInfo } from '../types';

export const CARD_AI_TAGS: Record<string, CardAIInfo> = {
    // --- TREASURES ---
    'treasure-cups': {
        onReveal: [AITag.HEAL, AITag.DRAW, AITag.BUFF, AITag.CONTROL] // HP Sacrific for Draw/Dmg, plus Reverse/Invalidate
    },
    'treasure-wands': {
        onReveal: [AITag.CONTROL, AITag.BUFF] // Seize, Max Hand Size +2
    },
    'treasure-swords': {
        onReveal: [AITag.DAMAGE, AITag.CONTROL] // Pierce Dmg, Destroy Field
    },
    'treasure-pentacles': {
        onReveal: [AITag.SPECIAL, AITag.FIELD, AITag.CONTROL] // Quest, Mark, Field
    },

    // --- CUPS ---
    'cups-fool': {
        onDraw: [AITag.DEBUFF], // Mark opp
        onReveal: [AITag.DRAW, AITag.BUFF], // Draw 2, Immunity next turn
        onInstant: [AITag.CONTROL], // Swap
        onDiscard: [AITag.CONTROL] // Into opp deck
    },
    'cups-magician': {
        onDraw: [AITag.DRAW, AITag.SPECIAL], // Guess game
        onReveal: [AITag.BUFF] // Double effect
    },
    'cups-priestess': {
        onReveal: [AITag.BUFF], // Immunity Next
        onInstant: [AITag.BUFF] // Immunity This
    },
    'cups-empress': {
        onReveal: [AITag.BUFF], // Double Next
        onInstant: [AITag.DRAW, AITag.DEBUFF] // Draw 2, Opp Double (Risk)
    },
    'cups-emperor': {
        onDraw: [AITag.CONTROL], // View hand
        onReveal: [AITag.BUFF] // Mark self
    },
    'cups-hierophant': {
        onReveal: [AITag.SPECIAL] // Get Treasure
    },
    'cups-lovers': {
        onDraw: [AITag.CONTROL], // Blind Seize
        onReveal: [AITag.CONTROL] // Into own deck
    },
    'cups-chariot': {
        onReveal: [AITag.DAMAGE, AITag.SPECIAL], // Clash Dmg
        onDiscard: [AITag.SPECIAL] // Quest
    },
    'cups-strength': {
        onReveal: [AITag.FIELD] // Atk+1
    },
    'cups-hermit': {
        onReveal: [AITag.DRAW, AITag.DISCARD], // Scry 2 Discard 1
        onInstant: [AITag.CONTROL] // Shuffle Opp
    },
    'cups-wheel': {
        onReveal: [AITag.DEBUFF], // Reverse Opp
        onInstant: [AITag.TRANSFORM] // Transform self
    },
    'cups-justice': {
        onDraw: [AITag.DISCARD, AITag.DAMAGE], // Discard all
        onReveal: [AITag.DRAW, AITag.DAMAGE] // Draw to 3
    },
    'cups-hangedman': {
        onReveal: [AITag.HEAL], // Delayed Heal
        onInstant: [AITag.DEBUFF, AITag.DAMAGE] // Invalidate Opp + Dmg
    },
    'cups-death': {
        onReveal: [AITag.DAMAGE], // Halve HP
        onDiscard: [AITag.HEAL] // Heal 2
    },
    'cups-temperance': {
        onReveal: [AITag.FIELD], // Set Field
        onInstant: [AITag.DISCARD] // Discard Hand
    },
    'cups-devil': {
        onReveal: [AITag.DRAW, AITag.DAMAGE] // Draw risk
    },
    'cups-tower': {
        onDraw: [AITag.DAMAGE, AITag.CONTROL] // Self Dmg, into opp deck
    },
    'cups-star': {
        onDraw: [AITag.SPECIAL, AITag.DISCARD] // Combo check
    },
    'cups-moon': {
        onReveal: [AITag.HEAL, AITag.DEBUFF], // Cleanse marks
        onDiscard: [AITag.DEBUFF] // Cleanse marks
    },
    'cups-sun': {
        onReveal: [AITag.DAMAGE], // 2xAtk Dmg
    },
    'cups-judgment': {
        onInstant: [AITag.DEBUFF] // Mark Opp
    },
    'cups-world': {
        onReveal: [AITag.SPECIAL], // Bottom of deck
        onInstant: [AITag.DEBUFF, AITag.CONTROL] // Reverse Opp, top of opp deck
    },

    // --- WANDS ---
    'wands-fool': {
        onDraw: [AITag.DISCARD], // Discard All
        onReveal: [AITag.DRAW], // Draw Fools
        onInstant: [AITag.CONTROL], // Swap deck top
        onDiscard: [AITag.DRAW] // Draw 3
    },
    'wands-magician': {
        onReveal: [AITag.CONTROL, AITag.DRAW], // Draw & Swap
        onDiscard: [AITag.FIELD]
    },
    'wands-priestess': {
        onReveal: [AITag.HEAL]
    },
    'wands-empress': {
        onReveal: [AITag.BUFF] // Mark self (onDraw trigger)
    },
    'wands-emperor': {
        onReveal: [AITag.SPECIAL] // Get Treasure
    },
    'wands-hierophant': {
        onReveal: [AITag.BUFF], // Mark Emperor
        onDiscard: [AITag.CONTROL] // Lock Opp
    },
    'wands-lovers': {
        onReveal: [AITag.CONTROL] // Mark Opp (Lock)
    },
    'wands-chariot': {
        onReveal: [AITag.DRAW, AITag.DISCARD, AITag.SPECIAL] // Clash
    },
    'wands-strength': {
        onReveal: [AITag.DAMAGE, AITag.DRAW, AITag.DISCARD, AITag.CONTROL] // Mass effect
    },
    'wands-hermit': {
        onReveal: [AITag.CONTROL], // Scry Opp
        onInstant: [AITag.DEBUFF] // Invalidate deck top
    },
    'wands-wheel': {
        onReveal: [AITag.DEBUFF], // Invalidate this turn
        onDiscard: [AITag.DEBUFF] // Invalidate next card
    },
    'wands-justice': {
        onReveal: [AITag.DEBUFF] // Mark Opp (Limit play)
    },
    'wands-hangedman': {
        onReveal: [AITag.DISCARD, AITag.DRAW], // Discard 1 Draw 2 next
        onDiscard: [AITag.DRAW, AITag.DISCARD] // Draw 1 Discard 2 next
    },
    'wands-death': {
        onReveal: [AITag.SPECIAL] // Return + Mark Death
    },
    'wands-temperance': {
        onReveal: [AITag.DEBUFF] // Invalidate Next Turn
    },
    'wands-devil': {
        onReveal: [AITag.DAMAGE],
        onDiscard: [AITag.DAMAGE] // Self Dmg
    },
    'wands-tower': {
        onDraw: [AITag.CONTROL] // Opp Blind Seize
    },
    'wands-star': {
        onReveal: [AITag.SPECIAL], // Search Sun/Moon
        onDiscard: [AITag.SPECIAL] // Quest
    },
    'wands-moon': {
        onDiscard: [AITag.CONTROL] // Into Opp Hand
    },
    'wands-sun': {
        onReveal: [AITag.DRAW, AITag.DISCARD], // Scry 2 Keep/Discard
        onDiscard: [AITag.SPECIAL] // Return self
    },
    'wands-judgment': {
        onReveal: [AITag.DISCARD], // Discard specific opp cards
        onDiscard: [AITag.DISCARD] // Discard specific opp cards
    },
    'wands-world': {
        onInstant: [AITag.CONTROL], // Substitute
        onDiscard: [AITag.CONTROL] // Into Opp Discard
    },

    // --- SWORDS ---
    'swords-fool': {
        onDraw: [AITag.DAMAGE], // Self Dmg
        onReveal: [AITag.DAMAGE], // AoE Dmg
        onInstant: [AITag.BUFF, AITag.DEBUFF], // Immunity, Double Dmg Next
        onDiscard: [AITag.DRAW, AITag.DAMAGE]
    },
    'swords-magician': {
        onReveal: [AITag.DRAW, AITag.DAMAGE] // Guess game
    },
    'swords-priestess': {
        onReveal: [AITag.BUFF], // Reflect/Lifesteal
        onInstant: [AITag.BUFF] // Convert Dmg
    },
    'swords-empress': {
        onReveal: [AITag.DEBUFF] // Mark (Prevent Heal)
    },
    'swords-emperor': {
        onReveal: [AITag.SPECIAL], // Get Treasure (Cost HP)
        onDiscard: [AITag.HEAL, AITag.DISCARD] // Heal, Discard Hand
    },
    'swords-hierophant': {
        onReveal: [AITag.BUFF], // Mark Self
        onDiscard: [AITag.DEBUFF] // Mark Opp
    },
    'swords-lovers': {
        onDraw: [AITag.DEBUFF, AITag.DRAW] // Mark Both, Draw 1
    },
    'swords-chariot': {
        onReveal: [AITag.SPECIAL] // Get Treasure
    },
    'swords-strength': {
        onReveal: [AITag.BUFF], // Atk +2
        onDiscard: [AITag.DEBUFF] // Atk -1
    },
    'swords-hermit': {
        onReveal: [AITag.CONTROL, AITag.DISCARD] // Scry, move/discard
    },
    'swords-wheel': {
        onDraw: [AITag.DAMAGE, AITag.CONTROL], // Dmg, into opp hand
        onReveal: [AITag.DAMAGE, AITag.CONTROL] // Dmg, into opp deck
    },
    'swords-justice': {
        onReveal: [AITag.DAMAGE], // Punish hand diff
        onDiscard: [AITag.SPECIAL] // Summon Hanged Man
    },
    'swords-hangedman': {
        onReveal: [AITag.BUFF] // Reflect Dmg
    },
    'swords-death': {
        onReveal: [AITag.FIELD] // Death Field
    },
    'swords-temperance': {
        onReveal: [AITag.SPECIAL], // Quest
        onDiscard: [AITag.DISCARD] // Discard Opp
    },
    'swords-devil': {
        onReveal: [AITag.DEBUFF], // Mark All
        onDiscard: [AITag.CONTROL, AITag.DAMAGE] // Discard Field + Dmg
    },
    'swords-tower': {
        onDraw: [AITag.DEBUFF], // Mark All
        onDiscard: [AITag.DRAW, AITag.DEBUFF]
    },
    'swords-star': {
        onDraw: [AITag.SPECIAL], // Copy Sun/Moon
        onDiscard: [AITag.FIELD]
    },
    'swords-moon': {
        onReveal: [AITag.CONTROL], // Field Toggle
        onDiscard: [AITag.CONTROL] // Field Owner Swap
    },
    'swords-sun': {
        onReveal: [AITag.SPECIAL] // Quest
    },
    'swords-judgment': {
        onDraw: [AITag.CONTROL], // Lock
        onReveal: [AITag.CONTROL],
        onInstant: [AITag.CONTROL],
        onDiscard: [AITag.CONTROL]
    },
    'swords-world': {
        onDraw: [AITag.SPECIAL], // Get Treasure (Quest like)
        onReveal: [AITag.SPECIAL] // Quest
    },

    // --- PENTACLES ---
    'pentacles-fool': {
        onDraw: [AITag.SPECIAL], // Quest
        onReveal: [AITag.CONTROL], // Blind Seize Swap
        onInstant: [AITag.TRANSFORM], // Transform Hand
        onDiscard: [AITag.FIELD]
    },
    'pentacles-magician': {
        onReveal: [AITag.FIELD],
        onDiscard: [AITag.TRANSFORM] // Transform Both
    },
    'pentacles-priestess': {
        onDraw: [AITag.SPECIAL], // Quest
        onReveal: [AITag.HEAL, AITag.DAMAGE], // Scry calc
        onDiscard: [AITag.SPECIAL] // Cancel Quest
    },
    'pentacles-empress': {
        onReveal: [AITag.SPECIAL], // Complete Quest
        onDiscard: [AITag.DEBUFF] // Reset Opp Quest
    },
    'pentacles-emperor': {
        onReveal: [AITag.CONTROL, AITag.DISCARD] // Pay HP, Discard, Seize
    },
    'pentacles-hierophant': {
        onDraw: [AITag.FIELD, AITag.DAMAGE], // Field check
        onReveal: [AITag.BUFF, AITag.DRAW] // Mark/Draw
    },
    'pentacles-lovers': {
        onDraw: [AITag.CONTROL, AITag.TRANSFORM], // Blind Seize Transform
        onReveal: [AITag.DEBUFF] // Mark Both
    },
    'pentacles-chariot': {
        onReveal: [AITag.CONTROL], // Clash Lock
        onDiscard: [AITag.CONTROL] // Shuffle Both
    },
    'pentacles-strength': {
        onReveal: [AITag.DISCARD, AITag.CONTROL] // Discard Self, Destroy Opp
    },
    'pentacles-hermit': {
        onDraw: [AITag.CONTROL], // Scry Deck
        onReveal: [AITag.TRANSFORM], // Transform Deck
        onDiscard: [AITag.CONTROL] // Scry Opp
    },
    'pentacles-wheel': {
        onReveal: [AITag.FIELD]
    },
    'pentacles-justice': {
        onInstant: [AITag.CONTROL, AITag.DEBUFF] // Anti-Effect (Reverse/Invalidate/Discard Field)
    },
    'pentacles-hangedman': {
        onReveal: [AITag.BUFF], // Prevent Transform
        onDiscard: [AITag.SPECIAL] // Fetch Justice
    },
    'pentacles-death': {
        onReveal: [AITag.DISCARD, AITag.SPECIAL], // Discard n Return n
        onDiscard: [AITag.CONTROL, AITag.SPECIAL] // Destroy self Return 1
    },
    'pentacles-temperance': {
        onReveal: [AITag.SPECIAL] // Get Treasure
    },
    'pentacles-devil': {
        onReveal: [AITag.TRANSFORM, AITag.DISCARD], // Transform Opp Hand
        onDiscard: [AITag.TRANSFORM, AITag.DISCARD] // Transform Self Hand, Discard Opp
    },
    'pentacles-tower': {
        onDraw: [AITag.SPECIAL, AITag.CONTROL] // Spawn Tower, Shuffle
    },
    'pentacles-star': {
        onReveal: [AITag.SPECIAL] // Return All Star/Moon/Sun
    },
    'pentacles-moon': {
        onDraw: [AITag.SPECIAL], // Quest
        onDiscard: [AITag.SPECIAL] // Cancel Quest
    },
    'pentacles-sun': {
        onDraw: [AITag.TRANSFORM], // Transform Self
        onReveal: [AITag.DAMAGE]
    },
    'pentacles-judgment': {
        onReveal: [AITag.FIELD]
    },
    'pentacles-world': {
        onReveal: [AITag.BUFF], // Pierce next turn
        onInstant: [AITag.TRANSFORM] // Transform played card
    },
};

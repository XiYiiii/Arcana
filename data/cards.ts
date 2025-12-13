
import { CardDefinition } from '../types';
import { TREASURE_CUPS, CUPS_CARDS } from './cards/cups/index';
import { TREASURE_WANDS, WANDS_CARDS } from './cards/wands/index';
import { TREASURE_SWORDS, SWORDS_CARDS } from './cards/swords/index';
import { PENTACLES_CARDS, TREASURE_PENTACLES } from './cards/pentacles/index';
import { CARD_DESCRIPTIONS } from './descriptions';
import { CARD_AI_TAGS } from './aiTags';

export { TREASURE_CUPS, TREASURE_WANDS, TREASURE_SWORDS, TREASURE_PENTACLES };

const injectMetadata = (def: CardDefinition): CardDefinition => {
  const desc = CARD_DESCRIPTIONS[def.id];
  const aiTags = CARD_AI_TAGS[def.id];
  
  return {
    ...def,
    description: desc || def.description || "No description found.",
    aiTags: aiTags
  };
};

export const CARD_DEFINITIONS: CardDefinition[] = [
    injectMetadata(TREASURE_CUPS),
    injectMetadata(TREASURE_WANDS),
    injectMetadata(TREASURE_SWORDS),
    injectMetadata(TREASURE_PENTACLES),
    ...CUPS_CARDS.map(injectMetadata),
    ...WANDS_CARDS.map(injectMetadata),
    ...SWORDS_CARDS.map(injectMetadata),
    ...PENTACLES_CARDS.map(injectMetadata)
];

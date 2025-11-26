

import { CardDefinition } from '../types';
import { TREASURE_CUPS, CUPS_CARDS } from './cards/cups/index';
import { TREASURE_WANDS, WANDS_CARDS } from './cards/wands/index';
import { TREASURE_SWORDS, SWORDS_CARDS } from './cards/swords/index';
import { PENTACLES_CARDS } from './cards/pentacles/index';
import { CARD_DESCRIPTIONS } from './descriptions';

export { TREASURE_CUPS, TREASURE_WANDS, TREASURE_SWORDS };

const injectDescription = (def: CardDefinition): CardDefinition => {
  const desc = CARD_DESCRIPTIONS[def.id];
  return {
    ...def,
    description: desc || def.description || "No description found."
  };
};

export const CARD_DEFINITIONS: CardDefinition[] = [
    injectDescription(TREASURE_CUPS),
    injectDescription(TREASURE_WANDS),
    injectDescription(TREASURE_SWORDS),
    ...CUPS_CARDS.map(injectDescription),
    ...WANDS_CARDS.map(injectDescription),
    ...SWORDS_CARDS.map(injectDescription),
    ...PENTACLES_CARDS.map(injectDescription)
];

import { CardDefinition, CardSuit, Keyword } from '../../../types';
import { setField } from '../../../services/actions';

export const SWORDS_DEATH: CardDefinition = {
    id: 'swords-death', name: '宝剑·死神', suit: CardSuit.SWORDS, rank: 313,
    description: "打出：设置场地为“宝剑·死神”，并激活之。\n(场地“宝剑·死神”)当此场地激活时，当有玩家Hp<0时，将此牌弃置，然后将那个玩家的Hp修改为1。",
    keywords: [Keyword.FIELD],
    onReveal: (ctx) => {
        setField(ctx, ctx.card);
    }
};

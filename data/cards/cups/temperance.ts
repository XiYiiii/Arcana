
import { CardDefinition, CardSuit, InstantWindow, Card } from '../../../types';
import { modifyPlayer, getOpponentId } from '../../../services/actions';

const resolveTemperanceDmg = (ctx: any, chosenSuits: CardSuit[]) => {
    ctx.setGameState((prev: any) => {
        if (!prev) return null;
        const myKey = ctx.sourcePlayerId === 1 ? 'player1' : 'player2';
        const oppId = getOpponentId(ctx.sourcePlayerId);
        const oppKey = oppId === 1 ? 'player1' : 'player2';
        const myHand = prev[myKey].hand;
        const mySuits = new Set(myHand.map((c: Card) => c.suit));
        let selfDmg = 0;
        let oppDmg = 0;
        const allSuits = [CardSuit.CUPS, CardSuit.SWORDS, CardSuit.WANDS, CardSuit.PENTACLES];
        allSuits.forEach(s => {
            const isInHand = mySuits.has(s);
            const isChosen = chosenSuits.includes(s);
            if (isInHand) {
                if (isChosen) selfDmg += 1; 
                else oppDmg += 2; 
            }
        });
        ctx.log(`[节制] 结算: 猜中数 ${selfDmg}, 遗漏数 ${oppDmg/2}`);
        return {
            ...prev,
            interaction: null,
            [myKey]: { ...prev[myKey], hp: prev[myKey].hp - selfDmg },
            [oppKey]: { ...prev[oppKey], hp: prev[oppKey].hp - oppDmg }
        };
    });
}

export const CUPS_TEMPERANCE: CardDefinition = {
    id: 'cups-temperance', name: '圣杯·节制', suit: CardSuit.CUPS, rank: 114, 
    description: "打出：令对方选择两个花色并查看己方手牌。若有选中花色，己方扣除1生命/张；若有未选中花色，对方扣除2生命/张。\n插入(置牌前)：丢弃己方所有牌。",
    keywords: [],
    onReveal: (ctx) => {
       const oppId = getOpponentId(ctx.sourcePlayerId);
       const options = [CardSuit.CUPS, CardSuit.SWORDS, CardSuit.WANDS, CardSuit.PENTACLES];
       const ask = (stage: 1 | 2, first?: CardSuit) => {
          ctx.setGameState(prev => ({
              ...prev!,
              interaction: {
                  id: `temp-new-${Date.now()}`,
                  playerId: oppId,
                  title: "圣杯·节制",
                  description: `请选择花色 (${stage}/2):`,
                  options: options.map(s => ({
                      label: s,
                      action: () => {
                          if(stage===1) ask(2, s);
                          else resolveTemperanceDmg(ctx, [first!, s]);
                      }
                  }))
              }
          }));
       };
       ask(1);
    },
    canInstant: (w) => w === InstantWindow.BEFORE_SET,
    onInstant: (ctx) => {
        modifyPlayer(ctx, ctx.sourcePlayerId, p => ({ ...p, hand: [], fieldSlot: null, discardPile: [...p.discardPile, ...p.hand, ...(p.fieldSlot?[p.fieldSlot]:[])] }));
    }
};

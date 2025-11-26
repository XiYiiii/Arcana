
import { GamePhase, InstantWindow, PlayerState } from '../../types';

export const executeSetPhase = (
  ctx: { 
    setGameState: any, 
    p1SelectedCardId: string | null, 
    p2SelectedCardId: string | null,
    setP1SelectedCardId: any,
    setP2SelectedCardId: any
  }
) => {
  const { setGameState, p1SelectedCardId, p2SelectedCardId, setP1SelectedCardId, setP2SelectedCardId } = ctx;

  setGameState(prev => {
    if (!prev) return null;
    const setCard = (p: PlayerState, cInstanceId: string | null): PlayerState => {
      if (!cInstanceId) return { ...p, fieldSlot: null, isFieldCardRevealed: false };
      const idx = p.hand.findIndex(c => c.instanceId === cInstanceId);
      if (idx === -1) return p;
      const newHand = [...p.hand];
      const [c] = newHand.splice(idx, 1);
      return { ...p, hand: newHand, fieldSlot: c, isFieldCardRevealed: false };
    };

    return {
      ...prev,
      phase: GamePhase.REVEAL,
      instantWindow: InstantWindow.BEFORE_REVEAL, // Next window
      player1: setCard(prev.player1, p1SelectedCardId),
      player2: setCard(prev.player2, p2SelectedCardId),
      logs: ["双方已盖牌。进入【亮牌前】时机。若无操作请点击【揭示卡牌】。", ...prev.logs]
    };
  });
  
  setP1SelectedCardId(null);
  setP2SelectedCardId(null);
};

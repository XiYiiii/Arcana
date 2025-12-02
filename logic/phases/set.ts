
import { GamePhase, InstantWindow, PlayerState } from '../../types';

export const executeSetPhase = (
  ctx: { 
    setGameState: any, 
    p1SelectedCardId: string | null, 
    p2SelectedCardId: string | null,
  }
) => {
  const { setGameState, p1SelectedCardId, p2SelectedCardId } = ctx;

  setGameState((prev: any) => {
    if (!prev) return null;
    const setCard = (p: PlayerState, cInstanceId: string | null): PlayerState => {
      // If no card selected (empty hand case or logic error), set field to null
      if (!cInstanceId) return { ...p, fieldSlot: null, isFieldCardRevealed: false };
      
      const idx = p.hand.findIndex(c => c.instanceId === cInstanceId);
      if (idx === -1) return p; // Should not happen if validated
      
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
      logs: ["双方已盖牌。进入【亮牌前】时机。若无操作请点击【揭示卡牌】。", ...prev.logs],
      // CRITICAL FIX: Reset isResolving so OnlineGame UI unlocks
      isResolving: false,
      // IMPORTANT: Reset ready state so players must click "Reveal"
      playerReadyState: { 1: false, 2: false }
    };
  });
};

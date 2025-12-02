
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
    const setCard = (p: PlayerState, cInstanceId: string | null, pid: number): PlayerState => {
      // If no card selected (empty hand case or logic error), set field to null
      if (!cInstanceId) {
          // Keep existing field if any (though usually cleared in cleanup, here we explicitly set null for set phase)
          // Wait, if hand is empty, we set fieldSlot null.
          return { ...p, fieldSlot: null, isFieldCardRevealed: false };
      }
      
      const idx = p.hand.findIndex(c => c.instanceId === cInstanceId);
      if (idx === -1) {
          console.warn(`[Set Phase] Player ${pid} tried to set card ${cInstanceId} but it was not found in hand.`);
          return p; 
      }
      
      const newHand = [...p.hand];
      const [c] = newHand.splice(idx, 1);
      return { ...p, hand: newHand, fieldSlot: c, isFieldCardRevealed: false };
    };

    return {
      ...prev,
      phase: GamePhase.REVEAL,
      instantWindow: InstantWindow.BEFORE_REVEAL, // Next window
      player1: setCard(prev.player1, p1SelectedCardId, 1),
      player2: setCard(prev.player2, p2SelectedCardId, 2),
      logs: ["双方已盖牌。进入【亮牌前】时机。若无操作请点击【揭示卡牌】。", ...prev.logs],
      // CRITICAL FIX: Reset isResolving so OnlineGame UI unlocks
      isResolving: false,
      // IMPORTANT: Reset ready state so players must click "Reveal"
      playerReadyState: { 1: false, 2: false }
    };
  });
};

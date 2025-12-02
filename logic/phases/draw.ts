
import { GamePhase, InstantWindow, EffectContext } from '../../types';
import { drawCards } from '../../services/actions';

const DELAY_MS = 600; 
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const executeDrawPhase = async (
  ctx: { 
    gameState: any, 
    setGameState: any, 
    createEffectContext: (pid: number, card: any) => EffectContext 
  }
) => {
  const { gameState, setGameState, createEffectContext } = ctx;
  if (!gameState || gameState.isResolving) return;

  setGameState(prev => prev ? ({ ...prev, isResolving: true }) : null);

  // drawCards populates pendingEffects. 
  const p1First = gameState.player1.hand[0] || gameState.player1.deck[0];
  const p2First = gameState.player2.hand[0] || gameState.player2.deck[0];
  
  // Note: We pass dummy cards if hand/deck are empty just to satisfy types, 
  // but logic handles empty decks.
  // True flag enables Draw Phase specific reductions (e.g. Cups Fool)
  const ctx1 = createEffectContext(1, p1First); 
  drawCards(ctx1, 1, 1, true);
  
  const ctx2 = createEffectContext(2, p2First); 
  drawCards(ctx2, 2, 1, true);

  await delay(DELAY_MS); 

  setGameState(prev => prev ? ({
    ...prev,
    phase: GamePhase.SET,
    instantWindow: InstantWindow.BEFORE_SET,
    logs: ["抽牌结束，进入盖牌阶段。", "现在可以使用【置牌前】插入。", ...prev.logs],
    isResolving: false,
    playerReadyState: { 1: false, 2: false } // Ensure ready state is clear for next phase
  }) : null);
};

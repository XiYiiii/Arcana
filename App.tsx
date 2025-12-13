
import React, { useState } from 'react';
import { INITIAL_HP, INITIAL_ATK } from './constants';
import { CARD_DEFINITIONS } from './data/cards';

import { StartScreen } from './components/screens/StartScreen';
import { GameSetupScreen } from './components/screens/GameSetupScreen';
import { LocalGame } from './components/game/local/LocalGame';
import { OnlineGame } from './components/game/online/OnlineGame';
import { PVEGame } from './components/game/pve/PVEGame';

type AppMode = 'MENU' | 'BUILDER' | 'LOCAL_GAME' | 'ONLINE_GAME' | 'PVE_GAME';

export default function App() {
  // App Mode State
  const [appMode, setAppMode] = useState<AppMode>('MENU');
  
  // Game Configuration State
  const [enabledCardIds, setEnabledCardIds] = useState<string[]>(
      CARD_DEFINITIONS.filter(c => !c.isTreasure).map(c => c.id)
  );
  const [initialHp, setInitialHp] = useState(INITIAL_HP);
  const [initialHandSize, setInitialHandSize] = useState(3);

  const handleSetupConfirm = (ids: string[], settings: { hp: number, handSize: number }) => {
      setEnabledCardIds(ids);
      setInitialHp(settings.hp);
      setInitialHandSize(settings.handSize);
      setAppMode('MENU');
  };

  // --- RENDER SWITCH ---
  if (appMode === 'MENU') {
      return (
        <StartScreen 
          onStartGame={() => setAppMode('LOCAL_GAME')} 
          onStartOnlineGame={() => setAppMode('ONLINE_GAME')}
          onStartPVE={() => setAppMode('PVE_GAME')}
          onOpenDeckBuilder={() => setAppMode('BUILDER')} 
        />
      );
  }

  if (appMode === 'BUILDER') {
      return (
        <GameSetupScreen 
            enabledCardIds={enabledCardIds} 
            initialSettings={{ hp: initialHp, handSize: initialHandSize }}
            onSave={handleSetupConfirm} 
            onBack={() => setAppMode('MENU')} 
        />
      );
  }

  if (appMode === 'LOCAL_GAME') {
      return (
        <LocalGame 
          enabledCardIds={enabledCardIds}
          initialHp={initialHp}
          initialHandSize={initialHandSize}
          onExit={() => setAppMode('MENU')}
        />
      );
  }

  if (appMode === 'ONLINE_GAME') {
      return (
        <OnlineGame 
          enabledCardIds={enabledCardIds}
          initialHp={initialHp}
          initialHandSize={initialHandSize}
          onExit={() => setAppMode('MENU')}
        />
      );
  }

  if (appMode === 'PVE_GAME') {
      return (
        <PVEGame 
          enabledCardIds={enabledCardIds}
          initialHp={initialHp}
          initialHandSize={initialHandSize}
          onExit={() => setAppMode('MENU')}
        />
      );
  }

  return null;
}

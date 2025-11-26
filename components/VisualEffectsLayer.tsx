
import React, { useEffect, useState } from 'react';
import { VisualEvent } from '../types';

interface VisualEffectsLayerProps {
    events: VisualEvent[];
    onEventComplete: (id: string) => void;
}

export const VisualEffectsLayer: React.FC<VisualEffectsLayerProps> = ({ events, onEventComplete }) => {
    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {events.map(event => (
                <VisualEventItem key={event.id} event={event} onComplete={() => onEventComplete(event.id)} />
            ))}
        </div>
    );
};

interface VisualEventItemProps {
    event: VisualEvent;
    onComplete: () => void;
}

const VisualEventItem: React.FC<VisualEventItemProps> = ({ event, onComplete }) => {
    const [animationStage, setAnimationStage] = useState(0);

    useEffect(() => {
        // Start animation
        setAnimationStage(1);
        
        // Cleanup based on duration
        const duration = event.type === 'FLY_CARD' ? 800 : 600;
        const timer = setTimeout(() => {
            onComplete();
        }, duration);

        return () => clearTimeout(timer);
    }, []);

    if (event.type === 'FLY_CARD') {
        const isFromP1 = event.fromPid === 1;
        // Approximation of positions:
        // P1 Hand: Bottom Center
        // P2 Hand: Top Center
        // We simulate flying from one side to the other.
        
        const startY = isFromP1 ? '80%' : '10%';
        const endY = isFromP1 ? '10%' : '80%';
        
        // Random slight X variation
        const startX = '50%';
        const endX = '50%';

        const style: React.CSSProperties = {
            position: 'absolute',
            left: startX,
            top: startY,
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: animationStage === 1 ? `translate(-50%, ${isFromP1 ? '-60vh' : '60vh'}) scale(0.5) rotate(360deg)` : 'translate(-50%, 0) scale(0.5)',
            opacity: animationStage === 1 ? 0 : 1
        };

        return (
            <div style={style} className="w-24 h-32 bg-stone-800 border border-amber-500 rounded shadow-2xl flex items-center justify-center">
                 <span className="text-2xl">🃏</span>
            </div>
        );
    }

    if (event.type === 'TRANSFORM_CARD') {
        // Transform effect: a flash/burst at the center (or approximated player area)
        const isP1 = event.fromPid === 1;
        const top = isP1 ? '70%' : '30%';

        return (
            <div 
                className="absolute left-1/2 -translate-x-1/2" 
                style={{ top }}
            >
                <div className="relative">
                     {/* Flash */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-purple-500/50 rounded-full blur-xl animate-ping"></div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center text-purple-200 font-bold text-xl drop-shadow-md animate-bounce">
                         {event.cardName ? `✨ ${event.cardName} ✨` : '✨ 变化 ✨'}
                     </div>
                </div>
            </div>
        );
    }

    return null;
};

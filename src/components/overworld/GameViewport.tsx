import React from 'react';
import { Position } from '@/types/game';

interface GameViewportProps {
  children: React.ReactNode;
  camera: Position;
  mapWidth: number;
  mapHeight: number;
}

export const GameViewport: React.FC<GameViewportProps> = ({
  children,
  camera,
  mapWidth,
  mapHeight
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#1a1a2e'
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: mapWidth,
          height: mapHeight,
          transform: `translate(${-camera.x}px, ${-camera.y}px)`,
          willChange: 'transform'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default GameViewport;

import React from 'react';
import { Position, Direction } from '@/types/game';
import { PLAYER_SPRITE } from '@/types/game';

interface PlayerProps {
  position: Position;
  direction: Direction;
  isMoving: boolean;
  animationFrame: number;
  tileSize: number;
}

export const Player: React.FC<PlayerProps> = ({
  position,
  direction,
  isMoving,
  animationFrame,
  tileSize
}) => {
  // Calculate sprite background position and scaling
  const { row, frames } = PLAYER_SPRITE.directions[direction];
  const frameIndex = isMoving ? frames[animationFrame] : frames[0];
  const scaleX = PLAYER_SPRITE.frameWidth / PLAYER_SPRITE.originalFrameWidth;
  const scaleY = PLAYER_SPRITE.frameHeight / PLAYER_SPRITE.originalFrameHeight;
  const backgroundPositionX = -(frameIndex * PLAYER_SPRITE.originalFrameWidth * scaleX);
  const backgroundPositionY = -(row * PLAYER_SPRITE.originalFrameHeight * scaleY);
  // Original sprite sheet is 1280x567 (9 frames x 4 rows of 142x142)
  const backgroundSizeX = 1280 * scaleX;
  const backgroundSizeY = 567 * scaleY;

  // Center the player on the tile
  const offsetX = PLAYER_SPRITE.frameWidth / 2;
  const offsetY = PLAYER_SPRITE.frameHeight - tileSize / 2; // Feet at center of tile

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x - offsetX,
        top: position.y - offsetY,
        width: PLAYER_SPRITE.frameWidth,
        height: PLAYER_SPRITE.frameHeight,
        backgroundImage: `url(${PLAYER_SPRITE.url})`,
        backgroundPosition: `${backgroundPositionX}px ${backgroundPositionY}px`,
        backgroundSize: `${backgroundSizeX}px ${backgroundSizeY}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        zIndex: 10
      }}
    />
  );
};

export default Player;

import React, { useMemo } from 'react';
import { TileMapData, TileProperties } from '@/types/game';

interface TileMapProps {
  tiles: TileMapData;
  tileSize: number;
  legend: Record<string, TileProperties>;
  layer: 'ground' | 'object' | 'above';
  visibleRange: {
    startTx: number;
    startTy: number;
    endTx: number;
    endTy: number;
  };
}

export const TileMap: React.FC<TileMapProps> = ({
  tiles,
  tileSize,
  legend,
  layer,
  visibleRange
}) => {
  const { startTx, startTy, endTx, endTy } = visibleRange;

  // Generate tile elements for the visible range
  const tileElements = useMemo(() => {
    const elements: React.ReactNode[] = [];

    for (let y = startTy; y < endTy && y < tiles.map.length; y++) {
      const row = tiles.map[y];
      if (!row) continue;

      for (let x = startTx; x < endTx && x < row.length; x++) {
        const tileChar = row[x];
        const tileType = tiles.legend[tileChar];
        
        if (!tileType) continue;

        const properties = legend[tileType];
        if (!properties || properties.layer !== layer) continue;

        elements.push(
          <div
            key={`${layer}-${x}-${y}`}
            style={{
              position: 'absolute',
              left: x * tileSize,
              top: y * tileSize,
              width: tileSize,
              height: tileSize,
              backgroundImage: `url(${properties.sprite})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              imageRendering: 'pixelated'
            }}
          />
        );
      }
    }

    return elements;
  }, [tiles, tileSize, legend, layer, startTx, startTy, endTx, endTy]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: tiles.map[0]?.length * tileSize || 0,
        height: tiles.map.length * tileSize,
        pointerEvents: 'none'
      }}
    >
      {tileElements}
    </div>
  );
};

export default TileMap;

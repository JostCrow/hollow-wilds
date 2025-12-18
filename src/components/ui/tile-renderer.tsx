import React from 'react';

interface TileMap {
  map: string[];
  legend: Record<string, string>;
}

interface TileRendererProps {
  tiles: TileMap;
  tileSize: number;
  className?: string;
}

export const TileRenderer: React.FC<TileRendererProps> = ({
  tiles,
  tileSize,
  className = ''
}) => {
  const { map, legend } = tiles;

  return (
    <div 
      className={`absolute top-0 left-0 ${className}`}
      style={{
        width: `${map[0]?.length * tileSize || 0}px`,
        height: `${map.length * tileSize}px`
      }}
    >
      {map.map((row, y) => (
        <div
          key={y}
          className="flex"
          style={{
            height: `${tileSize}px`,
            width: '100%'
          }}
        >
          {row.split('').map((tileChar, x) => {
            const tileType = legend[tileChar];
            if (!tileType) return null;

            return (
              <div
                key={`${x}-${y}`}
                className="bg-cover bg-center"
                style={{
                  width: `${tileSize}px`,
                  height: `${tileSize}px`,
                  backgroundImage: `url(/tiles/${tileType}.png)`
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};
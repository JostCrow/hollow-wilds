import React from 'react';
import { NPC } from '@/types/game';

interface NPCsProps {
  npcs: NPC[];
  tileSize: number;
}

// Simple NPC sprites - using colored divs as placeholders
// Can be replaced with actual sprite images later
const NPC_SPRITES: Record<string, { color: string; label: string }> = {
  'male': { color: '#4A90E2', label: 'NPC' },
  'female': { color: '#E24A90', label: 'NPC' },
  'nurse-joy': { color: '#FFE4E1', label: 'Nurse' },
  'vendor': { color: '#FFD700', label: 'Shop' },
};

export const NPCs: React.FC<NPCsProps> = ({ npcs, tileSize }) => {
  return (
    <>
      {npcs.map((npc) => {
        const sprite = NPC_SPRITES[npc.sprite] || { color: '#888888', label: '?' };
        const x = npc.position.tx * tileSize;
        const y = npc.position.ty * tileSize;

        return (
          <div
            key={npc.id}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: tileSize,
              height: tileSize,
              backgroundColor: sprite.color,
              border: '2px solid #333',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#333',
              fontWeight: 'bold',
              zIndex: 5
            }}
            title={npc.name}
          >
            {sprite.label}
          </div>
        );
      })}
    </>
  );
};

export default NPCs;

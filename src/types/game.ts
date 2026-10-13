export interface Position {
  x: number;
  y: number;
}

export interface TilePosition {
  tx: number;
  ty: number;
}

export interface TileProperties {
  type: string;
  blocks: boolean;
  layer: "ground" | "object" | "above";
  sprite: string;
  triggersEncounter?: boolean;
  isExit?: boolean;
  healsPokemon?: boolean;
}

export interface TileMapData {
  map: string[];
  legend: Record<string, string>;
}

export interface ProcessedMap {
  width: number;
  height: number;
  tileSize: number;
  collisionMap: boolean[][];
  encounterMap: boolean[][];
  exitMap: (string | null)[][];
  groundTypeMap: string[][];
  tileProperties: Record<string, TileProperties>;
}

export interface Exit {
  id: string;
  area: {
    tx: number;
    ty: number;
    w: number;
    h: number;
  };
  destination: string;
  spawnPoint: string;
}

export interface NPC {
  id: string;
  name: string;
  position: TilePosition;
  sprite: string;
  dialogue: string;
  movement?: {
    type: "static" | "wander" | "patrol";
    range?: number;
    path?: TilePosition[];
  };
  direction?: Direction;
}

export interface MapObject {
  type: string;
  tx: number;
  ty: number;
  w: number;
  h: number;
  blocks: boolean;
  layer: "below" | "above" | "collision";
  stretch?: boolean;
}

export type Direction = "up" | "down" | "left" | "right";

export interface PlayerState {
  position: Position;
  tilePosition: TilePosition;
  direction: Direction;
  isMoving: boolean;
  animationFrame: number;
}

export interface CameraState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportState {
  width: number;
  height: number;
}

export interface RouteData {
  key: string;
  name: string;
  description: string;
  tileSize: number;
  tiles: TileMapData;
  spawn: Record<string, TilePosition>;
  exits: Exit[];
  npcs: NPC[];
  objects: MapObject[];
  creatures?: {
    grass?: Array<{
      name: string;
      level: [number, number];
      chance: number;
    }>;
  };
}

export const TILE_DEFINITIONS: Record<string, TileProperties> = {
  tree: {
    type: "tree",
    blocks: true,
    layer: "object",
    sprite: "/assets/tiles/tree.png",
  },
  grass: {
    type: "grass",
    blocks: false,
    layer: "ground",
    sprite: "/assets/tiles/grass.png",
    triggersEncounter: true,
  },
  "path-full": {
    type: "path",
    blocks: false,
    layer: "ground",
    sprite: "/assets/tiles/path-full.png",
  },
  "path-end": {
    type: "path",
    blocks: false,
    layer: "ground",
    sprite: "/assets/tiles/path-end.png",
  },
  house: {
    type: "house",
    blocks: true,
    layer: "object",
    sprite: "/assets/tiles/house.png",
  },
  "exit-path": {
    type: "exit",
    blocks: false,
    layer: "ground",
    sprite: "/assets/tiles/exit-path.png",
    isExit: true,
  },
  fence: {
    type: "fence",
    blocks: true,
    layer: "object",
    sprite: "/assets/tiles/fence.png",
  },
  "iron-fence": {
    type: "fence",
    blocks: true,
    layer: "object",
    sprite: "/assets/tiles/iron-fence.png",
  },
  "tall-grass": {
    type: "grass",
    blocks: false,
    layer: "above",
    sprite: "/assets/tiles/tall-grass.png",
    triggersEncounter: true,
  },
};

export const PLAYER_SPRITE = {
  url: "/assets/player/male/walk.png",
  frameWidth: 64,
  frameHeight: 64,
  originalFrameWidth: 142,
  originalFrameHeight: 142,
  directions: {
    down: { row: 2, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    left: { row: 1, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    right: { row: 3, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    up: { row: 0, frames: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  },
};

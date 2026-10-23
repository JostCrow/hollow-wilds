export type WorldPoint = { x: number; z: number };
export type OpenWorldPosition = WorldPoint & { worldId: string };
export type CurvePoint = WorldPoint & { height: number };
export type WorldRoad = {
  id: string;
  from: string;
  to: string;
  points: CurvePoint[];
  width: number;
};
export type WorldPlace = WorldPoint & {
  id: string;
  name: string;
  kind: string;
  radius: number;
  level: [number, number];
};
export type WorldBuilding = WorldPoint & {
  id: string;
  placeId: string;
  name: string;
  service: "heal" | "shop" | "home" | "gym" | "champion";
  roof: string;
  halfWidth: number;
  halfDepth: number;
  door: WorldPoint;
};
export type WorldNPC = WorldPoint & {
  id: string;
  placeId: string;
  sourceId: string;
  name: string;
  color: string;
  role: "guide" | "ranger" | "camper";
  dialogue: string;
};
export type WorldResident = WorldPoint & {
  id: string;
  species: string;
  level: number;
  roamRadius: number;
};
export type WorldLandmark = WorldPoint & {
  id: string;
  name: string;
  kind: string;
  placeId: string;
};
export type WorldPickup = WorldPoint & { id: string };
export type WorldBiome = WorldPoint & {
  kind: string;
  radiusX: number;
  radiusZ: number;
  color: string;
  treeDensity: number;
};
export type WorldDefinition = {
  groundColor: string;
  biomes: WorldBiome[];
  heightAt: (x: number, z: number) => number;
  id: string;
  name: string;
  size: number;
  seed: number;
  shore: WorldPoint[];
  shoreSVG: string;
  mapScale: number;
  mapOrigin: number;
  places: WorldPlace[];
  roads: WorldRoad[];
  buildings: WorldBuilding[];
  npcs: WorldNPC[];
  landmarks: WorldLandmark[];
  pickups: WorldPickup[];
  residents: WorldResident[];
  spawn: WorldPoint;
  lake: WorldPoint[];
  river: WorldPoint[];
};
export type WorldSpawn = WorldResident & { shiny: boolean; alpha: boolean };

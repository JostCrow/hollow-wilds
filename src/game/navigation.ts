import {
  BarChart3, BookOpen, Box, Compass, Feather, Map, Settings, Shield, Swords, Users,
} from "lucide-react";
import type { Panel } from "./store";

export const navigation = [
  { key: "adventure", name: "Explore", icon: Compass, path: "/" },
  { key: "team", name: "My team", icon: Users, path: "/team" },
  { key: "journal", name: "Field journal", icon: Feather, path: "/journal" },
  { key: "map", name: "World map", icon: Map, path: "/map" },
  { key: "bestiary", name: "Hollowdex", icon: BookOpen, path: "/pokedex" },
  { key: "moves", name: "Move library", icon: Swords, path: "/moves" },
  { key: "types", name: "Type chart", icon: Shield, path: "/typechart" },
  { key: "stats", name: "Base stats", icon: BarChart3, path: "/stats" },
  { key: "models", name: "3D field guide", icon: Box, path: "/fieldguide" },
  { key: "settings", name: "Settings & saves", icon: Settings, path: "/settings" },
] as const;

export const keyboardPanels: Partial<Record<string, Panel>> = {
  m: "map", h: "bestiary", t: "team",
};
export const pathPanels: Record<string, Panel> = Object.fromEntries(
  navigation.map(({ path, key }) => [path, key]),
);
export const panelPaths = Object.fromEntries(
  navigation.map(({ path, key }) => [key, path]),
);

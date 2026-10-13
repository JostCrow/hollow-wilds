import React, { useEffect, useMemo, useState } from "react";
import type { Creature, Move, MovesFile } from "@/types";
import { Item, ItemContent } from "./ui/item";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import { getTypeColorClass } from "@/lib/typeColors";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  Swords,
  Shield,
  Zap,
  Sparkles,
  ShieldCheck,
  Ruler,
  Weight,
  ChevronRight,
  Info,
  Library,
  Sword,
  Target,
  Flame,
  Activity,
  MoveRight,
  MoveDown
} from "lucide-react";
import { cn } from "@/lib/utils";

const getTypeGradient = (types: string[]): string => {
  if (types.length === 0) return "linear-gradient(135deg, #cbd5e1, #94a3b8)";
  const colors: Record<string, string> = {
    normal: "#A8A878",
    fire: "#F08030",
    water: "#6890F0",
    plant: "#78C850",
    grass: "#78C850",
    electric: "#F8D030",
    ice: "#98D8D8",
    toxic: "#A040A0",
    poison: "#A040A0",
    ground: "#E0C068",
    air: "#A890F0",
    flying: "#A890F0",
    psychic: "#F85888",
    ghost: "#705898",
    dark: "#705848",
    steel: "#B8B8D0",
    metal: "#B8B8D0",
    light: "#F0B6BC",
    bug: "#A8B820",
    rock: "#B8A038",
    dragon: "#7038F8",
    fairy: "#EE99AC",
    fighting: "#C03028",
  };

  const primary = colors[types[0].toLowerCase()] || "#A8A878";
  const secondary = types[1] ? colors[types[1].toLowerCase()] || primary : primary;

  if (types.length === 1) {
    return `linear-gradient(135deg, ${primary} 0%, ${primary}bb 100%)`;
  }
  return `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;
};

const getStatConfig = (statKey: string) => {
  switch (statKey) {
    case "hp": return { color: "bg-red-500", icon: Heart, label: "HP" };
    case "attack": return { color: "bg-orange-500", icon: Swords, label: "ATK" };
    case "defense": return { color: "bg-blue-500", icon: Shield, label: "DEF" };
    case "sp_attack": return { color: "bg-purple-500", icon: Sparkles, label: "SPA" };
    case "sp_defense": return { color: "bg-emerald-500", icon: ShieldCheck, label: "SPD" };
    case "speed": return { color: "bg-yellow-500", icon: Zap, label: "SPE" };
    default: return { color: "bg-slate-500", icon: Info, label: "???" };
  }
};

interface PokedexProps {
  playerPokedex?: Record<string, boolean>;
  onClose?: () => void;
}

export const Pokedex: React.FC<PokedexProps> = ({ playerPokedex, onClose }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate("/");
    }
  };
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [moves, setMoves] = useState<MovesFile | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Data loading
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [creaturesRes, movesRes] = await Promise.all([
          fetch("/data/creatures.json"),
          fetch("/data/moves.json"),
        ]);

        if (!creaturesRes.ok) {
          throw new Error(`Failed to load creatures: ${creaturesRes.status}`);
        }
        if (!movesRes.ok) {
          throw new Error(`Failed to load moves: ${movesRes.status}`);
        }

        const creaturesJson = (await creaturesRes.json()) as Creature[];
        const movesJson = (await movesRes.json()) as MovesFile;

        if (!cancelled) {
          setCreatures(creaturesJson);
          setMoves(movesJson);
          setSelectedIndex(0);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const message =
            e instanceof Error ? e.message : "Unknown error occurred";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCreatures = useMemo(() => {
    return creatures.filter((creature) => {
      const matchesSearch = creature.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === "all" || creature.typing.includes(selectedType as any);
      return matchesSearch && matchesType;
    });
  }, [creatures, searchTerm, selectedType]);

  const selected = useMemo(() => {
    if (!filteredCreatures.length) return null;
    if (selectedIndex < 0 || selectedIndex >= filteredCreatures.length) return null;
    return filteredCreatures[selectedIndex];
  }, [filteredCreatures, selectedIndex]);

  // Clamp selected index when filtered creatures list changes
  useEffect(() => {
    if (filteredCreatures.length === 0) return;
    setSelectedIndex((prev) =>
      prev < 0 ? 0 : prev >= filteredCreatures.length ? filteredCreatures.length - 1 : prev,
    );
  }, [filteredCreatures]);

  // Reset selected index when filters change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm, selectedType]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!filteredCreatures.length) return;

    switch (event.key) {
      case "ArrowUp": {
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      }
      case "ArrowDown": {
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCreatures.length - 1 ? prev + 1 : prev,
        );
        break;
      }
      case "Escape": {
        if (onClose) {
          event.preventDefault();
          onClose();
        }
        break;
      }
      default:
        break;
    }
  };

  const statKeys: Array<{
    key: keyof Creature["base_stats"];
    label: string;
  }> = [
      { key: "hp", label: "HP" },
      { key: "attack", label: "Attack" },
      { key: "defense", label: "Defence" },
      { key: "sp_attack", label: "Special Attack" },
      { key: "sp_defense", label: "Spcial Defence" },
      { key: "speed", label: "Speed" },
    ];

  const renderMoveset = () => {
    if (!selected || !moves) return null;

    const sorted = [...selected.moveset].sort((a, b) => a.level - b.level);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sorted.map((entry, index) => {
          const move: Move | undefined = moves[entry.move_key];

          if (!move) {
            return (
              <Card key={`${entry.move_key}-${entry.level}-${index}`} className="border-destructive/50 bg-destructive/5 p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-destructive">Lv. {entry.level}</span>
                  <Badge variant="destructive">Data Missing</Badge>
                </div>
                <div className="text-lg font-mono">{entry.move_key}</div>
              </Card>
            );
          }

          const categoryColors = {
            physical: "bg-red-500/10 text-red-500 border-red-500/20",
            special: "bg-blue-500/10 text-blue-500 border-blue-500/20",
            status: "bg-slate-500/10 text-slate-500 border-slate-500/20",
          };

          const CategoryIcon = move.category === "physical" ? Swords : move.category === "special" ? Sparkles : Activity;

          return (
            <div
              key={`${entry.move_key}-${entry.level}-${index}`}
              className="group relative overflow-hidden rounded-xl border-2 bg-card hover:bg-muted/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div
                className={cn("absolute top-0 left-0 w-1 h-full opacity-70", getTypeColorClass(move.type).split(' ')[0])}
              />

              <div className="p-4 space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Level {entry.level}</span>
                    </div>
                    <h4 className="text-xl font-black uppercase italic tracking-tighter transition-colors group-hover:text-primary">{move.name}</h4>
                  </div>
                  <div className={cn("p-2 rounded-lg border flex items-center justify-center", categoryColors[move.category as keyof typeof categoryColors])}>
                    <CategoryIcon className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={cn("px-2 py-0.5 text-[10px] font-bold uppercase border-none", getTypeColorClass(move.type))}>
                    {move.type}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase opacity-70">
                    {move.category}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50 border border-border/50 group-hover:bg-background transition-colors">
                    <Flame className="w-3.5 h-3.5 mb-1 text-orange-500" />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Power</span>
                    <span className="text-sm font-mono font-bold leading-tight">{move.power || "—"}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50 border border-border/50 group-hover:bg-background transition-colors">
                    <Target className="w-3.5 h-3.5 mb-1 text-blue-500" />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Acc.</span>
                    <span className="text-sm font-mono font-bold leading-tight">{move.accuracy ? `${move.accuracy}%` : "—"}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50 border border-border/50 group-hover:bg-background transition-colors">
                    <Zap className="w-3.5 h-3.5 mb-1 text-yellow-500" />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">PP</span>
                    <span className="text-sm font-mono font-bold leading-tight">{move.uses}/{move.max_uses}</span>
                  </div>
                </div>

                {move.effect && (
                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 italic font-medium pt-1">
                    {move.effect.type} {move.effect.stat ? `(${move.effect.stat})` : ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  type EvolutionNode = {
    creature: Creature;
    children: EvolutionNode[];
    evolutionMethod?: string;
  };

  const buildEvolutionTree = (creatureName: string): EvolutionNode[] => {
    const visited = new Set<string>();

    const getEvolutionChildren = (
      creature: Creature,
    ): Array<{ creature: Creature; method: string }> => {
      const children: Array<{ creature: Creature; method: string }> = [];

      // Check evolves_to field
      if (creature.evolves_to) {
        const evoCreature = creatures.find(
          (c) => c.name === creature.evolves_to,
        );
        if (evoCreature) {
          const method = creature.evolution_requirements?.[0]
            ? getEvolutionMethodText(creature.evolution_requirements[0])
            : "→";
          children.push({ creature: evoCreature, method });
        }
      }

      // Check evolution_requirements (for split evolutions)
      if (creature.evolution_requirements) {
        for (const req of creature.evolution_requirements) {
          const evoCreature = creatures.find((c) => c.name === req.evolves_to);
          if (
            evoCreature &&
            !children.some((child) => child.creature.name === req.evolves_to)
          ) {
            children.push({
              creature: evoCreature,
              method: getEvolutionMethodText(req),
            });
          }
        }
      }

      return children;
    };

    const buildTree = (creature: Creature): EvolutionNode => {
      if (visited.has(creature.name)) {
        return { creature, children: [] };
      }
      visited.add(creature.name);

      const children = getEvolutionChildren(creature);

      return {
        creature,
        children: children.map((child) => ({
          ...buildTree(child.creature),
          evolutionMethod: child.method,
        })),
      };
    };

    // Find all base creatures that lead to the target
    const findBaseCreatures = (targetName: string): Creature[] => {
      const bases: Creature[] = [];
      const visited = new Set<string>();

      const findParents = (name: string) => {
        if (visited.has(name)) return;
        visited.add(name);

        const parents = creatures.filter(
          (c) =>
            c.evolves_to === name ||
            c.evolution_requirements?.some((req) => req.evolves_to === name),
        );

        if (parents.length === 0) {
          const creature = creatures.find((c) => c.name === name);
          if (creature) bases.push(creature);
        } else {
          for (const parent of parents) {
            findParents(parent.name);
          }
        }
      };

      findParents(targetName);
      return bases;
    };

    const baseCreatures = findBaseCreatures(creatureName);
    return baseCreatures.map((base) => buildTree(base));
  };

  const renderEvolutionTree = (
    nodes: EvolutionNode[],
    level: number = 0,
  ): React.ReactElement => {
    if (nodes.length === 0) return <></>;

    if (nodes.length === 1) {
      const node = nodes[0];
      const isSelected = selected && node.creature.name === selected.name;
      const gradient = getTypeGradient(node.creature.typing);

      return (
        <div key={node.creature.name} className="flex flex-col md:flex-row items-center gap-4">
          <div
            className={cn(
              "group relative flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer transition-all duration-500 overflow-hidden",
              isSelected
                ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-110 z-10"
                : "border-border/50 bg-card hover:border-primary/50 hover:bg-muted/50 hover:shadow-lg"
            )}
            onClick={() => {
              const creatureIndex = creatures.findIndex(
                (c) => c.name === node.creature.name,
              );
              if (creatureIndex !== -1) {
                setSelectedIndex(creatureIndex);
              }
            }}
          >
            {/* Type Background Glow */}
            <div
              className="absolute inset-x-0 top-0 h-12 opacity-15 pointer-events-none transition-transform duration-1000 group-hover:scale-125"
              style={{ background: gradient }}
            />

            <div className="relative">
              {node.creature.sprite && (
                <img
                  src={`/assets/monster/${node.creature.sprite}`}
                  alt={node.creature.name}
                  className={cn(
                    "w-20 h-20 object-contain drop-shadow-md transition-transform duration-500 group-hover:scale-110",
                    isSelected && "animate-float"
                  )}
                />
              )}
              {isSelected && (
                <div className="absolute -top-1 -right-1">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                </div>
              )}
            </div>

            <div className="text-center mt-3 space-y-1">
              <div className="font-black text-xs uppercase italic tracking-tighter transition-colors group-hover:text-primary">
                {node.creature.name}
              </div>
              <div className="flex gap-1 justify-center">
                {node.creature.typing.map((type) => (
                  <div
                    key={type}
                    className={cn(
                      "w-2 h-2 rounded-full shadow-sm",
                      getTypeColorClass(type).split(' ')[0]
                    )}
                    title={type}
                  />
                ))}
              </div>
            </div>
          </div>

          {node.children.length > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-center gap-2">
              <div className="flex flex-col items-center min-w-[100px]">
                {/* Visual Connection */}
                <div className="hidden md:flex items-center w-full">
                  <div className="h-0.5 grow bg-gradient-to-r from-border to-primary/30" />
                  <MoveRight className="w-5 h-5 text-primary/50" />
                  <div className="h-0.5 grow bg-gradient-to-r from-primary/30 to-border" />
                </div>
                <div className="flex md:hidden items-center justify-center h-10">
                  <MoveDown className="w-5 h-5 text-primary/50" />
                </div>

                {node.children.length === 1 && node.children[0].evolutionMethod && (
                  <Badge variant="outline" className="text-[10px] font-bold uppercase py-0 px-2 bg-muted/80 backdrop-blur-sm border-2 whitespace-nowrap shadow-sm mt-1">
                    {node.children[0].evolutionMethod}
                  </Badge>
                )}
              </div>

              <div className="mt-4 md:mt-0">
                {node.children.length === 1 ? (
                  renderEvolutionTree(node.children, level + 1)
                ) : (
                  <div className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-muted/20 border-2 border-dashed border-border/50">
                    <div className="text-[9px] font-black uppercase tracking-widest text-center text-muted-foreground opacity-50">
                      Branched Path
                    </div>
                    <div className="flex flex-row flex-wrap justify-center gap-12">
                      {node.children.map((child) => (
                        <div key={child.creature.name} className="flex flex-col items-center gap-4">
                          <div className="flex flex-col items-center min-w-[80px]">
                            {child.evolutionMethod && (
                              <Badge variant="outline" className="text-[9px] font-black uppercase py-0 px-1.5 bg-background border-2 shadow-sm">
                                {child.evolutionMethod}
                              </Badge>
                            )}
                            <div className="h-6 w-0.5 bg-gradient-to-b from-border to-primary/30" />
                            <MoveDown className="w-4 h-4 text-primary/50 -mt-1" />
                          </div>
                          {renderEvolutionTree([child], level + 1)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-8">
        {nodes.map((node) => (
          <div key={node.creature.name} className="flex flex-col items-center">
            {renderEvolutionTree([node], level)}
          </div>
        ))}
      </div>
    );
  };

  const getEvolutionMethodText = (req: any): string => {
    if (req.type === "level" && req.level) {
      return `Level ${req.level}`;
    } else if (req.type === "stone" && req.stone) {
      return `Use ${req.stone.replace("_", " ")}`;
    }
    return req.type;
  };

  const hasEvolutions = useMemo(() => {
    if (!selected) return false;
    const evolutionTrees = buildEvolutionTree(selected.name);
    return !(
      evolutionTrees.length === 0 ||
      (evolutionTrees.length === 1 &&
        evolutionTrees[0].creature.name === selected.name &&
        evolutionTrees[0].children.length === 0)
    );
  }, [selected, creatures]);

  const renderEvolution = () => {
    if (!selected) return null;

    const evolutionTrees = buildEvolutionTree(selected.name);

    return (
      <div className="flex flex-wrap items-center justify-center gap-4 p-4">
        {renderEvolutionTree(evolutionTrees)}
      </div>
    );
  };

  const renderBaseStats = () => {
    if (!selected) return null;

    const maxStat = 255;

    return (
      <div className="space-y-4">
        <div className="grid gap-3">
          {statKeys.map((stat) => {
            const value = selected.base_stats[stat.key];
            const percentage = (value / maxStat) * 100;
            const config = getStatConfig(stat.key);
            const StatIcon = config.icon;

            return (
              <div key={stat.key} className="space-y-1">
                <div className="flex justify-between items-center text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md text-white shadow-sm", config.color)}>
                      <StatIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-muted-foreground">{config.label}</span>
                  </div>
                  <span className="font-mono font-bold">{value}</span>
                </div>
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                  <div
                    className={cn("h-full transition-all duration-1000 ease-out rounded-full", config.color)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-dashed">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Base Stat Total</span>
            <span className="font-mono font-bold text-lg">{selected.base_stats.total}</span>
          </div>
          <div className="h-3 w-full bg-muted rounded-full overflow-hidden border">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
              style={{ width: `${(selected.base_stats.total / 720) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderAbilities = () => {
    if (!selected) return null;

    return (
      <div className="flex flex-wrap gap-2">
        {selected.abilities && selected.abilities.length > 0 ? (
          selected.abilities.map((ab) => (
            <Badge
              key={ab}
              variant="secondary"
              className="px-4 py-2 text-sm bg-muted/50 hover:bg-muted border border-border/80 transition-colors capitalize"
            >
              <Info className="w-3.5 h-3.5 mr-2 text-primary/70" />
              {ab.replace("-", " ")}
            </Badge>
          ))
        ) : (
          <p className="text-muted-foreground text-sm italic">No abilities listed.</p>
        )}
      </div>
    );
  };

  const renderDetail = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full flex-col gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium animate-pulse">Scanning Bio-Data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full p-8 text-center max-w-md mx-auto flex-col gap-4">
          <div className="p-4 rounded-full bg-destructive/10 text-destructive">
            <Info className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold">Data Link Failed</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">Retry Sync</Button>
        </div>
      );
    }

    if (!selected) {
      return (
        <div className="flex items-center justify-center h-full p-8 text-center flex-col gap-6">
          <div className="p-8 rounded-full bg-muted/50 text-muted-foreground animate-pulse">
            <Library className="w-24 h-24" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Select a Creature</h2>
            <p className="text-muted-foreground max-w-xs">Scan a specimen from the Pokédex logs to retrieve comprehensive data.</p>
          </div>
        </div>
      );
    }

    const isCaught =
      playerPokedex && playerPokedex[selected.name] ? true : false;

    const gradientStyle = {
      background: getTypeGradient(selected.typing),
    };

    return (
      <div className="p-6 grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header Card */}
        <div className="relative overflow-hidden rounded-2xl border shadow-xl group bg-card">
          <div
            className="absolute inset-x-0 top-0 h-40 opacity-30 pointer-events-none transition-transform duration-1000 group-hover:scale-110"
            style={gradientStyle}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background pointer-events-none" />

          <section className="relative flex flex-col md:flex-row gap-8 p-8 items-center md:items-start">
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl group/sprite">
              {selected.sprite && (
                <img
                  src={`/assets/monster/${selected.sprite}`}
                  alt={selected.name}
                  loading="lazy"
                  className="w-48 h-48 object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-float transition-transform group-hover/sprite:scale-110 duration-500"
                />
              )}
            </div>
            <div className="grow flex flex-col gap-5 pt-2">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center w-full gap-4">
                  <span className="text-muted-foreground font-mono text-xl tracking-tighter opacity-70">
                    #{String(creatures.findIndex(c => c.name === selected.name) + 1).padStart(3, '0')}
                  </span>
                  <h2 className="text-5xl font-black tracking-tight uppercase italic drop-shadow-sm">{selected.name}</h2>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex gap-2">
                    {selected.typing.map((type) => (
                      <Badge key={type} className={cn("px-4 py-1 text-sm font-bold shadow-md transform hover:scale-105 transition-transform", getTypeColorClass(type))}>
                        {type}
                      </Badge>
                    ))}
                  </div>

                  <div className="h-4 w-px bg-border mx-2 hidden sm:block" />

                  <div className="flex flex-wrap gap-2">
                    {selected.legendary && <Badge className="bg-amber-500 text-black border-amber-600 font-bold px-3">LEGENDARY</Badge>}
                    {selected.mythical && <Badge className="bg-purple-600 text-white border-purple-700 font-bold px-3">MYTHICAL</Badge>}
                    {isCaught && <Badge className="bg-green-600 text-white border-green-700 font-bold px-3 flex gap-1.5 items-center">
                      <Target className="w-3.5 h-3.5" /> CAUGHT
                    </Badge>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm font-bold">
                <div className="flex gap-2.5 items-center bg-muted/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-border/80 shadow-sm">
                  <Ruler className="w-4 h-4 text-primary" />
                  <span>{selected.height}m</span>
                </div>
                <div className="flex gap-2.5 items-center bg-muted/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-border/80 shadow-sm">
                  <Weight className="w-4 h-4 text-primary" />
                  <span>{selected.weight}kg</span>
                </div>
              </div>

              <div className="relative p-1">
                <p className="text-xl leading-relaxed text-foreground font-medium italic relative z-10">
                  "{selected.description}"
                </p>
                <div className="absolute top-0 -left-2 text-4xl text-primary/10 font-serif">"</div>
              </div>

              {selected.appearance && (
                <div className="flex gap-3 items-center text-muted-foreground bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <Info className="w-5 h-5 shrink-0 text-primary" />
                  <p className="text-sm font-medium">{selected.appearance}</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Abilities & Stats */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="flex flex-col bg-card/50 backdrop-blur-sm border-2">
            <div className="p-6 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Library className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight uppercase">Special Abilities</h3>
              </div>
            </div>
            <div className="p-6 flex-1">
              {renderAbilities()}
            </div>
          </Card>

          <Card className="flex flex-col bg-card/50 backdrop-blur-sm border-2">
            <div className="p-6 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                  <Sword className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight uppercase">Combat Metrics</h3>
              </div>
            </div>
            <div className="p-6 flex-1">
              {renderBaseStats()}
            </div>
          </Card>
        </div>

        <Tabs defaultValue={hasEvolutions ? "evolutions" : "moves"} key={selected.name} className="w-full">
          <TabsList className={cn("grid w-full h-14 bg-muted/50 p-1 border-2", hasEvolutions ? "grid-cols-2" : "grid-cols-1")}>
            {hasEvolutions && (
              <TabsTrigger value="evolutions" className="text-lg font-bold uppercase tracking-wide data-[state=active]:bg-background data-[state=active]:shadow-lg">
                Evolution Path
              </TabsTrigger>
            )}
            <TabsTrigger value="moves" className="text-lg font-bold uppercase tracking-wide data-[state=active]:bg-background data-[state=active]:shadow-lg">
              Move Repository
            </TabsTrigger>
          </TabsList>
          <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
            {hasEvolutions && (
              <TabsContent value="evolutions" className="m-0">
                <Card className="p-8 border-2 bg-card/50 backdrop-blur-sm">
                  {renderEvolution()}
                </Card>
              </TabsContent>
            )}
            <TabsContent value="moves" className="m-0">
              <Card className="p-8 border-2 bg-card/50 backdrop-blur-sm overflow-hidden">
                {renderMoveset()}
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col" tabIndex={0} onKeyDown={handleKeyDown} autoFocus>
      <div className="flex flex-1 min-h-0 border-0">
        {/* Left panel: list */}
        <aside className="w-[250px] border-r flex flex-col h-full overflow-hidden">
          <header className="flex-none border-b p-2 flex justify-between items-center">
            <div>
              <h1 className="text-3xl">Pokédex</h1>
              <p className="text-muted-foreground text-sm">
                ↑/↓ to navigate, click to select, Esc to close.
              </p>
            </div>
            <Button
              onClick={handleBack}
              className="text-sm py-1"
            >
              Back
            </Button>
          </header>

          {/* Search and Filter Controls */}
          <div className="flex-none p-2 border-b space-y-2">
            <Input
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Fire">Fire</SelectItem>
                <SelectItem value="Water">Water</SelectItem>
                <SelectItem value="Ground">Ground</SelectItem>
                <SelectItem value="Air">Air</SelectItem>
                <SelectItem value="Ice">Ice</SelectItem>
                <SelectItem value="Electric">Electric</SelectItem>
                <SelectItem value="Plant">Plant</SelectItem>
                <SelectItem value="Toxic">Toxic</SelectItem>
                <SelectItem value="Metal">Metal</SelectItem>
                <SelectItem value="Light">Light</SelectItem>
                <SelectItem value="Dark">Dark</SelectItem>
                <SelectItem value="Ghost">Ghost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            {loading && <p>Loading creatures...</p>}

            {!loading && error && <p>Error loading data.</p>}

            {!loading && !error && filteredCreatures.length === 0 && (
              <p>No creatures found matching your filters.</p>
            )}

            {!loading &&
              !error &&
              filteredCreatures.map((c, index) => {
                const isSelected = index === selectedIndex;
                const isSeen = playerPokedex && playerPokedex[c.name];
                const originalIndex = creatures.findIndex(creature => creature.name === c.name);

                return (
                  <Item
                    key={`${c.name}-${index}`}
                    variant={isSelected ? "muted" : "default"}
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "rounded-lg mx-2 my-1 border-2 transition-all duration-300 cursor-pointer overflow-hidden group p-0",
                      isSelected ? "border-primary bg-primary/5 shadow-md scale-[1.02]" : "border-transparent hover:border-border hover:bg-muted/50"
                    )}
                  >
                    <ItemContent className="p-3">
                      <div className="flex gap-4 items-center">
                        <div className="relative">
                          <Avatar className="h-14 w-14 border-2 bg-background shadow-inner transition-transform group-hover:scale-110">
                            <AvatarImage
                              src={`/assets/monster/${c.name}.png`}
                              alt={c.name}
                            />
                            <AvatarFallback className="font-bold text-xs">{c.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -top-1 -left-1 bg-background border rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm">
                            {originalIndex + 1}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="font-bold truncate text-base uppercase tracking-tight italic">{c.name}</h4>
                            {isSeen && (
                              <div className="bg-green-600 rounded-full p-0.5 shadow-sm" title="Caught">
                                <Target className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {c.typing.slice(0, 2).map((type) => (
                              <Badge
                                key={type}
                                className={cn("text-[9px] px-1.5 py-0 h-4 uppercase font-black border-none", getTypeColorClass(type))}
                              >
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {isSelected && <ChevronRight className="w-5 h-5 text-primary shrink-0 animate-pulse" />}
                      </div>
                    </ItemContent>
                  </Item>
                );
              })}
          </ScrollArea>
        </aside>

        {/* Right panel: detail */}
        <main className="flex-1 h-full flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 min-h-0">
            {renderDetail()}
          </ScrollArea>
        </main>
      </div>
    </div>
  );
};

export default Pokedex;

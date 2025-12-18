import React, { useEffect, useMemo, useState } from "react";
import type { Creature, Move, MovesFile } from "@/types";
import { Item, ItemContent, ItemDescription, ItemTitle } from "./ui/item";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";
import { getTypeColorClass } from "@/lib/typeColors";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { useSessionStore } from "@/stores/session-store";

interface PokedexProps {
  playerPokedex?: Record<string, boolean>;
  onClose?: () => void;
}

export const Pokedex: React.FC<PokedexProps> = ({ playerPokedex, onClose }) => {
  const { setView } = useSessionStore();
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [moves, setMoves] = useState<MovesFile | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Clamp selected index when creatures list changes
  useEffect(() => {
    if (creatures.length === 0) return;
    setSelectedIndex((prev) =>
      prev < 0 ? 0 : prev >= creatures.length ? creatures.length - 1 : prev,
    );
  }, [creatures]);

  const selected = useMemo(() => {
    if (!creatures.length) return null;
    if (selectedIndex < 0 || selectedIndex >= creatures.length) return null;
    return creatures[selectedIndex];
  }, [creatures, selectedIndex]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!creatures.length) return;

    switch (event.key) {
      case "ArrowUp": {
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      }
      case "ArrowDown": {
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev < creatures.length - 1 ? prev + 1 : prev,
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
      <div className="max-h-[50vh] flex gap-2 flex-wrap">
        {sorted.map((entry, index) => {
          const move: Move | undefined = moves[entry.move_key];

          if (!move) {
            return (
              <Card key={`${entry.move_key}-${entry.level}-${index}`}>
                <div>
                  Lv. {entry.level} - {entry.move_key}
                </div>
                <Badge variant="destructive">Missing move data</Badge>
              </Card>
            );
          }

          return (
            <div
              className="border p-2"
              key={`${entry.move_key}-${entry.level}-${index}`}
            >
              <div>
                <span>{move.name}</span>
              </div>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Type</TableCell>
                    <TableCell>
                      <Badge className={getTypeColorClass(move.type)}>
                        {move.type}
                      </Badge>
                      <Badge variant="secondary">{move.category}</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Level</TableCell>
                    <TableCell>{entry.level}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Power</TableCell>
                    <TableCell>{move.power}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Accuracy</TableCell>
                    <TableCell>{move.accuracy}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">PP</TableCell>
                    <TableCell>
                      {move.uses}/{move.max_uses}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
      return (
        <div key={node.creature.name} className="flex items-center gap-2">
          <div
            className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all ${
              selected && node.creature.name === selected.name
                ? "border-primary bg-primary/10 scale-110"
                : "border-border hover:border-primary hover:bg-muted"
            }`}
            onClick={() => {
              const creatureIndex = creatures.findIndex(
                (c) => c.name === node.creature.name,
              );
              if (creatureIndex !== -1) {
                setSelectedIndex(creatureIndex);
              }
            }}
          >
            {node.creature.sprite && (
              <img
                src={`/assets/monster/${node.creature.sprite}`}
                alt={node.creature.name}
                className="w-16 h-16 object-contain"
              />
            )}
            <div className="text-center mt-2">
              <div className="font-medium text-sm">{node.creature.name}</div>
              {node.creature.typing.map((type: string) => (
                <Badge
                  key={type}
                  className={getTypeColorClass(type)}
                  style={{ transform: "scale(0.7)", margin: "1px" }}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {node.children.length > 0 && (
            <div className="flex flex-col items-center">
              <div className="w-8 h-0.5 bg-border"></div>
              {node.children.length === 1 &&
                node.children[0].evolutionMethod && (
                  <div className="text-xs text-muted-foreground whitespace-nowrap bg-muted px-2 py-1 rounded border">
                    {node.children[0].evolutionMethod}
                  </div>
                )}
              <div className="w-8 h-0.5 bg-border"></div>
            </div>
          )}

          {node.children.length > 0 && (
            <div>
              {node.children.length === 1 ? (
                renderEvolutionTree(node.children, level + 1)
              ) : (
                <div className="flex flex-col gap-4">
                  {node.children.map((child) => (
                    <div
                      key={child.creature.name}
                      className="flex items-center gap-2"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-0.5 bg-border"></div>
                        {child.evolutionMethod && (
                          <div className="text-xs text-muted-foreground whitespace-nowrap bg-muted px-2 py-1 rounded border">
                            {child.evolutionMethod}
                          </div>
                        )}
                        <div className="w-8 h-0.5 bg-border"></div>
                      </div>
                      {renderEvolutionTree([child], level + 1)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Multiple base creatures
    return (
      <div className="flex flex-col gap-4">
        {nodes.map((node) => (
          <div key={node.creature.name}>
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

  const renderEvolution = () => {
    if (!selected) return null;

    const evolutionTrees = buildEvolutionTree(selected.name);

    if (
      evolutionTrees.length === 0 ||
      (evolutionTrees.length === 1 &&
        evolutionTrees[0].creature.name === selected.name &&
        evolutionTrees[0].children.length === 0)
    ) {
      return (
        <>
          <h3>Evolution</h3>
          <p>No evolution data.</p>
        </>
      );
    }

    return (
      <>
        <h3>Evolution Chain</h3>
        <div className="flex flex-wrap items-center justify-center gap-4 p-4">
          {renderEvolutionTree(evolutionTrees)}
        </div>
      </>
    );
  };

  const renderBaseStats = () => {
    if (!selected) return null;

    const maxStat = 200;

    return (
      <>
        <h3>Base Stats</h3>
        <div className="grid gap-2">
          {statKeys.map((stat) => {
            const value = selected.base_stats[stat.key];
            const percentage = (value / maxStat) * 100;
            return (
              <div
                key={stat.key}
                className="grid grid-cols-[100px_500px] gap-2 items-center"
              >
                <span className="text-sm">{stat.label}</span>
                <Progress title={value.toString()} value={percentage} />
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-[100px_500px] gap-2 items-center">
          <span>Total</span>
          <Progress
            title={selected.base_stats.total.toString()}
            value={(selected.base_stats.total / 800) * 100}
          />
        </div>
      </>
    );
  };

  const renderAbilities = () => {
    if (!selected) return null;

    return (
      <>
        <h3>Abilities</h3>
        {selected.abilities && selected.abilities.length > 0 ? (
          <div>
            {selected.abilities.map((ab) => (
              <Badge key={ab} variant="outline">
                {ab}
              </Badge>
            ))}
          </div>
        ) : (
          <p>No abilities listed.</p>
        )}
      </>
    );
  };

  const renderDetail = () => {
    if (loading) {
      return (
        <div>
          <p>Loading Pokédex...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div>
          <p>Failed to load Pokédex data.</p>
          <p>{error}</p>
        </div>
      );
    }

    if (!selected) {
      return (
        <div>
          <p>Select a creature on the left to view details.</p>
        </div>
      );
    }

    const isCaught =
      playerPokedex && playerPokedex[selected.name] ? true : false;

    return (
      <div className="p-4 grid gap-4">
        {/* Header */}
        <section className="flex gap-8 p-8 border rounded-lg">
          <div className="flex flex-col items-end">
            {selected.sprite && (
              <img
                src={`/assets/monster/${selected.sprite}`}
                alt={selected.name}
                loading="lazy"
                className="w-40 animate-float"
              />
            )}
          </div>
          <div className="grow flex flex-col gap-2">
            <div className="flex w-full gap-4">
              <h2 className="text-2xl">{selected.name}</h2>
              {selected.typing.map((type) => (
                <Badge key={type} className={getTypeColorClass(type)}>
                  {type}
                </Badge>
              ))}
              <div>
                {selected.legendary && <Badge>Legendary</Badge>}
                {selected.mythical && <Badge>Mythical</Badge>}
                {isCaught && <Badge>Caught</Badge>}
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex gap-2 items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  className="lucide lucide-ruler w-4 h-4 text-muted-foreground"
                >
                  <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"></path>
                  <path d="m14.5 12.5 2-2"></path>
                  <path d="m11.5 9.5 2-2"></path>
                  <path d="m8.5 6.5 2-2"></path>
                  <path d="m17.5 15.5 2-2"></path>
                </svg>
                {selected.height}m
              </div>
              <div className="flex gap-2 items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  className="lucide lucide-weight w-4 h-4 text-muted-foreground"
                >
                  <circle cx="12" cy="5" r="3"></circle>
                  <path d="M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z"></path>
                </svg>{" "}
                {selected.weight}kg
              </div>
            </div>
            <p>{selected.description}</p>
            {selected.appearance && (
              <p className="text-muted-foreground text-sm">
                {selected.appearance}
              </p>
            )}
          </div>
        </section>

        <section className="flex gap-8 p-8 border rounded-lg">
          {renderAbilities()}
        </section>
        <section className="flex flex-col gap-8 p-8 border rounded-lg">
          {renderBaseStats()}
        </section>

        <Tabs defaultValue="evolutions">
          <TabsList>
            <TabsTrigger value="evolutions">Evolutions</TabsTrigger>
            <TabsTrigger value="moves">Moves</TabsTrigger>
          </TabsList>
          <TabsContent value="evolutions">
            <div>{renderEvolution()}</div>
          </TabsContent>
          <TabsContent value="moves">
            <div>{renderMoveset()}</div>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div tabIndex={0} onKeyDown={handleKeyDown} autoFocus>
      <div className="grid grid-cols-[250px_1fr] border-0">
        {/* Left panel: list */}
        <aside className="max-h-screen border-r">
          <header className="border-b p-2 flex justify-between items-center">
            <div>
              <h1 className="text-3xl">Pokédex</h1>
              <p className="text-muted-foreground text-sm">
                ↑/↓ to navigate, click to select, Esc to close.
              </p>
            </div>
            <Button
              onClick={() => setView("main_menu")}
              className="text-sm py-1"
            >
              Back
            </Button>
          </header>
          <ScrollArea className="h-[calc(100vh-101px)]">
            {loading && <p>Loading creatures...</p>}

            {!loading && error && <p>Error loading data.</p>}

            {!loading && !error && creatures.length === 0 && (
              <p>No creatures found.</p>
            )}

            {!loading &&
              !error &&
              creatures.map((c, index) => {
                const isSelected = index === selectedIndex;
                const isSeen = playerPokedex && playerPokedex[c.name];

                return (
                  <Item
                    key={`${c.name}-${index}`}
                    variant={isSelected ? "muted" : "default"}
                    onClick={() => setSelectedIndex(index)}
                    className="rounded-none flex flex-col cursor-pointer"
                  >
                    <ItemContent className="flex flex-row gap-2 items-start">
                      <div className="flex flex-col gap-2">
                        <Avatar>
                          <AvatarImage
                            src={`/assets/monster/${c.name}.png`}
                            alt={c.name}
                          />
                          <AvatarFallback>{c.name}</AvatarFallback>
                        </Avatar>
                        {isSeen && <Badge variant="outline">S</Badge>}
                        {c.legendary && (
                          <Badge className="bg-cyan-800 text-white">L</Badge>
                        )}
                        {c.mythical && (
                          <Badge className="bg-gray-900 text-white">M</Badge>
                        )}
                      </div>
                      <div>
                        <ItemTitle>
                          {index + 1}. {c.name}
                        </ItemTitle>
                        <ItemDescription>{c.description}</ItemDescription>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.typing.map((type) => (
                            <Badge
                              key={type}
                              className={getTypeColorClass(type)}
                            >
                              {type}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Total: {c.base_stats.total}
                        </div>
                      </div>
                    </ItemContent>
                  </Item>
                );
              })}
          </ScrollArea>
        </aside>

        {/* Right panel: detail */}
        <main>{renderDetail()}</main>
      </div>
    </div>
  );
};

export default Pokedex;

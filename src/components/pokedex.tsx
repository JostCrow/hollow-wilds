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
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "./ui/table";

interface PokedexProps {
  playerPokedex?: Record<string, boolean>;
  onClose?: () => void;
}

export const Pokedex: React.FC<PokedexProps> = ({ playerPokedex, onClose }) => {
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

  const renderEvolution = () => {
    if (!selected) return null;

    const hasMechanic = Boolean(selected.evolution_mechanic);
    const hasRequirements =
      selected.evolution_requirements &&
      selected.evolution_requirements.length > 0;
    const hasDirectEvo = Boolean(selected.evolves_to);

    if (!hasMechanic && !hasRequirements && !hasDirectEvo) {
      return (
        <>
          <h3>Evolution</h3>
          <p>No evolution data.</p>
        </>
      );
    }

    return (
      <>
        <h3>Evolution</h3>
        {hasDirectEvo && (
          <p>
            Evolves to: <strong>{selected.evolves_to}</strong>
          </p>
        )}
        {hasMechanic && <p>Mechanic: {selected.evolution_mechanic}</p>}
        {hasRequirements && (
          <ul>
            {selected.evolution_requirements!.map((req, i) => (
              <li key={i}>
                {req.type === "level" && req.level
                  ? `Level ${req.level} → ${req.evolves_to}`
                  : req.type === "stone" && req.stone
                    ? `Use ${req.stone} → ${req.evolves_to}`
                    : `${req.type} → ${req.evolves_to}`}
              </li>
            ))}
          </ul>
        )}
      </>
    );
  };

  const renderBaseStats = () => {
    if (!selected) return null;

    const maxStat = 200;

    return (
      <>
        <h3>Base Stats</h3>
        {statKeys.map((stat) => {
          const value = selected.base_stats[stat.key];
          const percentage = (value / maxStat) * 100;
          return (
            <div
              key={stat.key}
              className="grid grid-cols-[100px_500px] items-center"
            >
              <span className="text-sm">{stat.label}</span>
              <Progress title={value.toString()} value={percentage} />
            </div>
          );
        })}
        <div className="grid grid-cols-[100px_500px] items-center">
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
        <section className="flex gap-2">
          <div className="grow flex flex-col gap-2">
            <div className="flex w-full gap-2">
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
            <p>{selected.description}</p>
            {selected.appearance && (
              <p className="text-muted-foreground text-sm">
                {selected.appearance}
              </p>
            )}
            <section>{renderAbilities()}</section>
            <section>{renderBaseStats()}</section>
          </div>
          <div className="flex flex-col items-end">
            <div>
              <span>Ht: {selected.height} m</span>
              <span>Wt: {selected.weight} kg</span>
            </div>
            {selected.sprite && (
              <img
                src={`/assets/monster/${selected.sprite}`}
                alt={selected.name}
                loading="lazy"
                className="w-40"
              />
            )}
          </div>
        </section>

        <Separator />

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
          <header className="border-b p-2">
            <h1 className="text-3xl">Pokédex</h1>
            <p className="text-muted-foreground text-sm">
              ↑/↓ to navigate, click to select, Esc to close.
            </p>
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

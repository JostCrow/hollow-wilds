import React, { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { getTypeColorClass } from "@/lib/typeColors";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "@/stores/session-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { cn } from "@/lib/utils";

interface TypeData {
  attackCategory: string;
  defense: {
    physical: number;
    special: number;
  };
  effectiveness: Record<string, number>;
}

interface TypeChartData {
  types: string[];
  data: Record<string, TypeData>;
}

interface Move {
  name: string;
  uses: number;
  max_uses: number;
  power: number;
  accuracy: number;
  type: string;
  category: "physical" | "special";
}

interface MovesData {
  [key: string]: Move;
}

export const TypeChart: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    // Check if we are in the game loop or standalone
    // In this component, we don't have an onClose prop, so we'll check if we should go to main menu or home
    if (window.location.pathname === "/typechart") {
      navigate("/");
    } else {
      useSessionStore.getState().setView("main_menu");
    }
  };
  const [typeChartData, setTypeChartData] = useState<TypeChartData | null>(
    null,
  );
  const [movesData, setMovesData] = useState<MovesData | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [typesResponse, movesResponse] = await Promise.all([
          fetch("/data/types.json"),
          fetch("/data/moves.json"),
        ]);

        if (!typesResponse.ok) {
          throw new Error(`Failed to load type data: ${typesResponse.status}`);
        }
        if (!movesResponse.ok) {
          throw new Error(`Failed to load moves data: ${movesResponse.status}`);
        }

        const typesData = (await typesResponse.json()) as TypeChartData;
        const movesData = (await movesResponse.json()) as MovesData;

        setTypeChartData(typesData);
        setMovesData(movesData);
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Unknown error occurred";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getEffectiveMoves = (targetTypes: string[]) => {
    if (!movesData || !typeChartData || targetTypes.length === 0) return [];

    return Object.entries(movesData)
      .map(([key, move]) => {
        let totalEffectiveness = 1;

        targetTypes.forEach((targetType) => {
          const moveTypeData = typeChartData.data[move.type];
          if (moveTypeData && moveTypeData.effectiveness[targetType] !== undefined) {
            totalEffectiveness *= moveTypeData.effectiveness[targetType];
          }
        });

        return {
          ...move,
          key,
          effectiveness: totalEffectiveness,
        };
      })
      .filter((move) => move.effectiveness > 1)
      .sort((a, b) => {
        if (b.effectiveness !== a.effectiveness) {
          return b.effectiveness - a.effectiveness;
        }
        return b.power - a.power;
      })
      .slice(0, 20);
  };

  const toggleTypeSelection = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : prev.length < 2
          ? [...prev, type]
          : [prev[1], type],
    );
  };

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier === 0) return "bg-red-900/40 text-red-500 font-bold";
    if (multiplier === 0.5) return "bg-orange-900/20 text-orange-400";
    if (multiplier === 2) return "bg-green-900/40 text-green-400 font-bold";
    return "text-gray-500 opacity-40";
  };

  const formatMultiplier = (multiplier: number) => {
    if (multiplier === 0) return "0";
    if (multiplier === 0.5) return "½";
    if (multiplier === 2) return "2";
    return "1";
  };

  if (loading) {
    return (
      <div className="h-screen bg-background flex flex-col justify-center items-center">
        <p className="text-white">Loading Type Chart...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-background flex flex-col justify-center items-center">
        <p className="text-white">Failed to load Type Chart data.</p>
        <p className="text-white">{error}</p>
      </div>
    );
  }

  if (!typeChartData) {
    return (
      <div className="h-screen bg-background flex flex-col justify-center items-center">
        <p className="text-white">No type data available.</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="p-4 bg-muted/30 border-b flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Pokémon Type Dashboard
          </h1>
          <p className="text-sm text-gray-400">
            Analyze effectiveness and type combinations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/moves")}
            variant="outline"
            className="text-sm"
          >
            Move Database
          </Button>
          <Button
            onClick={() => navigate("/stats")}
            variant="outline"
            className="text-sm"
          >
            Pokemon Stats
          </Button>
          <Button
            onClick={handleBack}
            variant="outline"
            className="text-lg py-2"
          >
            Back to Menu
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="matrix" className="h-full flex flex-col">
          <div className="px-4 py-2 bg-muted/10 border-b">
            <TabsList className="bg-background/50 border">
              <TabsTrigger value="matrix">Type Matrix</TabsTrigger>
              <TabsTrigger value="analyzer">Dual Type Analyzer</TabsTrigger>
              <TabsTrigger value="cards">Type Encyclopedia</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <TabsContent value="matrix" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <div className="bg-card border rounded-xl overflow-hidden shadow-2xl">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[120px] border-r font-bold text-xs sticky left-0 z-20 bg-muted/50">
                            DEFENSE \ ATTACK
                          </TableHead>
                          {typeChartData.types.map((atkType) => (
                            <TableHead
                              key={atkType}
                              className="text-center p-0 min-w-[60px]"
                            >
                              <div className="flex flex-col items-center justify-center h-24 -rotate-45">
                                <Badge
                                  className={cn(
                                    getTypeColorClass(atkType),
                                    "text-[10px] px-2 py-0.5",
                                  )}
                                >
                                  {atkType.toUpperCase()}
                                </Badge>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {typeChartData.types.map((defType) => (
                          <TableRow key={defType} className="hover:bg-muted/20">
                            <TableCell className="font-bold text-xs border-r sticky left-0 z-10 bg-card">
                              <Badge
                                className={cn(
                                  getTypeColorClass(defType),
                                  "w-full justify-center",
                                )}
                              >
                                {defType}
                              </Badge>
                            </TableCell>
                            {typeChartData.types.map((atkType) => {
                              const multiplier =
                                typeChartData.data[atkType].effectiveness[
                                defType
                                ] ?? 1;
                              return (
                                <TableCell
                                  key={`${atkType}-${defType}`}
                                  className={cn(
                                    "text-center p-2 border-r last:border-r-0 transition-colors",
                                    getMultiplierColor(multiplier),
                                  )}
                                >
                                  {formatMultiplier(multiplier)}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="analyzer" className="h-full m-0 p-4">
              <ScrollArea className="h-full">
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-muted/20 border-dashed">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase text-gray-400">
                          Select Types
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {typeChartData.types.map((type) => (
                            <Badge
                              key={type}
                              className={cn(
                                getTypeColorClass(type),
                                "cursor-pointer transition-all",
                                selectedTypes.includes(type)
                                  ? "ring-2 ring-white ring-offset-2 ring-offset-background scale-110"
                                  : "opacity-40 hover:opacity-100",
                              )}
                              onClick={() => toggleTypeSelection(type)}
                            >
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase text-primary">
                          Combined Defense
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3">
                          {selectedTypes.length === 0 ? (
                            <p className="text-gray-500 italic">Select up to two types...</p>
                          ) : (
                            selectedTypes.map((type) => (
                              <Badge
                                key={type}
                                className={cn(getTypeColorClass(type), "text-xl px-4 py-2")}
                              >
                                {type}
                              </Badge>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {selectedTypes.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-red-500 flex items-center gap-2">
                            <span>Weaknesses</span>
                            <span className="text-xs font-normal text-gray-500">
                              (Takes more damage)
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {[4, 2].map((mult) => {
                            const types = typeChartData.types.filter((atkType) => {
                              let total = 1;
                              selectedTypes.forEach((defType) => {
                                total *=
                                  typeChartData.data[atkType].effectiveness[
                                  defType
                                  ] ?? 1;
                              });
                              return total === mult;
                            });

                            if (types.length === 0) return null;

                            return (
                              <div key={mult} className="space-y-2">
                                <p className="text-xs font-bold uppercase text-gray-500">
                                  {mult}x Damage
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {types.map((t) => (
                                    <Badge
                                      key={t}
                                      className={cn(getTypeColorClass(t), "px-3")}
                                    >
                                      {t}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-green-500 flex items-center gap-2">
                            <span>Resistances</span>
                            <span className="text-xs font-normal text-gray-500">
                              (Takes less damage)
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {[0.5, 0.25, 0].map((mult) => {
                            const types = typeChartData.types.filter((atkType) => {
                              let total = 1;
                              selectedTypes.forEach((defType) => {
                                total *=
                                  typeChartData.data[atkType].effectiveness[
                                  defType
                                  ] ?? 1;
                              });
                              return total === mult;
                            });

                            if (types.length === 0) return null;

                            return (
                              <div key={mult} className="space-y-2">
                                <p className="text-xs font-bold uppercase text-gray-500">
                                  {mult === 0
                                    ? "Immune (0x)"
                                    : mult === 0.25
                                      ? "0.25x Damage"
                                      : "0.5x Damage"}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {types.map((t) => (
                                    <Badge
                                      key={t}
                                      className={cn(getTypeColorClass(t), "px-3")}
                                    >
                                      {t}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="cards" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeChartData.types.map((type) => {
                    const typeData = typeChartData.data[type];
                    return (
                      <Card
                        key={type}
                        className="group hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-card/40 backdrop-blur-sm border-white/5"
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between">
                            <Badge
                              className={cn(
                                getTypeColorClass(type),
                                "text-lg px-3 py-1 shadow-inner",
                              )}
                            >
                              {type}
                            </Badge>
                            <span className="text-2xl opacity-40 group-hover:opacity-100 transition-opacity drop-shadow-sm">
                              {typeData.attackCategory === "physical"
                                ? "💥"
                                : "✨"}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                                Defense Profile
                              </p>
                              <div className="flex justify-between items-center text-gray-300">
                                <span className="text-xs text-gray-400">Physical:</span>
                                <span className="font-mono">{typeData.defense.physical}x</span>
                              </div>
                              <div className="flex justify-between items-center text-gray-300">
                                <span className="text-xs text-gray-400">Special:</span>
                                <span className="font-mono">{typeData.defense.special}x</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                                Key Strengths
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(typeData.effectiveness)
                                  .filter(([_, m]) => m === 2)
                                  .map(([t]) => (
                                    <Badge
                                      key={t}
                                      className={cn(
                                        getTypeColorClass(t),
                                        "px-1.5 py-0 text-[9px] border-none",
                                      )}
                                    >
                                      {t.toUpperCase()}
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {selectedTypes.length > 0 && (
        <div className="p-4 bg-background border-t">
          <Card className="shadow-lg border-primary/20 bg-primary/5">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <span>Effective Against:</span>
                  <div className="flex gap-1">
                    {selectedTypes.map((type) => (
                      <Badge
                        key={type}
                        className={cn(getTypeColorClass(type), "cursor-pointer")}
                        onClick={() => toggleTypeSelection(type)}
                      >
                        {type} ×
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTypes([])}
                  className="h-8 text-xs"
                >
                  Clear Analysis
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 pt-0">
              <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                {getEffectiveMoves(selectedTypes).map((move) => (
                  <div
                    key={move.key}
                    className="flex flex-col min-w-[140px] p-2 bg-card border rounded-lg shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <Badge className={cn(getTypeColorClass(move.type), "text-[10px] px-1 py-0")}>
                        {move.type}
                      </Badge>
                      <span className="text-[10px] font-bold text-green-500">
                        {move.effectiveness === 4
                          ? "✕4"
                          : move.effectiveness === 2
                            ? "✕2"
                            : `✕${move.effectiveness}`}
                      </span>
                    </div>
                    <span className="text-xs font-semibold truncate mb-1">
                      {move.name}
                    </span>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Power: {move.power}</span>
                      <span>{move.category === "physical" ? "Physical 💥" : "Special ✨"}</span>
                    </div>
                  </div>
                ))}
                {getEffectiveMoves(selectedTypes).length === 0 && (
                  <p className="text-gray-400 text-sm italic">
                    No super-effective moves found for this combination.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TypeChart;

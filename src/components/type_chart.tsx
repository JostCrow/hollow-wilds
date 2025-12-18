import React, { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { getTypeColorClass } from "@/lib/typeColors";
import { Button } from "./ui/button";
import { useSessionStore } from "@/stores/session-store";

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
  const { setView } = useSessionStore();
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
          fetch("/data/moves.json")
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
        
        targetTypes.forEach(targetType => {
          const moveTypeData = typeChartData.data[move.type];
          if (moveTypeData && moveTypeData.effectiveness[targetType]) {
            totalEffectiveness *= moveTypeData.effectiveness[targetType];
          }
        });

        return {
          ...move,
          key,
          effectiveness: totalEffectiveness
        };
      })
      .filter(move => move.effectiveness > 1)
      .sort((a, b) => {
        if (b.effectiveness !== a.effectiveness) {
          return b.effectiveness - a.effectiveness;
        }
        return b.power - a.power;
      })
      .slice(0, 20);
  };

  const toggleTypeSelection = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
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
    <div className="h-screen bg-background p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-white">Type Chart</h1>
        <Button onClick={() => setView("main_menu")} className="text-xl py-2">
          Back
        </Button>
      </div>
      
      {selectedTypes.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Effective Moves Against:</span>
              {selectedTypes.map(type => (
                <Badge 
                  key={type} 
                  className={getTypeColorClass(type)}
                  onClick={() => toggleTypeSelection(type)}
                  style={{ cursor: 'pointer' }}
                >
                  {type}
                </Badge>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedTypes([])}
              >
                Clear
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {getEffectiveMoves(selectedTypes).map((move) => (
                <div key={move.key} className="flex items-center gap-2 p-2 border rounded">
                  <Badge className={getTypeColorClass(move.type)}>
                    {move.type}
                  </Badge>
                  <span className="flex-1">{move.name}</span>
                  <span className="text-sm font-semibold">
                    {move.effectiveness === 4 ? '✕4' : move.effectiveness === 2 ? '✕2' : `✕${move.effectiveness}`}
                  </span>
                  <span className="text-sm text-gray-400">
                    {move.power} {move.category === 'physical' ? '💥' : '✨'}
                  </span>
                </div>
              ))}
            </div>
            {getEffectiveMoves(selectedTypes).length === 0 && (
              <p className="text-gray-400">No super-effective moves found.</p>
            )}
          </CardContent>
        </Card>
      )}

      <ScrollArea className="h-[calc(100vh-100px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {typeChartData.types.map((type) => {
            const typeData = typeChartData.data[type];
            return (
              <Card key={type} className="mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge 
                      className={getTypeColorClass(type)}
                      onClick={() => toggleTypeSelection(type)}
                      style={{ 
                        cursor: 'pointer',
                        opacity: selectedTypes.includes(type) ? 0.7 : 1
                      }}
                    >
                      {type}
                    </Badge>
                    <span className="text-lg">
                      {typeData.attackCategory === "physical" ? "💥" : "✨"}
                    </span>
                    {selectedTypes.includes(type) && (
                      <span className="text-sm text-blue-400">Selected</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Defense</h3>
                      <p>Physical: {typeData.defense.physical}x</p>
                      <p>Special: {typeData.defense.special}x</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Effectiveness</h3>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        {Object.entries(typeData.effectiveness).map(
                          ([targetType, multiplier]) => (
                            <div
                              key={`${type}-${targetType}`}
                              className="flex items-center gap-1"
                            >
                              <Badge
                                variant="outline"
                                className={getTypeColorClass(targetType)}
                              >
                                {targetType}
                              </Badge>
                              <span>
                                {multiplier === 0
                                  ? "❌"
                                  : multiplier === 0.5
                                    ? "½"
                                    : multiplier === 2
                                      ? "✕2"
                                      : "✕1"}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TypeChart;

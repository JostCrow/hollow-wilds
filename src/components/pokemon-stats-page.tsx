import React, { useState, useMemo } from "react";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import { getTypeColorClass } from "@/lib/typeColors";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useNavigate } from "react-router-dom";
import { useGameDataStore } from "@/stores/game-data-store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Heart, Swords, Shield, Zap, Sparkles, ShieldCheck, ArrowUpDown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type SortField = "name" | "hp" | "attack" | "defense" | "sp_attack" | "sp_defense" | "speed" | "total";
type SortDirection = "asc" | "desc";

interface PokemonStats {
  name: string;
  types: string[];
  hp: number;
  attack: number;
  defense: number;
  sp_attack: number;
  sp_defense: number;
  speed: number;
  total: number;
  sprite?: string;
}

const statColors: Record<SortField, string> = {
  name: "text-muted-foreground",
  hp: "text-red-500",
  attack: "text-orange-500",
  defense: "text-blue-500",
  sp_attack: "text-purple-500",
  sp_defense: "text-emerald-500",
  speed: "text-yellow-500",
  total: "text-primary",
};

export const PokemonStatsPage: React.FC = () => {
  const navigate = useNavigate();
  const creatures = useGameDataStore((state) => state.creatures);
  const types = useGameDataStore((state) => state.types);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("total");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const typeList = types?.types || [];

  const pokemonList: PokemonStats[] = useMemo(() => {
    return creatures.map((creature) => ({
      name: creature.name,
      types: creature.typing,
      hp: creature.base_stats.hp,
      attack: creature.base_stats.attack,
      defense: creature.base_stats.defense,
      sp_attack: creature.base_stats.sp_attack,
      sp_defense: creature.base_stats.sp_defense,
      speed: creature.base_stats.speed,
      total: creature.base_stats.total,
      sprite: creature.sprite,
    }));
  }, [creatures]);

  const filteredAndSortedPokemon = useMemo(() => {
    let filtered = pokemonList.filter((pokemon) => {
      const matchesSearch = pokemon.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === "all" || pokemon.types.includes(selectedType);
      
      return matchesSearch && matchesType;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        default:
          comparison = a[sortField] - b[sortField];
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [pokemonList, searchTerm, selectedType, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return <ArrowUpDown className="w-3 h-3" />;
  };

  const getStatBarWidth = (value: number, max: number = 255) => {
    return Math.min((value / max) * 100, 100);
  };

  const getTotalBarColor = (total: number) => {
    if (total >= 600) return "bg-gradient-to-r from-purple-500 to-pink-500";
    if (total >= 500) return "bg-gradient-to-r from-blue-500 to-purple-500";
    if (total >= 400) return "bg-gradient-to-r from-green-500 to-blue-500";
    if (total >= 300) return "bg-gradient-to-r from-yellow-500 to-green-500";
    return "bg-gradient-to-r from-gray-500 to-yellow-500";
  };

  const StatHeader = ({ field, label, icon: Icon }: { field: SortField; label: string; icon: any }) => (
    <TableHead 
      className={cn(
        "cursor-pointer hover:bg-muted/80 transition-colors text-center",
        sortField === field && "bg-muted/60"
      )}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-center gap-1">
        <Icon className={cn("w-3.5 h-3.5", statColors[field])} />
        <span>{label}</span>
        {getSortIcon(field)}
      </div>
    </TableHead>
  );

  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="p-4 bg-muted/30 border-b flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Pokemon Stats
          </h1>
          <p className="text-sm text-gray-400">
            Compare base stats across all species
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/typechart")}
            variant="outline"
            className="text-sm"
          >
            Type Chart
          </Button>
          <Button
            onClick={() => navigate("/moves")}
            variant="outline"
            className="text-sm"
          >
            Move Database
          </Button>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="text-lg py-2"
          >
            Back to Menu
          </Button>
        </div>
      </div>

      <div className="p-4 bg-muted/10 border-b">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
              Search
            </label>
            <Input
              placeholder="Search pokemon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
              Type Filter
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">All Types</option>
              {typeList.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{filteredAndSortedPokemon.length}</span> pokemon found
              {sortField === "total" && sortDirection === "desc" && (
                <span className="ml-2 text-primary">• Sorted by strongest first</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <Card className="bg-card border rounded-xl overflow-hidden shadow-2xl">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="w-[60px] text-center">#</TableHead>
                    <TableHead 
                      className={cn(
                        "cursor-pointer hover:bg-muted/80 transition-colors",
                        sortField === "name" && "bg-muted/60"
                      )}
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        Pokemon
                        {getSortIcon("name")}
                      </div>
                    </TableHead>
                    <TableHead>Type(s)</TableHead>
                    <StatHeader field="hp" label="HP" icon={Heart} />
                    <StatHeader field="attack" label="ATK" icon={Swords} />
                    <StatHeader field="defense" label="DEF" icon={Shield} />
                    <StatHeader field="sp_attack" label="SPA" icon={Sparkles} />
                    <StatHeader field="sp_defense" label="SPD" icon={ShieldCheck} />
                    <StatHeader field="speed" label="SPE" icon={Zap} />
                    <StatHeader field="total" label="TOTAL" icon={Trophy} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedPokemon.map((pokemon, index) => (
                    <TableRow key={pokemon.name} className="hover:bg-muted/20">
                      <TableCell className="text-center text-muted-foreground text-sm font-mono">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {pokemon.sprite && (
                            <img
                              src={`/assets/monster/${pokemon.sprite}`}
                              alt={pokemon.name}
                              className="w-10 h-10 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <span className="font-bold">{pokemon.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {pokemon.types.map((type) => (
                            <Badge
                              key={type}
                              className={cn(
                                getTypeColorClass(type),
                                "px-1.5 py-0 text-[9px] uppercase font-bold border-none"
                              )}
                            >
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-red-500">{pokemon.hp}</span>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-500 rounded-full"
                              style={{ width: `${getStatBarWidth(pokemon.hp)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-orange-500">{pokemon.attack}</span>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${getStatBarWidth(pokemon.attack)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-blue-500">{pokemon.defense}</span>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${getStatBarWidth(pokemon.defense)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-purple-500">{pokemon.sp_attack}</span>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${getStatBarWidth(pokemon.sp_attack)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-emerald-500">{pokemon.sp_defense}</span>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${getStatBarWidth(pokemon.sp_defense)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-yellow-500">{pokemon.speed}</span>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-yellow-500 rounded-full"
                              style={{ width: `${getStatBarWidth(pokemon.speed)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <span className={cn(
                            "font-mono font-bold",
                            pokemon.total >= 600 ? "text-purple-400" :
                            pokemon.total >= 500 ? "text-blue-400" :
                            pokemon.total >= 400 ? "text-green-400" :
                            "text-yellow-400"
                          )}>
                            {pokemon.total}
                          </span>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full", getTotalBarColor(pokemon.total))}
                              style={{ width: `${(pokemon.total / 720) * 100}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAndSortedPokemon.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No pokemon found matching your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default PokemonStatsPage;

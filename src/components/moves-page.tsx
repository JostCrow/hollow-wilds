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
import { Flame, Zap, Target, Activity, Sword, Sparkles, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SortField = "name" | "power" | "accuracy" | "uses" | "type" | "category";
type SortDirection = "asc" | "desc";

interface Move {
  key: string;
  name: string;
  uses: number;
  max_uses: number;
  power: number;
  accuracy: number;
  type: string;
  category: "physical" | "special" | "status";
}

export const MovesPage: React.FC = () => {
  const navigate = useNavigate();
  const moves = useGameDataStore((state) => state.moves);
  const types = useGameDataStore((state) => state.types);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [minPower, setMinPower] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("power");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const typeList = types?.types || [];

  const movesList: Move[] = useMemo(() => {
    if (!moves) return [];
    return Object.entries(moves).map(([key, move]) => ({
      key,
      ...move,
    }));
  }, [moves]);

  const filteredAndSortedMoves = useMemo(() => {
    let filtered = movesList.filter((move) => {
      const matchesSearch = move.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === "all" || move.type === selectedType;
      const matchesCategory = selectedCategory === "all" || move.category === selectedCategory;
      const matchesPower = !minPower || move.power >= parseInt(minPower);
      
      return matchesSearch && matchesType && matchesCategory && matchesPower;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "power":
          comparison = a.power - b.power;
          break;
        case "accuracy":
          comparison = (a.accuracy || 0) - (b.accuracy || 0);
          break;
        case "uses":
          comparison = a.uses - b.uses;
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [movesList, searchTerm, selectedType, selectedCategory, minPower, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "physical":
        return <Sword className="w-4 h-4" />;
      case "special":
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case "physical":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "special":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    }
  };

  if (!moves) {
    return (
      <div className="h-screen bg-background flex flex-col justify-center items-center">
        <p className="text-white">Loading moves data...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="p-4 bg-muted/30 border-b flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Move Database
          </h1>
          <p className="text-sm text-gray-400">
            Browse and filter all available moves
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
            onClick={() => navigate("/stats")}
            variant="outline"
            className="text-sm"
          >
            Pokemon Stats
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-6xl">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
              Search
            </label>
            <Input
              placeholder="Search moves..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
              Type
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

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">All Categories</option>
              <option value="physical">Physical</option>
              <option value="special">Special</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
              Min Power
            </label>
            <Input
              type="number"
              placeholder="Min power level"
              value={minPower}
              onChange={(e) => setMinPower(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <Card className="bg-card border rounded-xl overflow-hidden shadow-2xl">
              <div className="p-4 bg-muted/30 border-b flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Showing {filteredAndSortedMoves.length} moves
                </span>
              </div>
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {sortField === "name" && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort("type")}
                    >
                      <div className="flex items-center gap-1">
                        Type
                        {sortField === "type" && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleSort("category")}
                    >
                      <div className="flex items-center gap-1">
                        Category
                        {sortField === "category" && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/80 transition-colors text-center"
                      onClick={() => handleSort("power")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Flame className="w-3.5 h-3.5" />
                        Power
                        {sortField === "power" && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/80 transition-colors text-center"
                      onClick={() => handleSort("accuracy")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        Accuracy
                        {sortField === "accuracy" && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/80 transition-colors text-center"
                      onClick={() => handleSort("uses")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        PP
                        {sortField === "uses" && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedMoves.map((move, index) => (
                    <TableRow key={move.key} className="hover:bg-muted/20">
                      <TableCell className="text-muted-foreground text-sm">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{move.name}</TableCell>
                      <TableCell>
                        <Badge className={cn(getTypeColorClass(move.type), "px-2 py-0.5 text-[10px] uppercase font-bold")}>
                          {move.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium w-fit", getCategoryStyle(move.category))}>
                          {getCategoryIcon(move.category)}
                          <span className="capitalize">{move.category}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {move.power || "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {move.accuracy ? `${move.accuracy}%` : "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {move.uses}/{move.max_uses}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAndSortedMoves.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No moves found matching your filters.
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

export default MovesPage;

import { create } from "zustand";
import { Routes, RoutesSchema, Creature, MovesFile, TypeChart, TypeChartSchema } from "@/types";

type LoadStatus = "idle" | "loading" | "loaded" | "error";

type GameDataStoreState = {
    routes: Routes | null;
    creatures: Creature[];
    moves: MovesFile | null;
    types: TypeChart | null;
    status: LoadStatus;
    error?: string;
    loadRoutes: () => Promise<void>;
};

export const useGameDataStore = create<GameDataStoreState>((set, get) => ({
    routes: null,
    creatures: [],
    moves: null,
    types: null,
    status: "idle",
    error: undefined,
    loadRoutes: async () => {
        const { status } = get();
        if (status === "loading" || status === "loaded") {
            return;
        }

        set({ status: "loading", error: undefined });

        try {
            const [routesRes, creaturesRes, movesRes, typesRes] = await Promise.all([
                fetch("/data/routes.json"),
                fetch("/data/creatures.json"),
                fetch("/data/moves.json"),
                fetch("/data/types.json"),
            ]);

            if (!routesRes.ok) throw new Error(`Failed to load routes (${routesRes.status})`);
            if (!creaturesRes.ok) throw new Error(`Failed to load hollowings (${creaturesRes.status})`);
            if (!movesRes.ok) throw new Error(`Failed to load moves (${movesRes.status})`);
            if (!typesRes.ok) throw new Error(`Failed to load types (${typesRes.status})`);

            const routesJson = await routesRes.json();
            const creaturesJson = await creaturesRes.json();
            const movesJson = await movesRes.json();
            const typesJson = await typesRes.json();

            const parsedRoutes = RoutesSchema.safeParse(routesJson);

            if (!parsedRoutes.success) {
                console.error("Zod Validation Error (Routes):", parsedRoutes.error);
                throw new Error("Routes data did not match schema");
            }

            // Simple validation for types
            const parsedTypes = TypeChartSchema.safeParse(typesJson);
            if (!parsedTypes.success) {
                console.error("Zod Validation Error (Types):", parsedTypes.error);
                // Warning only for now to avoid crashing if schema is slightly off
            }

            set({
                routes: parsedRoutes.data,
                creatures: creaturesJson as Creature[],
                moves: movesJson as MovesFile,
                types: typesJson as TypeChart,
                status: "loaded"
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            console.error("Unable to load game data:", error);
            set({ error: message, status: "error" });
        }
    },
}));


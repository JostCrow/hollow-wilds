import { create } from "zustand";
import { Routes, RoutesSchema } from "@/types";

type LoadStatus = "idle" | "loading" | "loaded" | "error";

type GameDataStoreState = {
    routes: Routes | null;
    status: LoadStatus;
    error?: string;
    loadRoutes: () => Promise<void>;
};

export const useGameDataStore = create<GameDataStoreState>((set, get) => ({
    routes: null,
    status: "idle",
    error: undefined,
    loadRoutes: async () => {
        const { status } = get();
        if (status === "loading" || status === "loaded") {
            return;
        }

        set({ status: "loading", error: undefined });

        try {
            const response = await fetch("/data/routes.json");
            if (!response.ok) {
                throw new Error(`Failed to load routes (${response.status})`);
            }

            const json = await response.json();
            const parsed = RoutesSchema.safeParse(json);
            if (!parsed.success) {
                console.error("Zod Validation Error:", parsed.error);
                throw new Error("Routes data did not match schema");
            }

            set({ routes: parsed.data, status: "loaded" });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            console.error("Unable to load routes:", error);
            if (error instanceof Error && error.message === "Routes data did not match schema") {
                // We don't have the zod error object here because it was swallowed in the try block
                // Let's modify the try block to catch ZodError or log parsed.error
            }
            set({ error: message, status: "error" });
        }
    },
}));


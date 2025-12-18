export type ElementType =
    | "Normal"
    | "Fire"
    | "Water"
    | "Ground"
    | "Air"
    | "Ice"
    | "Electric"
    | "Plant"
    | "Toxic"
    | "Metal"
    | "Light"
    | "Dark"
    | "Ghost";

const TYPE_TO_TW: Record<ElementType, string> = {
    Normal: "bg-zinc-400 text-zinc-950",
    Fire: "bg-orange-500 text-white",
    Water: "bg-sky-500 text-white",
    Ground: "bg-amber-700 text-white",
    Air: "bg-cyan-200 text-cyan-950",
    Ice: "bg-cyan-300 text-cyan-950",
    Electric: "bg-yellow-400 text-yellow-950",
    Plant: "bg-emerald-500 text-white",
    Toxic: "bg-purple-600 text-white",
    Metal: "bg-slate-400 text-slate-950",
    Light: "bg-yellow-100 text-yellow-950",
    Dark: "bg-zinc-900 text-zinc-50",
    Ghost: "bg-violet-700 text-white",
};

/**
 * Returns Tailwind classes for a given element type.
 * If you need a different shape (e.g. only bg, or border, etc.), tell me.
 */
export function elementTypeToTw(type: ElementType): string {
    return TYPE_TO_TW[type];
}

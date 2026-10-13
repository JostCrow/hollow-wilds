import { useSessionStore } from "@/stores/session-store";
import { usePlayerStore } from "@/stores/player-store";
import { useGameDataStore } from "@/stores/game-data-store";
import { Play, Zap, BookOpen, Layers, Gamepad2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function MainMenu() {
  const navigate = useNavigate();
  const { setView, setGameMode } = useSessionStore();
  const hydrated = usePlayerStore((state) => state.hydrated);
  const { creatures } = useGameDataStore();

  if (!hydrated || !creatures) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-primary font-black uppercase tracking-widest animate-pulse">Initializing Interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden p-6 perspective-1000">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-red-500/5 blur-[120px] animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(15,23,42,0)_0%,rgba(2,6,23,1)_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center gap-12 animate-in fade-in zoom-in duration-1000">
        {/* Branding Area */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md mb-4 group hover:border-primary/50 transition-colors cursor-default">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Version 2.0 Premium Edition</span>
          </div>
          <h1 className="text-7xl md:text-8xl font-black italic tracking-tighter uppercase">
            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">The Hollow</span>
            <span className="block -mt-4 text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-primary/40">Wilds</span>
          </h1>
          <p className="max-w-md mx-auto text-muted-foreground font-medium text-sm md:text-base leading-relaxed opacity-60">
            Venture into the unknown. Discover creatures, forge bonds, and survive the wilds.
          </p>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <div
            onClick={() => {
              setGameMode("new_game");
              setView("character_select");
            }}
            className="group relative h-64 rounded-3xl border-2 border-primary/20 bg-primary/5 backdrop-blur-xl p-8 cursor-pointer overflow-hidden transition-all duration-500 hover:border-primary/50 hover:bg-primary/10 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(var(--primary),0.1)]"
          >
            <div className="absolute top-0 right-0 p-8 translate-x-4 -translate-y-4 opacity-10 group-hover:opacity-20 transition-all duration-500 group-hover:translate-x-0 group-hover:translate-y-0">
              <Play className="w-32 h-32 fill-primary stroke-none" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="bg-primary/20 w-fit p-3 rounded-2xl border border-primary/30">
                <Play className="w-8 h-8 text-primary fill-primary" />
              </div>
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter transition-colors group-hover:text-primary">Adventure</h2>
                <p className="text-sm text-muted-foreground font-medium opacity-80 mt-1">Begin a new journey in the digital wilderness.</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => {
              setGameMode("infinite_battle");
              setView("character_select");
            }}
            className="group relative h-64 rounded-3xl border-2 border-red-500/20 bg-red-500/5 backdrop-blur-xl p-8 cursor-pointer overflow-hidden transition-all duration-500 hover:border-red-500/50 hover:bg-red-500/10 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(239,68,68,0.1)]"
          >
            <div className="absolute top-0 right-0 p-8 translate-x-4 -translate-y-4 opacity-10 group-hover:opacity-20 transition-all duration-500 group-hover:translate-x-0 group-hover:translate-y-0">
              <Zap className="w-32 h-32 fill-red-500 stroke-none" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="bg-red-500/20 w-fit p-3 rounded-2xl border border-red-500/30">
                <Zap className="w-8 h-8 text-red-500 fill-red-500" />
              </div>
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter transition-colors group-hover:text-red-500">Battle</h2>
                <p className="text-sm text-muted-foreground font-medium opacity-80 mt-1">Conquer the Infinite Battle Arena and prove your skills.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Tools Area */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
          <button
            disabled
            className="flex items-center gap-3 p-4 rounded-2xl border border-border/50 bg-muted/20 backdrop-blur-sm opacity-50 cursor-not-allowed transition-all"
          >
            <Gamepad2 className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Resume</span>
          </button>

          <button
            onClick={() => navigate("/bestiary")}
            className="group flex items-center gap-3 p-4 rounded-2xl border border-border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-muted/50 hover:-translate-y-1"
          >
            <BookOpen className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest group-hover:text-primary transition-colors">Bestiary</span>
          </button>

          <button
            onClick={() => navigate("/typechart")}
            className="group flex items-center gap-3 p-4 rounded-2xl border border-border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-muted/50 hover:-translate-y-1"
          >
            <Layers className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest group-hover:text-primary transition-colors">Type Chart</span>
          </button>

          <button
            onClick={() => navigate("/stats")}
            className="group flex items-center gap-3 p-4 rounded-2xl border border-border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-muted/50 hover:-translate-y-1"
          >
            <Sparkles className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest group-hover:text-primary transition-colors">Stats</span>
          </button>

          <button
            onClick={() => navigate("/moves")}
            className="group flex items-center gap-3 p-4 rounded-2xl border border-border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-muted/50 hover:-translate-y-1 col-span-2 md:col-span-4"
          >
            <Zap className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest group-hover:text-primary transition-colors">Move Database</span>
          </button>
        </div>

        {/* Footer Info */}
        <div className="pt-8 opacity-40 hover:opacity-100 transition-opacity">
          <div className="flex gap-8 items-center justify-center">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase text-primary mb-1">Creatures Found</span>
              <span className="text-xl font-black italic">{creatures.length}</span>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase text-primary mb-1">Wilderness Rank</span>
              <span className="text-xl font-black italic">S-CLASS</span>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase text-primary mb-1">Server Status</span>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-black uppercase">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


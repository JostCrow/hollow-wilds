interface LoadingProps {
  progress: number;
}

export function Loading({ progress }: LoadingProps) {
  return (
    <div className="fixed top-0 left-0 w-full h-full bg-background flex flex-col justify-center items-center z-50">
      <img
        src="/logo.png"
        alt="Pokémon Browser"
        className="w-48 h-48 mb-4 animate-pulse"
      />
      <div className="text-2xl mb-2 text-white">Loading Pokémon Browser...</div>
      <div className="w-72 h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-white transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

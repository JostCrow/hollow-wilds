export const getTypeColorClass = (type: string): string => {
  switch (type.toLowerCase()) {
    case "normal":
      return "bg-gray-300 text-black";
    case "fire":
      return "bg-red-500 text-white";
    case "water":
      return "bg-blue-500 text-white";
    case "plant":
      return "bg-green-500 text-white";
    case "electric":
      return "bg-yellow-400 text-black";
    case "ice":
      return "bg-cyan-300 text-black";
    case "toxic":
      return "bg-purple-500 text-white";
    case "ground":
      return "bg-yellow-700 text-white";
    case "air":
      return "bg-indigo-300 text-black";
    case "psychic":
      return "bg-pink-500 text-white";
    case "ghost":
      return "bg-indigo-800 text-white";
    case "dark":
      return "bg-gray-800 text-white";
    case "steel":
      return "bg-gray-500 text-white";
    case "light":
      return "bg-pink-200 text-black";
    default:
      return "bg-slate-300 text-black";
  }
};

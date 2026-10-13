import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: ".",
  base: "./",
  server: {
    port: 3003,
    open: false,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@/types": path.resolve(import.meta.dirname, "./src/types"),
      "@/data": path.resolve(import.meta.dirname, "./src/data"),
      "@/services": path.resolve(import.meta.dirname, "./src/services"),
      "@/systems": path.resolve(import.meta.dirname, "./src/systems"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rolldownOptions: {
      input: "./index.html",
    },
  },
  publicDir: "public",
});

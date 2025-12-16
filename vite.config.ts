import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: ".",
  base: "./",
  server: {
    port: 3003,
    open: true,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/types": path.resolve(__dirname, "./src/types"),
      "@/data": path.resolve(__dirname, "./src/data"),
      "@/services": path.resolve(__dirname, "./src/services"),
      "@/systems": path.resolve(__dirname, "./src/systems"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: "./index.html",
    },
  },
  assetsInclude: ["**/*.json"],
  publicDir: "assets",
});

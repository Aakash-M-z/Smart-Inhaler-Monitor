/**
 * Vite configuration for the Smart Inhaler Monitor frontend.
 *
 * Builds a React + TypeScript SPA with Tailwind CSS.
 * The dev server proxies /api requests to the backend at http://localhost:5000.
 *
 * This system simulates Edge AI locally.
 * In real-world implementation, TensorFlow Lite can be used for on-device inference.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Use PORT env var if provided (e.g. in CI/CD), otherwise default to 5173 for local dev
const port = Number(process.env.PORT ?? "5173");

// BASE_PATH allows deploying to a sub-path (e.g. /app/). Defaults to "/" for local dev.
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // "@" maps to the src directory for clean imports like "@/components/..."
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    // Proxy API calls to the backend server during development
    // This avoids CORS issues when running frontend and backend separately
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
  },
});

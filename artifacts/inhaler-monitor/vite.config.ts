/**
 * Vite configuration for the Smart Inhaler Monitor frontend.
 *
 * Production:  VITE_API_URL is set to https://smart-inhaler-monitor.onrender.com
 *              No proxy needed — setBaseUrl() in main.tsx points directly to Render.
 *
 * Development: VITE_API_URL is empty, Vite proxy forwards /api → localhost:5000.
 */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load env vars so we can read VITE_API_URL at config time
  const env = loadEnv(mode, process.cwd(), "");

  const port = Number(env.PORT ?? "5173");
  const basePath = env.BASE_PATH ?? "/";
  const apiUrl = env.VITE_API_URL ?? "";

  return {
    base: basePath,

    plugins: [
      react(),
      tailwindcss(),
    ],

    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },

    root: path.resolve(import.meta.dirname),

    build: {
      // Vercel expects output in "dist" — we use dist/public internally
      // but vercel.json maps outputDirectory to dist/public
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      // Raise chunk size warning threshold for production
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Split vendor chunks for better caching
          manualChunks: {
            vendor: ["react", "react-dom"],
            ui: ["@radix-ui/react-dialog", "@radix-ui/react-toast", "lucide-react"],
            charts: ["recharts"],
            query: ["@tanstack/react-query"],
          },
        },
      },
    },

    server: {
      port,
      host: "0.0.0.0",
      // Dev proxy: only active when VITE_API_URL is not set (local dev)
      ...(apiUrl
        ? {}
        : {
          proxy: {
            "/api": {
              target: "http://localhost:5000",
              changeOrigin: true,
            },
          },
        }),
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },

    preview: {
      port,
      host: "0.0.0.0",
    },
  };
});

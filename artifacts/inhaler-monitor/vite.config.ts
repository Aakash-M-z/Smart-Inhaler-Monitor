/**
 * Vite configuration for the Smart Inhaler Monitor frontend.
 *
 * Production:  VITE_API_URL = https://smart-inhaler-monitor.onrender.com
 *              setBaseUrl() in main.tsx points all /api/* calls to Render.
 *
 * Development: VITE_API_URL is empty, Vite proxy forwards /api → localhost:5000.
 */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
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
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,

      // Disable sourcemaps in production — removes the Rollup sourcemap
      // resolution warning caused by third-party packages (e.g. @radix-ui)
      // that ship sourcemaps with empty sourceRoot fields.
      sourcemap: false,

      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            ui: ["@radix-ui/react-dialog", "@radix-ui/react-toast", "lucide-react"],
            charts: ["recharts"],
            query: ["@tanstack/react-query"],
          },
        },
        // Suppress sourcemap warnings from third-party packages that ship
        // broken/incomplete sourcemaps (e.g. @radix-ui/* with empty sourceRoot)
        onwarn(warning, defaultHandler) {
          if (warning.code === "SOURCEMAP_ERROR") return;
          if (warning.message?.includes("sourcemap")) return;
          defaultHandler(warning);
        },
      },
    },

    server: {
      port,
      host: "0.0.0.0",
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

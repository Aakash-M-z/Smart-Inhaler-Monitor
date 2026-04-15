/**
 * Application entry point — Smart Inhaler Monitor.
 *
 * API base URL resolution:
 *   Production (Vercel):  VITE_API_URL = https://smart-inhaler-monitor.onrender.com
 *                         setBaseUrl() points all /api/* calls to Render backend.
 *
 *   Development (local):  VITE_API_URL is empty.
 *                         Vite proxy forwards /api → http://localhost:5000.
 *
 * This system simulates Edge AI locally using rule-based inference.
 * In real-world deployment, this would be replaced by a TensorFlow Lite model
 * running on the inhaler device (ESP32 or similar microcontroller).
 */
import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// VITE_API_URL is injected at build time by Vite from the environment.
// In production (Vercel), set this to: https://smart-inhaler-monitor.onrender.com
// In development, leave it empty — the Vite dev server proxy handles /api routing.
const apiBase = import.meta.env.VITE_API_URL ?? "";

if (apiBase) {
    // Strip trailing slash to avoid double-slash in URLs like //api/stats
    setBaseUrl(apiBase.replace(/\/+$/, ""));
}

createRoot(document.getElementById("root")!).render(<App />);

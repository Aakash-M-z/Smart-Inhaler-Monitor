/**
 * Application entry point.
 *
 * Sets the API base URL to http://localhost:5000 for local development.
 * In production, the Vite proxy handles /api routing so no base URL is needed.
 *
 * This system simulates Edge AI locally.
 * In real-world implementation, TensorFlow Lite can be used for on-device inference.
 */
import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Point the API client to the backend server.
// In development, Vite proxies /api → http://localhost:5000 automatically.
// When running without the Vite dev server (e.g. serving the built frontend
// separately), set VITE_API_BASE_URL in your .env to override this.
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
if (apiBase) {
    setBaseUrl(apiBase);
}

createRoot(document.getElementById("root")!).render(<App />);

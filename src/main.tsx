import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

function registerPwa() {
  if (!import.meta.env.PROD) return;
  try {
    registerSW({
      immediate: true,
      onRegisterError(err) {
        console.error("Symph: service worker registration failed", err);
      }
    });
  } catch (err) {
    console.error("Symph: service worker setup failed", err);
  }
}

queueMicrotask(registerPwa);

const baseUrl = import.meta.env.BASE_URL;
const useHashOnPages = baseUrl !== "/" && baseUrl !== "";

const basename =
  baseUrl === "/" || baseUrl === "" ? undefined : baseUrl.replace(/\/$/, "");

const Router = useHashOnPages ? HashRouter : BrowserRouter;
const routerProps = useHashOnPages ? {} : { basename };

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router {...routerProps}>
      <App />
    </Router>
  </StrictMode>
);

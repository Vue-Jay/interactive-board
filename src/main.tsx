import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import "./interactiveCursor.css";
import "./settingsCursorFix.css";

type ErrorBoundaryState = { error: Error | null };

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("InteractiveBoard render error", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "system-ui, sans-serif", color: "#202331" }}>
          <h1 style={{ marginTop: 0 }}>Не удалось запустить интерфейс</h1>
          <p>Приложение поймало ошибку вместо пустого белого экрана.</p>
          <pre style={{ whiteSpace: "pre-wrap", padding: 16, borderRadius: 12, background: "#f3f4f8" }}>
            {this.state.error.message || String(this.state.error)}
          </pre>
          <button type="button" onClick={() => window.location.reload()} style={{ padding: "10px 14px", cursor: "pointer" }}>
            Перезагрузить страницу
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById("root");
if (!root) {
  document.body.innerHTML = '<div style="padding:32px;font-family:system-ui">Ошибка: в index.html не найден элемент #root.</div>';
  throw new Error("Не найден корневой элемент #root");
}

createRoot(root).render(<ErrorBoundary><App /></ErrorBoundary>);

const APP_BUILD_VERSION = "245";
const UPDATE_RELOAD_GUARD = "onlinerepetitor.legacy-shell-cleanup.v245";

async function clearLegacyAppShell() {
  if (!("serviceWorker" in navigator)) return false;
  const hadController = !!navigator.serviceWorker.controller;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
  return hadController || registrations.length > 0;
}

let lastBuildCheckAt = 0;
let buildCheckInFlight: Promise<void> | null = null;

function checkForNewBuild(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastBuildCheckAt < 60_000) return buildCheckInFlight ?? Promise.resolve();
  if (buildCheckInFlight) return buildCheckInFlight;
  lastBuildCheckAt = now;
  buildCheckInFlight = (async () => {
  try {
    const response = await fetch(`/version.json?t=${now}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!response.ok) return;
    const payload = await response.json() as { version?: string };
    if (payload.version && payload.version !== APP_BUILD_VERSION) {
      window.dispatchEvent(new CustomEvent("or-build-available", { detail: { version: payload.version } }));
    }
  } catch {
    // Offline/temporary network failure should not interrupt an active lesson.
  } finally {
    buildCheckInFlight = null;
  }
  })();
  return buildCheckInFlight;
}

window.addEventListener("load", () => {
  // Clean up obsolete service workers/caches without force-reloading an active lesson.
  // The next normal navigation will naturally use the clean app shell.
  void clearLegacyAppShell()
    .then((hadLegacyShell) => {
      if (hadLegacyShell) sessionStorage.setItem(UPDATE_RELOAD_GUARD, "1");
      void checkForNewBuild(true);
    })
    .catch((error) => console.warn("Legacy app-shell cleanup failed", error));
});

// Build checks are deliberately sparse and never reload the current page.
// An online lesson must not jump/restart just because a deployment happened.
window.addEventListener("focus", () => { void checkForNewBuild(); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void checkForNewBuild();
});
window.setInterval(() => { void checkForNewBuild(); }, 5 * 60_000);
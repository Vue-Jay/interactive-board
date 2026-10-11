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

const isConfirmationPage = window.location.pathname === "/auth/confirmed" || new URLSearchParams(window.location.search).get("email_confirmation") === "1";
const confirmParams = new URLSearchParams(window.location.search);
const confirmHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const confirmationError = confirmParams.get("error_description") || confirmHash.get("error_description");
createRoot(root).render(
  isConfirmationPage
    ? <main style={{minHeight:"100dvh",display:"grid",placeItems:"center",background:"#f5f7fc",fontFamily:"system-ui,sans-serif",padding:24}}>
        <section style={{maxWidth:460,padding:36,borderRadius:20,background:"white",boxShadow:"0 8px 40px #14234d18",textAlign:"center"}}>
          <h1>{confirmationError ? "Не удалось подтвердить почту" : "Почта подтверждена"}</h1>
          <p>{confirmationError || "Адрес электронной почты подтверждён. Теперь можно закрыть эту вкладку и войти в OnlineRepetitor."}</p>
        </section>
      </main>
    : <ErrorBoundary><App /></ErrorBoundary>
);

const UPDATE_RELOAD_GUARD = "onlinerepetitor.legacy-shell-cleanup.v246";

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

window.addEventListener("load", () => {
  // Clean up obsolete service workers/caches without force-reloading an active lesson.
  // The next normal navigation will naturally use the clean app shell.
  void clearLegacyAppShell()
    .then((hadLegacyShell) => {
      if (hadLegacyShell) sessionStorage.setItem(UPDATE_RELOAD_GUARD, "1");
    })
    .catch((error) => console.warn("Legacy app-shell cleanup failed", error));
});

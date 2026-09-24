import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

type ErrorBoundaryState = {
  error: Error | null;
};

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("InteractiveBoard render error", error, info);
  }

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

createRoot(root).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

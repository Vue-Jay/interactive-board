export type DeveloperPreferences = {
  showInkDiagnostics: boolean;
  showBoardDiagnostics: boolean;
  showPerformanceDiagnostics: boolean;
};
const KEY = "onlinerepetitor.developer-preferences.v1";
const defaults: DeveloperPreferences = {
  showInkDiagnostics: false,
  showBoardDiagnostics: false,
  showPerformanceDiagnostics: false,
};
export function readDeveloperPreferences(): DeveloperPreferences {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<DeveloperPreferences>;
    return {
      showInkDiagnostics: raw.showInkDiagnostics === true,
      showBoardDiagnostics: raw.showBoardDiagnostics === true,
      showPerformanceDiagnostics: raw.showPerformanceDiagnostics === true,
    };
  } catch { return {...defaults}; }
}
export function writeDeveloperPreferences(next: DeveloperPreferences) {
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("onlinerepetitor:developer-preferences"));
}

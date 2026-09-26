export type FutureFeatureKey = "billing" | "ai";

const KEY = "onlinerepetitor.future-features.v186";

type FutureFeatureState = Record<FutureFeatureKey, boolean>;

const defaults: FutureFeatureState = {
  billing: false,
  ai: false,
};

export function getFutureFeatures(): FutureFeatureState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<FutureFeatureState>;
    return {
      billing: parsed.billing === true,
      ai: parsed.ai === true,
    };
  } catch {
    return { ...defaults };
  }
}

export function setFutureFeature(key: FutureFeatureKey, enabled: boolean) {
  const next = { ...getFutureFeatures(), [key]: enabled };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("onlinerepetitor:future-features", { detail: next }));
  return next;
}

export const futureFeatureLabels: Record<FutureFeatureKey, string> = {
  billing: "Платежи и тарифы",
  ai: "ИИ-функции",
};

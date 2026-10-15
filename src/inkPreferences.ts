/**
 * Local, per-account drawing-tool settings for classic InteractiveBoard.
 * These are preferences, not board content: no Supabase writes, new document
 * fields, history revisions, or changes to the existing save pipeline.
 */
export type InkTool = "pen" | "marker";
export type InkToolStyle = { color: string; size: number };
export type InkPreferences = Record<InkTool, InkToolStyle>;

const KEY_PREFIX = "onlinerepetitor.ink-preferences.v1.";
export const DEFAULT_INK_PREFERENCES: InkPreferences = {
  pen: { color: "#5355c9", size: 3 },
  marker: { color: "#5355c9", size: 22 },
};

export const inkPreferencesKey = (userId: string): string =>
  KEY_PREFIX + encodeURIComponent(userId);

const validColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[a-fA-F0-9]{6}$/.test(value);

const normalizeStyle = (value: unknown, kind: InkTool): InkToolStyle => {
  const defaultStyle = DEFAULT_INK_PREFERENCES[kind];
  const input = value && typeof value === "object"
    ? value as Partial<InkToolStyle> : {};
  const minimum = kind === "pen" ? 1 : 8;
  const maximum = kind === "pen" ? 16 : 48;
  return {
    color: validColor(input.color) ? input.color : defaultStyle.color,
    size: typeof input.size === "number" && Number.isFinite(input.size)
      ? Math.max(minimum, Math.min(maximum, Math.round(input.size)))
      : defaultStyle.size,
  };
};

export const normalizeInkPreferences = (value: unknown): InkPreferences => {
  const input = value && typeof value === "object"
    ? value as Partial<InkPreferences> : {};
  return {
    pen: normalizeStyle(input.pen, "pen"),
    marker: normalizeStyle(input.marker, "marker"),
  };
};

export const loadInkPreferences = (userId: string): InkPreferences => {
  try {
    const raw = localStorage.getItem(inkPreferencesKey(userId));
    return normalizeInkPreferences(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeInkPreferences(null);
  }
};

export const saveInkPreferences = (userId: string, preferences: InkPreferences): void => {
  try {
    localStorage.setItem(
      inkPreferencesKey(userId),
      JSON.stringify(normalizeInkPreferences(preferences)),
    );
  } catch {
    // Browser storage quota/private mode must never break drawing or board saves.
  }
};

export const changeInkPreference = (
  current: InkPreferences, kind: InkTool, next: Partial<InkToolStyle>,
): InkPreferences => ({
  ...current,
  [kind]: normalizeStyle({ ...current[kind], ...next }, kind),
});

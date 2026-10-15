import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";

type Theme = "dark" | "light" | "system";
type ResolvedTheme = Exclude<Theme, "system">;
export const THEME_STORAGE_KEY = "hollow-wilds-theme-v1";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};
type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};
const validTheme = (value: string | null): value is Theme =>
  value === "light" || value === "dark" || value === "system";
function readTheme(storageKey: string, fallback: Theme): Theme {
  try {
    const stored = localStorage.getItem(storageKey);
    return validTheme(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}
function deviceTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}
// Apply the saved appearance before the first React render.
export function initializeTheme() {
  const theme = readTheme(THEME_STORAGE_KEY, "system");
  applyTheme(theme === "system" ? deviceTheme() : theme);
}
const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: "system", resolvedTheme: "light", setTheme: () => {},
});
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => readTheme(storageKey, defaultTheme));
  const [systemTheme, setSystemTheme] = useState(deviceTheme);
  const resolvedTheme = theme === "system" ? systemTheme : theme;
  useLayoutEffect(() => applyTheme(resolvedTheme), [resolvedTheme]);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(preference.matches ? "dark" : "light");
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null)
        setThemeState(validTheme(event.newValue) ? event.newValue : defaultTheme);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey, defaultTheme]);
  const setTheme = (next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // The appearance still updates for this visit when storage is unavailable.
    }
  };
  return <ThemeProviderContext.Provider value={{ theme, resolvedTheme, setTheme }}>
    {children}
  </ThemeProviderContext.Provider>;
}
export const useTheme = () => useContext(ThemeProviderContext);

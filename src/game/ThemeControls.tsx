import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../components/theme-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return <button className="icon-button theme-toggle" data-theme-control
    aria-label={label} title={label} onClick={() => setTheme(dark ? "light" : "dark")}>
    {dark ? <Sun size={18} /> : <Moon size={18} />}
  </button>;
}

export function AppearanceSettingsCard() {
  const { theme, setTheme } = useTheme();
  return <section className="settings-card appearance-settings" data-theme-control>
    <Sun size={25} />
    <h2>Appearance</h2>
    <p>Choose an interface that feels comfortable, or follow your device.</p>
    <div className="theme-options" role="group" aria-label="Interface appearance">
      {([
        ["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "System", Monitor],
      ] as const).map(([value, label, Icon]) => <button key={value}
        className={`theme-option ${theme === value ? "is-selected" : ""}`}
        aria-pressed={theme === value} onClick={() => setTheme(value)}>
        <Icon size={20} /><span>{label}</span>
      </button>)}
    </div>
    <p className="small-note">Applies to menus and panels. Your preference stays on this browser.</p>
  </section>;
}

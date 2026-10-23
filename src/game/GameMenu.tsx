import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useAdventure } from "./store";
import { navigation } from "./navigation";
import { Encyclopedia } from "./Encyclopedia";
import { JournalPanel, MapPanel, SettingsPanel, TeamPanel } from "./Panels";
import { ModelGuide } from "./ModelGuide";

// Mount pages on their first visit, then retain their filters and scroll position.
function MenuPage({ active, name, children }: {
  active: boolean; name: string; children: ReactNode;
}) {
  const [visited, setVisited] = useState(false);
  useEffect(() => { if (active) setVisited(true); }, [active]);
  if (!active && !visited) return null;
  return <section className="game-menu-page" hidden={!active} aria-label={name}>{children}</section>;
}

export function GameMenu({ children, onStudy }: { children?: ReactNode; onStudy: (species: string) => void }) {
  const panel = useAdventure((s) => s.panel);
  const setPanel = useAdventure((s) => s.setPanel);
  const dialog = useRef<HTMLDialogElement>(null);
  const open = panel !== "adventure";
  useEffect(() => {
    const element = dialog.current!;
    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="game-menu"
      aria-labelledby="game-menu-title"
      onCancel={(e) => { e.preventDefault(); setPanel("adventure"); }}
    >
      <header className="game-menu-header">
        <div>
          <BookOpen size={21} />
          <div>
            <h2 id="game-menu-title">{navigation.find((item) => item.key === panel)?.name ?? "Your adventure"}</h2>
            <span>Your adventure is paused.</span>
          </div>
        </div>
        <button className="secondary-button" onClick={() => setPanel("adventure")} autoFocus>
          <ArrowLeft size={16} /> Back to adventure <kbd>Esc</kbd>
        </button>
      </header>
      <nav className="game-menu-nav" aria-label="In-game pages">
        {navigation.filter((item) => item.key !== "adventure").map((item) => (
          <button key={item.key} aria-current={panel === item.key ? "page" : undefined} onClick={() => setPanel(item.key)}>
            <item.icon size={16} />{item.name}
          </button>
        ))}
      </nav>
      {navigation.filter((item) => item.key !== "adventure").map((item) => (
        <MenuPage key={item.key} active={panel === item.key} name={item.name}>
          {item.key === "team" ? <TeamPanel /> : item.key === "journal" ? <JournalPanel /> :
            item.key === "map" ? <MapPanel /> : item.key === "settings" ? <SettingsPanel /> : item.key === "models" ? <ModelGuide onStudy={onStudy} /> :
              <Encyclopedia mode={item.key} />}
        </MenuPage>
      ))}
      {children}
    </dialog>
  );
}

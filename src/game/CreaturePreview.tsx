import { useEffect, useRef, useState } from "react";
import { spriteUrl } from "./sprites";
import { SHINY_FILTER, traitLabel } from "./traits";
import type { Traits } from "./traits";
import type { createCreaturePreview } from "./three/creature-preview";
import "./creature-preview.css";

export function CreatureArt({ name, className = "", shiny = false, alpha = false, interactive = false }: {
  name: string;
  className?: string;
  interactive?: boolean;
} & Partial<Traits>) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<ReturnType<typeof createCreaturePreview> | null>(null);
  const drag = useRef<{ id: number; x: number } | null>(null);
  const [status, setStatus] = useState("loading");
  const label = `${traitLabel({ shiny, alpha })} ${name}`.trim();
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let active = true;
    let loading = false;
    setStatus("loading");
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || loading) return;
      loading = true;
      Promise.all([import("./three/creature-preview"), import("./three/blender-creatures")])
        .then(async ([preview, assets]) => {
          await assets.loadBlenderCreature(name);
          if (!active) return;
          controller.current = preview.createCreaturePreview(element, name, { shiny, alpha }, interactive,
            () => { if (active) setStatus("ready"); },
            () => { if (active) setStatus("fallback"); });
        })
        .catch(() => { if (active) setStatus("fallback"); });
    }, { rootMargin: "100px" });
    observer.observe(element);
    return () => {
      active = false;
      observer.disconnect();
      controller.current?.dispose();
      controller.current = null;
      drag.current = null;
    };
  }, [name, shiny, alpha, interactive]);

  return (
    <span className={`creature-art creature-model ${alpha ? "alpha-art" : ""} ${className}`}
      data-preview={status} role={interactive ? "group" : "img"}
      aria-label={`${label}${status === "fallback" ? " illustration" : " 3D model"}`}
      aria-busy={status === "loading"}>
      <canvas ref={canvas} className="creature-model-canvas" hidden={status === "fallback"}
        role={interactive ? "img" : undefined} aria-hidden={!interactive}
        aria-label={interactive ? `${label}. Drag or use left and right arrows to rotate. Home resets the view.` : undefined}
        tabIndex={interactive && status === "ready" ? 0 : undefined}
        onKeyDown={interactive ? (event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            event.stopPropagation();
            controller.current?.rotate(event.key === "ArrowLeft" ? -0.2 : 0.2);
          } else if (event.key === "Home") {
            event.preventDefault();
            event.stopPropagation();
            controller.current?.reset();
          }
        } : undefined}
        onPointerDown={interactive ? (event) => {
          if (!event.isPrimary || event.button !== 0) return;
          drag.current = { id: event.pointerId, x: event.clientX };
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.focus();
        } : undefined}
        onPointerMove={interactive ? (event) => {
          if (drag.current?.id !== event.pointerId) return;
          controller.current?.rotate((event.clientX - drag.current.x) * 0.012);
          drag.current.x = event.clientX;
        } : undefined}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onLostPointerCapture={() => { drag.current = null; }} />
      {status === "loading" && <span className="creature-model-loading" aria-hidden="true" />}
      {status === "fallback" && <img src={spriteUrl(name)} alt="" draggable={false}
        style={shiny ? { filter: SHINY_FILTER } : undefined} />}
    </span>
  );
}

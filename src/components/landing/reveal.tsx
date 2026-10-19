"use client";

import { useEffect } from "react";

/**
 * Activa las entradas por partes: marca <html class="js"> y, cuando una sección con
 * [data-reveal] entra en pantalla, le agrega .lp-in una sola vez. Sin JavaScript no se
 * oculta nada, así que el contenido nunca queda invisible.
 */
export function Reveal() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("lp-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    els.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root.classList.remove("js");
    };
  }, []);
  return null;
}

"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/*
 * "Una foto, tres distancias": el centro de mesas del Edificio Cowork, fijo en pantalla,
 * se acerca en dos pasos mientras se hace scroll. La frase llega en dos mitades.
 */
const STAGES = [
  { scale: 1, origin: "50% 50%" },
  { scale: 1.8, origin: "88% 56%" }, // las sillas naranjas
  { scale: 3.2, origin: "62% 34%" }, // la ventana con la bandera
];

export function Showcase() {
  const [stage, setStage] = useState(0);
  const markers = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setStage(Number((e.target as HTMLElement).dataset.stage));
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    markers.current.forEach((m) => m && io.observe(m));
    return () => io.disconnect();
  }, []);

  const s = STAGES[stage];

  return (
    <section aria-labelledby="sc-title" className="relative" style={{ height: "200vh" }}>
      {/* Marcadores invisibles que deciden la distancia. */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          data-stage={i}
          ref={(el) => {
            markers.current[i] = el;
          }}
          className="absolute inset-x-0 h-0.5"
          style={{ top: `${30 + i * 50}vh` }}
          aria-hidden="true"
        />
      ))}
      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden px-[var(--m)]">
        <h2 id="sc-title" className="sr-only">
          Cuarenta mesas, una sola puerta.
        </h2>
        <p aria-hidden="true" className="lp-heading relative z-10 text-center">
          Cuarenta mesas,
        </p>
        <div className="relative mt-4 grid w-full max-w-[1100px] grid-cols-1 items-start gap-6 md:grid-cols-[1fr_auto_1fr]">
          <div className="hidden md:block" />
          <div className="relative mx-auto aspect-[4/5] w-[70vw] overflow-hidden md:w-[30vw] md:max-w-[440px]">
            <Image
              src="/hub/cowork.jpg"
              alt="Centro de mesas del Edificio Cowork, con sus sillas naranjas"
              fill
              sizes="(min-width: 768px) 30vw, 70vw"
              className="object-cover"
              style={{ transform: `scale(${s.scale})`, transformOrigin: s.origin, transition: "transform 700ms ease" }}
            />
          </div>
          <p
            className="mx-auto max-w-[28ch] text-center text-[17px] leading-[1.5] md:mx-0 md:text-left"
            style={{
              opacity: stage >= 2 ? 1 : 0,
              transform: stage >= 2 ? "none" : "translateY(12px)",
              transition: "opacity 500ms var(--ease-out), transform 600ms var(--ease-out)",
            }}
          >
            El centro de mesas del Edificio Cowork tiene 40 puestos sin asignar. AforoON te dice cuántos quedan antes de salir de casa.
          </p>
        </div>
        <p
          aria-hidden="true"
          className="lp-heading relative z-10 mt-[-0.3em] text-center"
          style={{
            opacity: stage >= 1 ? 1 : 0,
            transform: stage >= 1 ? "none" : "translateY(0.3em)",
            transition: "opacity 500ms var(--ease-out), transform 600ms var(--ease-out)",
          }}
        >
          una sola puerta.
        </p>
      </div>
    </section>
  );
}

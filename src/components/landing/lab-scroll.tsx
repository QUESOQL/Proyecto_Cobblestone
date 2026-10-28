"use client";

import { useEffect, useRef, useState } from "react";
import { ImageSlot } from "./image-slot";
import { SLOTS } from "./slots";

/*
 * Lab881 al hacer scroll: el panel de imagen queda fijo y, a medida que pasan los textos,
 * la imagen gira levemente y cambia a la siguiente máquina. Una sola imagen visible a la vez;
 * solo se animan opacity y transform.
 */
const STEPS = [
  {
    slot: SLOTS.labFilamento,
    title: "Impresoras 3D de filamento",
    text: "Ender 3 V3 SE y Creality K1C para prototipos, repuestos y maquetas. Los trabajos largos pueden quedar imprimiendo de noche.",
  },
  {
    slot: SLOTS.labMulticolor,
    title: "Impresión en varios colores",
    text: "La Creality Sparkx i7 imprime con varios filamentos a la vez, sin pintar la pieza después.",
  },
  {
    slot: SLOTS.labResina,
    title: "Impresora de resina",
    text: "La Halot Mage 8K, con su curadora, para figuras y piezas con detalle fino.",
  },
  {
    slot: SLOTS.labLaser,
    title: "Cortadora láser",
    text: "100 W y una cama de 90 × 60 cm para cortar y grabar madera, cartón o acrílico.",
  },
  {
    slot: SLOTS.labPiezas,
    title: "Tu idea, en la mano",
    text: "El uso es gratis: tú pones el material. Solo hay que pasar una vez por la capacitación obligatoria.",
  },
];

export function LabScroll() {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    steps.current.forEach((s) => s && io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-16">
      {/* Panel fijo: en el teléfono queda arriba, en escritorio a la izquierda. */}
      <div className="lp-lab-sticky">
        <div className="relative aspect-[4/3] md:aspect-[4/5]">
          {STEPS.map((s, i) => (
            <ImageSlot
              key={s.slot.id}
              slot={s.slot}
              sizes="(min-width: 768px) 45vw, 100vw"
              className="lp-lab-frame absolute inset-0"
              style={{
                opacity: i === active ? 1 : 0,
                transform: i === active ? "none" : `rotate(${i < active ? -3 : 3}deg) scale(0.94)`,
              }}
            />
          ))}
        </div>
        <p className="lp-caption num mt-3 text-slate" aria-hidden="true">
          {String(active + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")} · {STEPS[active].title}
        </p>
      </div>

      <ol className="flex flex-col">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            data-step={i}
            ref={(el) => {
              steps.current[i] = el;
            }}
            className="lp-lab-step"
            style={{ color: i === active ? "var(--lp-black)" : "var(--lp-iron)" }}
          >
            <h3 className="lp-heading-sm">{s.title}</h3>
            <p className="mt-2 max-w-[38ch] text-[16px] leading-[1.5]">{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

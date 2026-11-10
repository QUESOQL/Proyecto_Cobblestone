"use client";

import { useEffect, useRef, useState } from "react";
import { ImageSlot } from "./image-slot";
import { SLOTS } from "./slots";

/*
 * Lab881 al hacer scroll: el panel de imagen queda fijo y, a medida que pasan los textos,
 * la imagen gira levemente y cambia a la siguiente máquina. Una sola imagen visible a la vez;
 * solo se animan opacity y transform.
 */
// Datos de las máquinas: src/lib/lab.ts y la página del Lab881 (hub-pages.ts).
const STEPS = [
  {
    slot: SLOTS.labFilamento,
    title: "Impresoras 3D de filamento",
    text: "Dos Ender 3 V3 SE y una Creality K1C, la más rápida del lab. Llevas tu archivo, eliges el filamento y la impresora va dejando la pieza capa por capa.",
    facts: [
      { label: "Ideal para", value: "Prototipos, repuestos, carcasas y maquetas" },
      { label: "Trabajos largos", value: "Pueden seguir imprimiendo de noche, hasta 18 horas" },
      { label: "Capacitación", value: "Impresión 3D" },
    ],
  },
  {
    slot: SLOTS.labMulticolor,
    title: "Impresión en varios colores",
    text: "La Creality Sparkx i7 cambia de filamento sola durante la impresión, así la pieza sale con sus colores y no hay que pintarla después.",
    facts: [
      { label: "Ideal para", value: "Logos, letreros, llaveros y figuras de colores" },
      { label: "Trabajos largos", value: "Pueden seguir imprimiendo de noche" },
      { label: "Capacitación", value: "Impresión 3D, la misma de las de filamento" },
    ],
  },
  {
    slot: SLOTS.labResina,
    title: "Impresora de resina",
    text: "La Halot Mage 8K imprime con resina líquida y una resolución de 8K. La curadora con luz UV termina de endurecer la pieza.",
    facts: [
      { label: "Ideal para", value: "Figuras, miniaturas, joyería y piezas con detalle fino" },
      { label: "Incluye", value: "Curadora UV y herramientas de post-procesado" },
      { label: "Capacitación", value: "Impresión en resina" },
    ],
  },
  {
    slot: SLOTS.labLaser,
    title: "Cortadora láser",
    text: "100 W de potencia y una cama de 90 × 60 cm para cortar y grabar planchas completas de madera, cartón o acrílico.",
    facts: [
      { label: "Ideal para", value: "Letreros, cajas, piezas planas, grabados y regalos" },
      { label: "Materiales", value: "Madera, cartón y acrílico" },
      { label: "Capacitación", value: "Corte láser" },
    ],
  },
  {
    slot: SLOTS.labPiezas,
    title: "Tu idea, en la mano",
    text: "El uso es gratis: tú pones el material. Pasas una vez por la capacitación de la máquina y desde ahí la reservas en AforoON cuando la necesites.",
    facts: [
      { label: "Reservas", value: "15 al año por persona, de hasta 18 horas cada una" },
      { label: "Quién puede", value: "Cualquier persona; menores de edad con un adulto" },
      { label: "Qué traer", value: "El archivo de impresión o corte y tu material" },
    ],
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
            style={{ color: i === active ? "var(--black)" : "var(--iron)" }}
          >
            <h3 className="lp-heading-sm">{s.title}</h3>
            <p className="mt-2 max-w-[42ch] text-[16px] leading-[1.5]">{s.text}</p>
            <dl className="mt-5 max-w-[42ch]">
              {s.facts.map((f) => (
                <div key={f.label} className="rule-row grid grid-cols-[112px_minmax(0,1fr)] gap-3 text-[14px] leading-[1.45]">
                  <dt className="font-medium">{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ol>
    </div>
  );
}

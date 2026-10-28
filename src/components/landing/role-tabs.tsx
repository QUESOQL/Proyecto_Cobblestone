"use client";

import Link from "next/link";
import { useState } from "react";
import { ImageSlot } from "./image-slot";
import { SLOTS } from "./slots";

/*
 * "AforoON para cada uno": la tira de pestañas de Uber, con el único color de la interfaz
 * (el teal pálido) marcando la pestaña activa.
 */
const ROLES = [
  {
    id: "vecino",
    tab: "Vecinos",
    title: "Te registras una vez y entras con el teléfono",
    points: [
      "Creas tu credencial con tu RUT en dos minutos.",
      "Reservas mesa, oficina o charla viendo el cupo real.",
      "En la puerta acercas el teléfono o muestras tu QR, que cambia cada 30 segundos.",
    ],
    cta: { href: "/registro", label: "Crear mi credencial" },
    slot: SLOTS.rolVecino,
  },
  {
    id: "recepcion",
    tab: "Recepción",
    title: "La fila de la puerta se acaba",
    points: [
      "El terminal lee la credencial y muestra nombre y foto, nunca el RUT completo.",
      "Quien no tiene smartphone se registra en recepción en un minuto.",
      "Sin internet, sigue validando con las reservas del día y sincroniza después.",
    ],
    cta: { href: "/recepcion", label: "Ver el terminal" },
    slot: SLOTS.rolRecepcion,
  },
  {
    id: "admin",
    tab: "Administración",
    title: "El aforo, medido en la puerta",
    points: [
      "Entradas, ocupación por zona y horas punta, en tiempo real.",
      "Quiénes vienen al Hub y para qué, sin planillas a mano.",
      "Todo se exporta en un clic.",
    ],
    cta: { href: "/admin", label: "Ver el dashboard" },
    slot: SLOTS.rolAdmin,
  },
];

export function RoleTabs() {
  const [active, setActive] = useState(0);
  const r = ROLES[active];

  return (
    <div>
      <div className="tabs" role="tablist" aria-label="AforoON según quién lo usa">
        {ROLES.map((role, i) => (
          <button
            key={role.id}
            id={`tab-${role.id}`}
            role="tab"
            aria-selected={i === active}
            aria-controls={`panel-${role.id}`}
            onClick={() => setActive(i)}
            className="tab"
          >
            {role.tab}
          </button>
        ))}
      </div>

      <div
        id={`panel-${r.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${r.id}`}
        className="mt-8 grid gap-8 md:grid-cols-2 md:items-center md:gap-16"
      >
        <div>
          <h3 className="lp-heading-sm">{r.title}</h3>
          <ul className="mt-5 flex flex-col">
            {r.points.map((p) => (
              <li key={p} className="rule-row text-[16px] leading-[1.5]">
                {p}
              </li>
            ))}
          </ul>
          <Link href={r.cta.href} className="btn mt-6 max-md:w-full">
            {r.cta.label}
          </Link>
        </div>
        <ImageSlot key={r.slot.id} slot={r.slot} ratio="4/3" className="lp-slot--contain" />
      </div>
    </div>
  );
}

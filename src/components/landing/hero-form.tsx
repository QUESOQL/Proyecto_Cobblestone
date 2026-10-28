"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { dayKey } from "@/lib/data";

/*
 * El formulario de la portada, como el de origen y destino de Uber: dos campos unidos por
 * una línea (círculo = qué, cuadrado = cuándo) y un botón negro que abre /reservar con
 * la zona y el día ya elegidos.
 */
const ZONES = [
  { id: "mesas", label: "Una mesa en el cowork" },
  { id: "oficinas", label: "Una oficina o el set audiovisual" },
  { id: "charlas", label: "Un asiento en una charla" },
  { id: "salas", label: "Una sala del Edificio Empleo" },
];
const LATER = [
  { offset: 1, label: "Mañana" },
  { offset: 2, label: "Pasado mañana" },
];

export function HeroForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"hoy" | "despues">("hoy");
  const [zone, setZone] = useState("mesas");
  const [day, setDay] = useState(1);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const offset = mode === "hoy" ? 0 : day;
    router.push(`/reservar?zona=${zone}&dia=${dayKey(offset)}`);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" aria-label="Buscar un espacio">
      <div className="lp-toggle self-start" role="radiogroup" aria-label="Cuándo">
        {(["hoy", "despues"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className="lp-toggle-option"
          >
            {m === "hoy" ? "Ir hoy" : "Programar"}
          </button>
        ))}
      </div>

      <div className="lp-route">
        <label className="lp-field">
          <span className="lp-dot" aria-hidden="true" />
          <span className="sr-only">Qué quieres reservar</span>
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            {ZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
          <ChevronDown size={18} aria-hidden="true" className="pointer-events-none flex-none" />
        </label>
        <label className="lp-field">
          <span className="lp-square" aria-hidden="true" />
          <span className="sr-only">Qué día</span>
          {mode === "hoy" ? (
            <select disabled value="hoy">
              <option value="hoy">Hoy, con el cupo real</option>
            </select>
          ) : (
            <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {LATER.map((d) => (
                <option key={d.offset} value={d.offset}>
                  {d.label}
                </option>
              ))}
            </select>
          )}
          <ChevronDown size={18} aria-hidden="true" className="pointer-events-none flex-none" />
        </label>
      </div>

      <button type="submit" className="lp-btn mt-1 self-start max-md:w-full">
        Ver cupos
      </button>
    </form>
  );
}

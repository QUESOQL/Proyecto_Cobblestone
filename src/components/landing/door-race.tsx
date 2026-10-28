"use client";

import { useEffect, useRef, useState } from "react";
import { Nfc, RotateCcw } from "lucide-react";

/*
 * Lo único que el visitante puede hacer en la página: comparar las dos puertas.
 * A la izquierda, el formulario que hoy se llena en cada visita, escrito a ritmo de
 * teléfono (unos 4 caracteres por segundo). A la derecha, la puerta de AforoON.
 * Las dos parten con el mismo toque y el reloj es real.
 */

const FIELDS = [
  { label: "Nombre completo", value: "Valentina Muñoz Rojas" },
  { label: "RUT", value: "17.482.395-2" },
  { label: "Correo", value: "valentina.munoz@gmail.com" },
  { label: "Teléfono", value: "+56 9 1234 5678" },
  { label: "Ocupación", value: "Diseñadora" },
  { label: "Motivo de la visita", value: "Cowork" },
  { label: "Edificio", value: "Cowork" },
];
const CHARS_PER_SECOND = 4.2;
const DOOR_SECONDS = 1.2;

export function DoorRace() {
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const start = useRef<number | null>(null);
  const raf = useRef<number | null>(null);

  const totalChars = FIELDS.reduce((a, f) => a + f.value.length, 0);
  const formSeconds = totalChars / CHARS_PER_SECOND;
  const done = t >= formSeconds;

  useEffect(() => {
    if (!running) return;
    const tick = (now: number) => {
      if (start.current === null) start.current = now;
      const s = (now - start.current) / 1000;
      setT(s);
      if (s < formSeconds) raf.current = requestAnimationFrame(tick);
      else setRunning(false);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [running, formSeconds]);

  const go = () => {
    start.current = null;
    setT(0);
    setRunning(true);
  };

  let budget = t * CHARS_PER_SECOND;
  const typed = FIELDS.map((f) => {
    const n = Math.max(0, Math.min(f.value.length, Math.floor(budget)));
    budget -= f.value.length;
    return n;
  });
  const doorOpen = t >= DOOR_SECONDS;
  const fmt = (s: number) => s.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const started = running || t > 0;

  return (
    <div className="grid gap-4 md:grid-cols-2" data-ui>
      {/* El formulario de hoy */}
      <div className="rounded-[8px] bg-surface p-5 md:p-7" style={{ boxShadow: "inset 0 0 0 1px var(--border)" }}>
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-[17px] font-semibold">El formulario de hoy</h3>
          <span className="num text-[14px] text-muted" aria-live="off">
            {fmt(Math.min(t, formSeconds))} s
          </span>
        </div>
        <p className="lp-small mt-1 text-muted">El mismo, en cada visita.</p>
        <ul className="mt-5 flex flex-col gap-3">
          {FIELDS.map((f, i) => (
            <li key={f.label}>
              <span className="block text-[14px] text-muted">{f.label}</span>
              <span className="mt-1 flex h-10 items-center rounded-[6px] px-3 text-[14px]" style={{ boxShadow: "inset 0 0 0 1px var(--control)" }}>
                {f.value.slice(0, typed[i])}
                {running && typed[i] > 0 && typed[i] < f.value.length && <span className="ml-0.5 inline-block h-4 w-0.5 bg-text" aria-hidden="true" />}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* La puerta de AforoON */}
      <div className="flex flex-col rounded-[8px] bg-primary p-5 text-white md:p-7">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-[17px] font-semibold">La puerta con AforoON</h3>
          <span className="num text-[14px] text-white/70">{fmt(Math.min(t, DOOR_SECONDS))} s</span>
        </div>
        <p className="lp-small mt-1 text-white/70">Te registraste una vez. Ahora solo acercas el teléfono.</p>

        <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10">
          <span
            className="flex size-[152px] items-center justify-center rounded-full"
            style={{ background: doorOpen ? "#1e3a2b" : "#2a2d30", transition: "background-color 200ms ease" }}
          >
            <span
              className="block size-16 rounded-full"
              style={{ background: doorOpen ? "#3fc07a" : started ? "#5f6672" : "#3b3f44", transition: "background-color 150ms ease" }}
            />
          </span>
          <p className="min-h-[52px] text-center text-[17px] font-medium leading-[24px]" aria-live="polite">
            {doorOpen ? (
              <>
                Verde. Adentro en {fmt(DOOR_SECONDS)} s.
                <span className="block text-[14px] font-normal text-white/70">Meta del equipo: menos de 7 segundos.</span>
              </>
            ) : started ? (
              "Leyendo la credencial…"
            ) : (
              "Esperando el teléfono"
            )}
          </p>
        </div>

        {done ? (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] leading-[22px] text-white/80">
              El formulario tardó {fmt(formSeconds)} s, {Math.round(formSeconds / DOOR_SECONDS)} veces más. Y mañana, otra vez.
            </p>
            <button onClick={go} className="btn btn--invert">
              <RotateCcw size={17} aria-hidden="true" /> Repetir
            </button>
          </div>
        ) : (
          <button onClick={go} disabled={running} className="btn btn--invert disabled:opacity-60">
            <Nfc size={18} aria-hidden="true" /> {running ? "Comparando…" : "Acercar el teléfono"}
          </button>
        )}
      </div>
      <noscript>
        <p className="lp-small text-muted md:col-span-2">
          A ritmo de teléfono, el formulario toma unos {Math.round(formSeconds)} segundos; la puerta con AforoON, cerca de 1.
        </p>
      </noscript>
    </div>
  );
}

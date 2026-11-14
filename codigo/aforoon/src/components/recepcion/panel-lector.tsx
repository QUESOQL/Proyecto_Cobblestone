"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bluetooth } from "lucide-react";
import { LectorBLE, bluetoothDisponible, type EstadoEnlace } from "@/lib/lector/ble-lector";
import type { Color, LecturaBLE } from "@/lib/lector/protocolo-ble";
import { Button, Pill } from "@/components/ui";

/** El lector ESP32 del mesón, desde la terminal: conectar, estado y enviar colores. */
export function useLector(onLectura: (l: LecturaBLE) => void) {
  const [estado, setEstado] = useState<EstadoEnlace>("sin_conectar");
  const [error, setError] = useState<string | null>(null);
  const [disponible, setDisponible] = useState(true);
  const alLeer = useRef(onLectura);
  useEffect(() => {
    alLeer.current = onLectura;
  });
  const lector = useRef<LectorBLE | null>(null);

  useEffect(() => {
    setDisponible(bluetoothDisponible());
    return () => lector.current?.desconectar();
  }, []);

  const conectar = useCallback(async () => {
    setError(null);
    lector.current ??= new LectorBLE(
      (l) => alLeer.current(l),
      (e, err) => {
        setEstado(e);
        if (err) setError(err);
      },
    );
    await lector.current.elegir();
  }, []);

  const desconectar = useCallback(() => lector.current?.desconectar(), []);
  const enviar = useCallback((seq: number, color: Color) => void lector.current?.enviarResultado(seq, color), []);

  return { estado, error, disponible, conectar, desconectar, enviar, nombre: lector.current?.nombre ?? "", nfcOk: lector.current?.nfcOk ?? true };
}

const ETIQUETA: Record<EstadoEnlace, { texto: string; tono: "neutral" | "positive" | "warning" | "negative" }> = {
  sin_conectar: { texto: "Sin conectar", tono: "neutral" },
  conectando: { texto: "Conectando…", tono: "neutral" },
  conectado: { texto: "Conectado", tono: "positive" },
  reconectando: { texto: "Reconectando…", tono: "warning" },
  desconectado: { texto: "Desconectado", tono: "negative" },
};

export function PanelLector({ lector }: { lector: ReturnType<typeof useLector> }) {
  const { estado, error, disponible, nombre, nfcOk } = lector;
  const etiqueta = ETIQUETA[estado];
  const ocupado = estado === "conectando" || estado === "reconectando";

  return (
    <section aria-labelledby="lector-titulo" className="rounded-card border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="lector-titulo" className="text-[14px] text-muted">
          Lector de tarjetas
        </h2>
        <Pill tone={etiqueta.tono}>{etiqueta.texto}</Pill>
      </div>
      <p className="mt-1 text-[15px]">{estado === "sin_conectar" || !nombre ? "Lector ESP32 del mesón, por Bluetooth." : nombre}</p>
      {estado === "conectado" && !nfcOk && (
        <p role="status" className="mt-2 text-[13px] text-[var(--pill-warning-ink)]">
          El lector no encuentra su módulo NFC. Revisa el cableado del PN532.
        </p>
      )}
      {estado === "desconectado" && <p className="mt-2 text-[13px] text-muted">Se perdió el enlace. Acércate al lector y vuelve a conectarlo.</p>}
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-negative">
          {error}
        </p>
      )}
      {!disponible ? (
        <p className="mt-3 text-[13px] text-muted">Este navegador no tiene Bluetooth. Usa Chrome en el teléfono Android del guardia.</p>
      ) : estado === "conectado" ? (
        <Button className="mt-3" onClick={() => lector.desconectar()}>
          Desconectar
        </Button>
      ) : (
        <Button className="mt-3" variant="primary" onClick={() => void lector.conectar()} disabled={ocupado}>
          <Bluetooth size={16} aria-hidden="true" /> {ocupado ? etiqueta.texto : "Conectar lector"}
        </Button>
      )}
    </section>
  );
}

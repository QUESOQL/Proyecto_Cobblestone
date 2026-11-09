"use client";

import { QRCodeSVG } from "qrcode.react";
import { PERIODO_MS } from "@/lib/af2";
import { useCredencialQR } from "@/lib/credencial-qr";

const MOTIVOS: Record<string, string> = {
  sin_conexion: "Necesitas internet la primera vez para activar tu código en este teléfono.",
  sin_persona: "Completa tu registro para activar tu código.",
};

/**
 * El QR firmado de la credencial (AF2). Cambia cada 30 s y sirve una sola vez, así que una
 * captura de pantalla no sirve para entrar.
 */
export function QrCredencial({ persona, size = 220 }: { persona: string; size?: number }) {
  const qr = useCredencialQR(persona);
  const periodo = PERIODO_MS / 1000;

  return (
    <div className="flex flex-col items-center">
      <div className="rounded-card bg-white p-3" style={{ boxShadow: "inset 0 0 0 1px var(--border)" }}>
        {qr.estado === "listo" ? (
          <div data-af2={qr.token} role="img" aria-label="Código QR de tu credencial">
            <QRCodeSVG value={qr.token} size={size} level="M" fgColor="#000000" bgColor="#ffffff" key={qr.t} className="enter" />
          </div>
        ) : (
          <div className="flex items-center justify-center p-4 text-center text-[13px] leading-[18px] text-muted" style={{ width: size, height: size }}>
            {qr.estado === "cargando" ? "Preparando tu código…" : (MOTIVOS[qr.motivo] ?? "No se pudo activar tu código. Recarga la página.")}
          </div>
        )}
      </div>
      <div className="mt-4 w-full max-w-[280px]">
        <div className="h-1 overflow-hidden rounded-full bg-accent-track" aria-hidden="true">
          {qr.estado === "listo" && (
            <div
              className="h-full bg-accent"
              style={{ width: `${(qr.restante / periodo) * 100}%`, transition: qr.restante === periodo ? "none" : "width 1000ms linear" }}
            />
          )}
        </div>
        <p className="num mt-2 text-center text-[12px] text-muted" aria-live="off">
          {qr.estado === "listo" ? `Cambia en ${qr.restante} s` : " "}
        </p>
      </div>
    </div>
  );
}

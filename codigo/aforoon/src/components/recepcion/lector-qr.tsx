"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui";

/*
 * Cámara del celular del guardia leyendo el QR del socio (informe v4, sección 8.5).
 * Usa BarcodeDetector cuando el navegador lo trae (Chrome en Android) y jsQR cuando no
 * (Chrome en Windows, Safari antiguo). Se monta al tocar "Escanear QR", se apaga sola
 * al leer un código (una persona a la vez) o tras 20 s sin lecturas, para cuidar la batería.
 */

type Detector = (video: HTMLVideoElement, lienzo: HTMLCanvasElement) => Promise<string | null>;

interface BarcodeDetectorLike {
  detect(fuente: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
interface BarcodeDetectorClase {
  new (opciones: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

const APAGADO_MS = 20_000;

async function crearDetector(): Promise<Detector> {
  const Clase = (globalThis as { BarcodeDetector?: BarcodeDetectorClase }).BarcodeDetector;
  const formatos = Clase ? await Clase.getSupportedFormats?.().catch(() => []) : [];
  if (Clase && formatos?.includes("qr_code")) {
    const detector = new Clase({ formats: ["qr_code"] });
    return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
  }
  const { default: jsQR } = await import("jsqr");
  return async (video, lienzo) => {
    const ancho = video.videoWidth;
    const alto = video.videoHeight;
    if (!ancho || !alto) return null;
    // Basta con 720 px por lado: el QR AF2 es de versión 6 y se lee bien a ese tamaño.
    const escala = Math.min(1, 720 / Math.max(ancho, alto));
    lienzo.width = Math.round(ancho * escala);
    lienzo.height = Math.round(alto * escala);
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);
    const img = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
    return jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" })?.data ?? null;
  };
}

function avisoDeError(e: unknown): string {
  const nombre = e instanceof DOMException ? e.name : "";
  if (nombre === "NotAllowedError") return "Chrome no tiene permiso para usar la cámara. Actívalo en el candado de la barra de direcciones.";
  if (nombre === "NotFoundError" || nombre === "OverconstrainedError") return "Este equipo no tiene una cámara disponible.";
  if (nombre === "NotReadableError") return "Otra aplicación está usando la cámara.";
  return "No se pudo abrir la cámara.";
}

export function LectorQR({ onLectura, onCerrar }: { onLectura: (texto: string, t0: number) => void; onCerrar: (aviso?: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [lista, setLista] = useState(false);
  // Las funciones de quien la usa cambian en cada render; la cámara no debe reiniciarse por eso.
  const alLeer = useRef(onLectura);
  const alCerrar = useRef(onCerrar);
  useEffect(() => {
    alLeer.current = onLectura;
    alCerrar.current = onCerrar;
  });

  useEffect(() => {
    let vivo = true;
    let flujo: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const apagar = () => flujo?.getTracks().forEach((t) => t.stop());

    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        alCerrar.current("La cámara solo funciona en una dirección segura (https).");
        return;
      }
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e) {
        if (vivo) alCerrar.current(avisoDeError(e));
        return;
      }
      if (!vivo || !video.current || !lienzo.current) return apagar();
      video.current.srcObject = flujo;
      await video.current.play().catch(() => undefined);
      const detectar = await crearDetector();
      if (!vivo) return apagar();
      setLista(true);
      const desde = Date.now();

      const paso = async () => {
        if (!vivo || !video.current || !lienzo.current) return;
        if (Date.now() - desde > APAGADO_MS) {
          vivo = false;
          apagar();
          alCerrar.current("La cámara se apagó sola tras 20 segundos sin leer un código.");
          return;
        }
        const texto = await detectar(video.current, lienzo.current).catch(() => null);
        if (!vivo) return;
        if (texto) {
          vivo = false;
          const t0 = performance.now();
          navigator.vibrate?.(40);
          apagar();
          alLeer.current(texto, t0);
          return;
        }
        timer = setTimeout(() => void paso(), 150);
      };
      void paso();
    })();

    return () => {
      vivo = false;
      clearTimeout(timer);
      apagar();
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-card bg-black">
        <video ref={video} muted playsInline className="size-full object-cover" aria-label="Cámara para leer el QR" />
        <canvas ref={lienzo} className="hidden" />
        {/* Marco para apuntar. */}
        <div className="pointer-events-none absolute inset-[14%] rounded-[12px] border-2 border-white/85" aria-hidden="true" />
        <p className="absolute inset-x-0 bottom-3 text-center text-[13px] text-white" aria-live="polite">
          {lista ? "Apunta al QR del teléfono" : "Abriendo la cámara…"}
        </p>
      </div>
      <Button onClick={() => alCerrar.current()} className="self-center">
        <X size={16} aria-hidden="true" /> Cancelar
      </Button>
    </div>
  );
}

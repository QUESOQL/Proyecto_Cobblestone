"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, Sun } from "lucide-react";
import { useAforo, useHydrated } from "@/lib/store";
import { QrCredencial } from "@/components/qr-credencial";
import { Avatar, TopBar, Wordmark } from "@/components/ui";

/*
 * La credencial a pantalla completa, para mostrarla en recepción: solo el QR, el nombre y
 * cuánto le queda al código. Mantiene la pantalla encendida mientras está abierta.
 */

/** Pide que la pantalla no se apague (Chrome y Safari recientes); se renueva al volver a la pestaña. */
function usePantallaEncendida() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let bloqueo: WakeLockSentinel | null = null;
    const pedir = () => {
      if (document.visibilityState === "visible") {
        navigator.wakeLock
          .request("screen")
          .then((b) => (bloqueo = b))
          .catch(() => undefined);
      }
    };
    pedir();
    document.addEventListener("visibilitychange", pedir);
    return () => {
      document.removeEventListener("visibilitychange", pedir);
      void bloqueo?.release().catch(() => undefined);
    };
  }, []);
}

export default function CredencialPage() {
  const ready = useHydrated();
  const profile = useAforo((s) => s.profile);
  usePantallaEncendida();

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <TopBar
        title={<Wordmark sub="Mi credencial" />}
        action={
          <Link href="/registro" className="topbar-link press inline-flex items-center gap-1.5">
            <ArrowLeft size={16} aria-hidden="true" /> Volver
          </Link>
        }
      />
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center px-4 pb-8 pt-6 text-center">
        {!ready && <p className="text-[14px] text-muted">Cargando…</p>}
        {ready && !profile && (
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-[24px] leading-[1.3]">Aún no tienes credencial</h1>
            <p className="text-[15px] text-muted">Crea tu cuenta y completa tus datos una vez para tener tu QR de acceso.</p>
            <Link href="/registro" className="press flex h-12 items-center justify-center rounded-control bg-accent px-6 text-[15px] font-medium text-white">
              Crear mi credencial
            </Link>
          </div>
        )}
        {ready && profile && (
          <>
            <Avatar name={profile.name} hue={210} size={56} />
            <h1 className="mt-3 text-[24px] leading-[1.3]">{profile.name}</h1>
            <p className="num text-[13px] text-muted">RUT {profile.rut}</p>
            <div className="mt-6">
              <QrCredencial persona={profile.id} size={272} />
            </div>
            <p className="mt-4 flex items-center gap-2 text-[13px] text-muted">
              <Sun size={16} aria-hidden="true" /> Sube el brillo para que la cámara lo lea de inmediato.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

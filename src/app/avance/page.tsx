import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { HUB } from "@/lib/data";
import { Mark } from "@/components/ui";

const SCREENS = [
  {
    href: "/registro",
    name: "Enrolamiento único y credencial",
    who: "Socio · teléfono",
    does: "Cuenta con Google o Apple, datos con RUT validado, consentimiento (Ley 21.719) y credencial NFC con QR dinámico que cambia cada 30 s.",
    photo: "/hub/fachada.jpg",
  },
  {
    href: "/reservar",
    name: "Selección de espacio y bloque",
    who: "Socio · teléfono",
    does: "Día, zona, espacio y bloque con su aforo. Los bloques llenos o pasados no se pueden elegir; la reserva respeta las reglas de la Sección 8.",
    photo: "/hub/cowork.jpg",
  },
  {
    href: "/inicio",
    name: "Inicio del socio",
    who: "Socio · teléfono",
    does: "Próxima reserva, ocupación del Hub en este momento, charlas con inscripción y reuniones con capacitadores.",
    photo: "/hub/charlas.jpg",
  },
  {
    href: "/recepcion",
    name: "Terminal de acceso",
    who: "Recepción · tablet en la puerta",
    does: "Lectura NFC o QR, LED verde o rojo, tiempo de validación contra la meta de 7 s, excepciones auditadas, entradas y salidas, modo sin conexión.",
    photo: "/hub/oficina.jpg",
  },
  {
    href: "/admin",
    name: "Dashboard de ocupación",
    who: "Administración · computador",
    does: "Entradas, ocupación por bloque y zona, no-show, horas punta, caracterización de usuarios y charlas. Exporta los accesos del día en CSV.",
    photo: "/hub/set.jpg",
  },
];

export default function Avance() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 md:px-8 md:py-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[640px]">
          <span className="flex items-center gap-2 text-[15px] font-semibold">
            <Mark /> AforoON
          </span>
          <h1 className="mt-6 text-[32px] font-bold leading-[38px] tracking-[-0.02em]">Avance del prototipo · Equipo Cobblestone</h1>
          <p className="mt-3 text-[15px] leading-[22px] text-muted">
            Cinco pantallas funcionales del sistema de acceso y aforo para el {HUB.name} ({HUB.address}). Comparten una misma sesión: lo
            que reservas en el teléfono aparece en el terminal de la puerta y en el dashboard.
          </p>
        </div>
        <a
          href="https://www.figma.com/design/NK1PirX0HLADYyv9tvmqcj"
          target="_blank"
          rel="noreferrer"
          className="press inline-flex h-9 items-center gap-1.5 rounded-control border border-control bg-surface px-3.5 text-[14px] font-medium"
        >
          Sistema de diseño en Figma <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </header>

      <ol className="mt-10 flex flex-col gap-3">
        {SCREENS.map((s, i) => (
          <li key={s.href}>
            <Link href={s.href} className="press group grid grid-cols-[72px_1fr] items-center gap-4 rounded-card border border-border bg-surface p-3 pr-5 md:grid-cols-[96px_1fr_auto]">
              <div className="relative aspect-square overflow-hidden rounded-[6px]">
                <Image src={s.photo} alt="" fill sizes="96px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] text-muted">
                  Pantalla {i + 1} · {s.who}
                </p>
                <h2 className="text-[17px] font-semibold leading-[24px]">{s.name}</h2>
                <p className="mt-1 text-[13px] leading-[19px] text-muted">{s.does}</p>
              </div>
              <span className="col-span-2 flex items-center gap-1 justify-self-start text-[14px] font-medium text-accent md:col-span-1 md:justify-self-end">
                Abrir <ArrowUpRight size={15} aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-8 text-[12px] leading-[18px] text-muted">
        Prototipo de frontend · Proyecto Capstone Intermedio 2026, Universidad Mayor. Los socios, reservas y charlas son datos de ejemplo
        generados para la demo; las fotos son del Hub, tomadas por el equipo en la salida a terreno.
      </p>
    </main>
  );
}

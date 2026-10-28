import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Mark } from "@/components/ui";

/*
 * Barra superior, pie y barra fija inferior de las páginas públicas (landing y /hub/*).
 * Los enlaces de la barra apuntan a secciones de la portada, así funcionan desde cualquier página.
 */

const FOOTER = [
  {
    title: "AforoON",
    links: [
      { href: "/registro", label: "Crear mi credencial" },
      { href: "/reservar", label: "Reservar un espacio" },
      { href: "/maquinas", label: "Reservar una máquina" },
      { href: "/capacitaciones", label: "Capacitaciones" },
    ],
  },
  {
    title: "El Hub",
    links: [
      { href: "/hub/lab881", label: "Lab881" },
      { href: "/hub/cowork-textil", label: "Cowork textil" },
      { href: "/hub/cowork", label: "Cowork general" },
      { href: "/hub/oficinas", label: "Oficinas y set" },
      { href: "/hub/charlas", label: "Zona de charlas" },
      { href: "/hub/empleo", label: "Empleo" },
    ],
  },
  {
    title: "Equipo municipal",
    links: [
      { href: "/recepcion", label: "Terminal de recepción" },
      { href: "/admin", label: "Administración" },
    ],
  },
  {
    title: "Proyecto",
    links: [
      { href: "/avance", label: "Avance del prototipo" },
      { href: "https://github.com/QUESOQL/Proyecto_Cobblestone", label: "Repositorio del equipo" },
    ],
  },
];

export function SiteNav() {
  return (
    <header className="topbar">
      <nav aria-label="Principal" className="lp-wrap flex h-[var(--bar)] items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-[20px] font-bold">
          <Mark />
          AforoON
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          <li>
            <Link href="/hub/lab881" className="topbar-link inline-flex">
              Lab881
            </Link>
          </li>
          <li>
            <Link href="/#hub" className="topbar-link inline-flex">
              El Hub
            </Link>
          </li>
          <li>
            <Link href="/#como" className="topbar-link inline-flex">
              Cómo funciona
            </Link>
          </li>
          <li>
            <Link href="/#preguntas" className="topbar-link inline-flex">
              Preguntas
            </Link>
          </li>
        </ul>
        <div className="flex items-center gap-2">
          <Link href="/admin" className="topbar-link hidden md:inline-flex">
            Administración
          </Link>
          <Link href="/registro" className="pill-btn">
            Entrar
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[var(--black)] text-[var(--white)]">
      <div className="lp-wrap py-16">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[20px] font-bold">
              <Mark /> AforoON
            </p>
            <p className="mt-3 max-w-[40ch] text-[14px] leading-[1.5] text-[var(--ash)]">
              Hub Providencia · Los Jesuitas 881. Lunes a jueves de 8:30 a 18:00, viernes hasta las 17:00. hub@providencia.cl
            </p>
          </div>
          <Link href="/reservar" className="btn btn--invert self-start md:self-auto">
            Reservar un espacio
          </Link>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {FOOTER.map((col) => (
            <div key={col.title}>
              <h2 className="text-[16px] font-medium">{col.title}</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[14px] text-[var(--ash)] transition-colors hover:text-[var(--white)]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-[#333333] pt-6 text-[12px] leading-[1.67] text-[var(--ash)] md:flex-row md:justify-between">
          <span>Equipo Cobblestone · Proyecto Capstone Intermedio 2026, Universidad Mayor</span>
          <span>
            Información del Hub:{" "}
            <a href="https://providencia.cl/provi/site/artic/20191001/pags/20191001171155.html" className="underline underline-offset-2">
              providencia.cl
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

/** La barra negra fija abajo: toda la barra es el botón. */
export function BottomBar({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="bottom-bar">
      {label} <ArrowRight size={18} aria-hidden="true" />
    </Link>
  );
}

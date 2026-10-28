import type { Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import "./landing.css";
import { DoorRace } from "@/components/landing/door-race";
import { HeroForm } from "@/components/landing/hero-form";
import { ImageSlot } from "@/components/landing/image-slot";
import { LabScroll } from "@/components/landing/lab-scroll";
import { Reveal } from "@/components/landing/reveal";
import { RoleTabs } from "@/components/landing/role-tabs";
import { SLOTS } from "@/components/landing/slots";

/*
 * Landing de AforoON, con el estilo de Uber (DESIGN.md): lienzo blanco, bandas negras,
 * tarjetas gris niebla y una interfaz sin color. El color llegará con las ilustraciones;
 * mientras tanto, cada espacio de imagen muestra una referencia o la idea de lo que va
 * (ver src/components/landing/slots.ts).
 * Contenido del Hub: providencia.cl y el documento del Hub Providencia.
 */

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "700"] });

export const viewport: Viewport = { themeColor: "#000000" };

const HUB = [
  {
    title: "Cowork general",
    text: "Para unas 200 personas, sin reserva previa. Wifi, salas de reuniones, zona infantil y pet friendly.",
    link: { href: "/reservar?zona=mesas", label: "Ver mesas" },
    slot: SLOTS.cardCowork,
  },
  {
    title: "Oficinas y set audiovisual",
    text: "Cuatro oficinas para 4 a 6 personas y un set para grabar, por bloques de dos horas.",
    link: { href: "/reservar?zona=oficinas", label: "Ver oficinas" },
    slot: SLOTS.cardOficinas,
  },
  {
    title: "Zona de charlas",
    text: "Sesenta sillas frente a las pantallas. Inscribirte te guarda el asiento.",
    link: { href: "/reservar?zona=charlas", label: "Ver charlas" },
    slot: SLOTS.cardCharlas,
  },
  {
    title: "Lab881",
    text: "Impresoras 3D, impresora de resina y cortadora láser, de uso gratuito.",
    link: { href: "#lab", label: "Conocer el lab" },
    slot: SLOTS.cardLab,
  },
  {
    title: "Cowork textil",
    text: "Máquinas y capacitaciones para aprender o perfeccionar el oficio textil.",
    link: { href: "#textil", label: "Conocer el cowork" },
    slot: SLOTS.cardTextil,
  },
  {
    title: "Empleo",
    text: "Orientación de CV, entrevistas e inclusión laboral en el Castillito Sermini.",
    link: { href: "/reservar?zona=salas", label: "Ver salas" },
    slot: SLOTS.cardEmpleo,
  },
];

const LAB_FACTS = [
  { label: "Horario", value: "Lunes a jueves de 9:00 a 17:30, viernes hasta 16:30." },
  { label: "Cupos", value: "15 reservas al año por persona, de hasta 18 horas cada una." },
  { label: "Cómo se reserva", value: "Hoy, por correo a innova@providencia.cl. Con AforoON, desde la app (próximamente)." },
];

const MORE = [
  { title: "GovTech Lab", text: "Cowork para startups que prueban soluciones para la ciudad.", slot: SLOTS.govtech },
  { title: "InGaming Providencia", text: "Comunidad de videojuegos y esports, junto a Esports Chile.", slot: SLOTS.ingaming },
  { title: "Comunidad EmprendePro", text: "Capacitaciones, asesorías y ferias gratis para emprender en la comuna.", slot: SLOTS.emprende },
];

const FAQ = [
  {
    q: "¿Tiene algún costo?",
    a: "No. El Hub Providencia es un espacio municipal gratuito, y su credencial también.",
  },
  {
    q: "¿Qué pasa con mi RUT?",
    a: "Se guarda cifrado y solo sirve para validar tu ingreso. Recepción ve tu nombre y tu foto, nunca el RUT completo. Puedes borrar tu cuenta cuando quieras (Ley 21.719).",
  },
  {
    q: "¿Y si mi teléfono no tiene NFC?",
    a: "Muestras el QR de la app. Cambia cada 30 segundos, así que una captura de pantalla no sirve para entrar.",
  },
  {
    q: "¿Y si no tengo smartphone?",
    a: "En recepción te registran en un minuto y entras dando tu RUT.",
  },
  {
    q: "¿Qué pasa si reservo y no llego?",
    a: "El cupo se libera al terminar el bloque. Si sabes que no vas, cancelas desde la app y queda libre al tiro.",
  },
];

const FOOTER = [
  {
    title: "AforoON",
    links: [
      { href: "/registro", label: "Crear mi credencial" },
      { href: "/reservar", label: "Reservar un espacio" },
      { href: "/inicio", label: "Mis reservas" },
    ],
  },
  {
    title: "El Hub",
    links: [
      { href: "#hub", label: "Qué hay en el Hub" },
      { href: "#lab", label: "Lab881" },
      { href: "#textil", label: "Cowork textil" },
      { href: "#preguntas", label: "Preguntas" },
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

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="3" />
      <path d="M12 3a9 9 0 0 1 8.2 12.7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
    </svg>
  );
}

export default function Landing() {
  return (
    <div className={`lp ${inter.variable}`}>
      <Reveal />

      {/* ------------------------------------------------------------ barra superior */}
      <header className="lp-nav">
        <nav aria-label="Principal" className="lp-wrap flex h-[var(--lp-bar)] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-[20px] font-bold">
            <Logo />
            AforoON
          </Link>
          <ul className="hidden items-center gap-1 md:flex">
            <li>
              <a href="#lab" className="lp-nav-link">Lab881</a>
            </li>
            <li>
              <a href="#hub" className="lp-nav-link">El Hub</a>
            </li>
            <li>
              <a href="#como" className="lp-nav-link">Cómo funciona</a>
            </li>
            <li>
              <a href="#preguntas" className="lp-nav-link">Preguntas</a>
            </li>
          </ul>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="lp-nav-link hidden md:inline-flex">
              Administración
            </Link>
            <Link href="/registro" className="lp-pill">
              Entrar
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ------------------------------------------------------------ portada */}
        <section aria-labelledby="hero-title" className="lp-wrap grid gap-10 pb-16 pt-10 md:grid-cols-2 md:items-center md:gap-16 md:pb-24 md:pt-16">
          <div className="flex flex-col gap-6">
            <p className="lp-place">
              Los Jesuitas 881, Providencia <span className="lp-place-note">Gratis</span>
            </p>
            <h1 id="hero-title" className="lp-display max-w-[14ch]">
              Entra al Hub Providencia con tu teléfono
            </h1>
            <p className="lp-sub max-w-[44ch]">
              AforoON es la credencial del Hub: te registras una vez, reservas viendo el cupo real y en la puerta solo acercas el teléfono.
            </p>
            <HeroForm />
          </div>
          <ImageSlot slot={SLOTS.hero} ratio="1/1" priority sizes="(min-width: 768px) 560px, 100vw" />
        </section>

        {/* ------------------------------------------------------------ Lab881 */}
        <section id="lab" aria-labelledby="lab-title" className="bg-[var(--lp-white)]">
          <div className="lp-wrap pt-4 md:pt-8" data-reveal>
            <p className="lp-caption lp-rise font-medium uppercase tracking-[0.08em] text-slate">Innovación · Lab881</p>
            <h2 id="lab-title" className="lp-heading lp-rise mt-2 max-w-[22ch]" style={{ ["--i" as string]: 1 }}>
              Fabrica tu idea en el primer laboratorio municipal gratuito del país
            </h2>
            <p className="lp-sub lp-rise mt-4 max-w-[52ch]" style={{ ["--i" as string]: 2 }}>
              Fabricación digital e impresión 3D para emprendedores, estudiantes y vecinos. Pasa por las máquinas:
            </p>
            <div className="mt-10 md:mt-14">
              <LabScroll />
            </div>
            <dl className="mt-4 grid gap-4 md:grid-cols-3">
              {LAB_FACTS.map((f) => (
                <div key={f.label} className="rounded-[8px] bg-[var(--lp-mist)] p-5 md:p-6">
                  <dt className="text-[16px] font-medium">{f.label}</dt>
                  <dd className="mt-1 text-[14px] leading-[1.5] text-slate">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ------------------------------------------------------------ qué hay en el Hub */}
        <section id="hub" aria-labelledby="hub-title" className="lp-wrap lp-section" data-reveal>
          <h2 id="hub-title" className="lp-heading lp-rise">
            Qué hay en el Hub
          </h2>
          <p className="lp-sub lp-rise mt-3 max-w-[56ch]" style={{ ["--i" as string]: 1 }}>
            Un espacio municipal y gratuito desde 2018, con tres áreas: Emprendimiento, Innovación y Empleo. Lunes a jueves de 8:30 a 18:00, viernes hasta las 17:00.
          </p>
          <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {HUB.map((c, i) => (
              <li key={c.title} className="lp-card lp-rise" style={{ ["--i" as string]: (i % 3) + 1 }}>
                <div className="flex flex-col">
                  <h3 className="text-[16px] font-medium">{c.title}</h3>
                  <p className="mt-1 flex-1 text-[14px] leading-[1.5] text-slate">{c.text}</p>
                  <Link href={c.link.href} className="lp-more mt-3 self-start">
                    {c.link.label}
                  </Link>
                </div>
                <ImageSlot slot={c.slot} ratio="1/1" compact sizes="104px" className="self-start" />
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------------ cowork textil */}
        <section id="textil" aria-labelledby="textil-title" className="lp-wrap lp-section grid gap-10 md:grid-cols-2 md:items-center md:gap-16" data-reveal>
          <div>
            <p className="lp-caption lp-rise font-medium uppercase tracking-[0.08em] text-slate">Emprendimiento · Cowork textil</p>
            <h2 id="textil-title" className="lp-heading lp-rise mt-2" style={{ ["--i" as string]: 1 }}>
              Aprende el oficio textil, con máquinas del Hub
            </h2>
            <p className="lp-sub lp-rise mt-4 max-w-[44ch]" style={{ ["--i" as string]: 2 }}>
              Un taller gratuito para que vecinas y vecinos aprendan o perfeccionen la costura y saquen adelante su emprendimiento. Con apoyo de TexSur.
            </p>
            <ul className="lp-rise mt-6" style={{ ["--i" as string]: 3 }}>
              <li className="lp-rule-row">Sala vitrina del Hub Providencia Fábrica</li>
              <li className="lp-rule-row">Lunes de 8:30 a 17:30 y viernes de 8:30 a 16:30</li>
              <li className="lp-rule-row">Gratis, con reserva previa del puesto</li>
            </ul>
          </div>
          <div className="lp-rise grid gap-4 md:grid-cols-[3fr_2fr]" style={{ ["--i" as string]: 2 }}>
            <ImageSlot slot={SLOTS.textilMaquina} className="lp-textil-slot" sizes="(min-width: 768px) 330px, 100vw" />
            <ImageSlot slot={SLOTS.textilMesa} className="lp-textil-slot lp-textil-slot--offset" sizes="(min-width: 768px) 220px, 100vw" />
          </div>
        </section>

        {/* ------------------------------------------------------------ cómo funciona */}
        <section id="como" aria-labelledby="como-title" className="lp-wrap lp-section" data-reveal>
          <h2 id="como-title" className="lp-heading lp-rise">
            AforoON para cada uno
          </h2>
          <p className="lp-sub lp-rise mt-3 max-w-[52ch]" style={{ ["--i" as string]: 1 }}>
            Hoy cada visita al Hub empieza con un formulario. Con AforoON, la puerta te reconoce.
          </p>
          <div className="lp-rise mt-10" style={{ ["--i" as string]: 2 }}>
            <RoleTabs />
          </div>
        </section>

        {/* ------------------------------------------------------------ la carrera de puertas */}
        <section aria-labelledby="race-title" className="bg-[var(--lp-mist)]" style={{ ["--surface" as string]: "var(--lp-white)" }}>
          <div className="lp-wrap lp-section" data-reveal>
            <h2 id="race-title" className="lp-heading lp-rise">
              Prueba las dos puertas
            </h2>
            <p className="lp-sub lp-rise mt-3 max-w-[52ch]" style={{ ["--i" as string]: 1 }}>
              Un toque arranca las dos. El formulario se escribe a ritmo de teléfono; la puerta de AforoON solo lee tu credencial.
            </p>
            <div className="lp-rise mt-10" style={{ ["--i" as string]: 2 }}>
              <DoorRace />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ también en el Hub */}
        <section aria-labelledby="more-title" className="lp-wrap lp-section" data-reveal>
          <h2 id="more-title" className="lp-heading lp-rise">
            También en el Hub
          </h2>
          <ul className="mt-10 grid gap-8 md:grid-cols-3 md:gap-4">
            {MORE.map((m, i) => (
              <li key={m.title} className="lp-rise" style={{ ["--i" as string]: i + 1 }}>
                <ImageSlot slot={m.slot} ratio="16/10" sizes="(min-width: 768px) 380px, 100vw" />
                <h3 className="mt-4 text-[18px] font-medium">{m.title}</h3>
                <p className="mt-1 text-[14px] leading-[1.5] text-slate">{m.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------------ preguntas */}
        <section id="preguntas" aria-labelledby="faq-title" className="lp-wrap lp-section grid gap-8 md:grid-cols-[1fr_2fr] md:gap-16" data-reveal>
          <h2 id="faq-title" className="lp-heading lp-rise">
            Preguntas
          </h2>
          <dl className="lp-rise" style={{ ["--i" as string]: 1 }}>
            {FAQ.map((f) => (
              <div key={f.q} className="lp-rule-row lp-rule-row--lg grid gap-1 md:grid-cols-2 md:gap-8">
                <dt className="text-[18px]">{f.q}</dt>
                <dd className="text-[16px] leading-[1.5] text-slate">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      {/* ------------------------------------------------------------ pie */}
      <footer className="bg-[var(--lp-black)] text-[var(--lp-white)]">
        <div className="lp-wrap py-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[20px] font-bold">
                <Logo /> AforoON
              </p>
              <p className="mt-3 max-w-[40ch] text-[14px] leading-[1.5] text-[var(--lp-ash)]">
                Hub Providencia · Los Jesuitas 881. Lunes a jueves de 8:30 a 18:00, viernes hasta las 17:00. hub@providencia.cl
              </p>
            </div>
            <Link href="/reservar" className="lp-btn lp-btn--invert self-start md:self-auto">
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
                      <Link href={l.href} className="text-[14px] text-[var(--lp-ash)] transition-colors hover:text-[var(--lp-white)]">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col gap-2 border-t border-[#333333] pt-6 text-[12px] leading-[1.67] text-[var(--lp-ash)] md:flex-row md:justify-between">
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

      {/* ------------------------------------------------------------ barra fija inferior */}
      <Link href="/registro" className="lp-bottom-bar">
        Crear mi credencial <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}

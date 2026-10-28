import Link from "next/link";
import { ArrowRight } from "lucide-react";
import "./landing.css";
import { DoorRace } from "@/components/landing/door-race";
import { HeroForm } from "@/components/landing/hero-form";
import { ImageSlot } from "@/components/landing/image-slot";
import { LabScroll } from "@/components/landing/lab-scroll";
import { Reveal } from "@/components/landing/reveal";
import { RoleTabs } from "@/components/landing/role-tabs";
import { BottomBar, SiteFooter, SiteNav } from "@/components/landing/site-chrome";
import { SLOTS } from "@/components/landing/slots";

/*
 * Landing de AforoON, con el estilo de Uber (DESIGN.md): lienzo blanco, bandas negras,
 * tarjetas gris niebla y una interfaz sin color. El color llegará con las ilustraciones;
 * mientras tanto, cada espacio de imagen muestra una referencia o la idea de lo que va
 * (ver src/components/landing/slots.ts).
 * Contenido del Hub: providencia.cl y el documento del Hub Providencia.
 */

const HUB = [
  {
    title: "Cowork general",
    text: "Para unas 200 personas, sin reserva previa. Wifi, salas de reuniones, zona infantil y pet friendly.",
    link: { href: "/hub/cowork", label: "Conocer el cowork" },
    slot: SLOTS.cardCowork,
  },
  {
    title: "Oficinas y set audiovisual",
    text: "Cuatro oficinas para 4 a 6 personas y un set para grabar, por bloques de dos horas.",
    link: { href: "/hub/oficinas", label: "Conocer las oficinas" },
    slot: SLOTS.cardOficinas,
  },
  {
    title: "Zona de charlas",
    text: "Sesenta sillas frente a las pantallas. Inscribirte te guarda el asiento.",
    link: { href: "/hub/charlas", label: "Conocer la zona" },
    slot: SLOTS.cardCharlas,
  },
  {
    title: "Lab881",
    text: "Impresoras 3D, impresora de resina y cortadora láser, de uso gratuito.",
    link: { href: "/hub/lab881", label: "Conocer el lab" },
    slot: SLOTS.cardLab,
  },
  {
    title: "Cowork textil",
    text: "Máquinas y capacitaciones para aprender o perfeccionar el oficio textil.",
    link: { href: "/hub/cowork-textil", label: "Conocer el cowork textil" },
    slot: SLOTS.cardTextil,
  },
  {
    title: "Empleo",
    text: "Orientación de CV, entrevistas e inclusión laboral en el Castillito Sermini.",
    link: { href: "/hub/empleo", label: "Conocer Empleo" },
    slot: SLOTS.cardEmpleo,
  },
];

const LAB_FACTS = [
  { label: "Horario", value: "Lunes a jueves de 9:00 a 17:30, viernes hasta 16:30." },
  { label: "Cupos", value: "15 reservas al año por persona, de hasta 18 horas cada una." },
  { label: "Cómo se reserva", value: "Te inscribes en la capacitación, el equipo del Hub la aprueba y reservas la máquina desde AforoON." },
];

const MORE = [
  { title: "GovTech Lab", text: "Cowork para startups que prueban soluciones para la ciudad.", slot: SLOTS.govtech, href: "/hub/govtech" },
  { title: "InGaming Providencia", text: "Comunidad de videojuegos y esports, junto a Esports Chile.", slot: SLOTS.ingaming, href: "/hub/ingaming" },
  { title: "Comunidad EmprendePro", text: "Capacitaciones, asesorías y ferias gratis para emprender en la comuna.", slot: SLOTS.emprende, href: "/hub/emprendepro" },
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

export default function Landing() {
  return (
    <div className="lp">
      <Reveal />

      <SiteNav />

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
        <section id="lab" aria-labelledby="lab-title" className="bg-[var(--white)]">
          <div className="lp-wrap pt-4 md:pt-8" data-reveal>
            <p className="lp-eyebrow lp-rise">Innovación · Lab881</p>
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
                <div key={f.label} className="rounded-[8px] bg-[var(--mist)] p-5 md:p-6">
                  <dt className="text-[16px] font-medium">{f.label}</dt>
                  <dd className="mt-1 text-[14px] leading-[1.5] text-slate">{f.value}</dd>
                </div>
              ))}
            </dl>
            <Link href="/hub/lab881" className="btn mt-6 max-md:w-full">
              Todo sobre el Lab881 <ArrowRight size={18} aria-hidden="true" />
            </Link>
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
              <li key={c.title} className="card lp-card lp-rise" style={{ ["--i" as string]: (i % 3) + 1 }}>
                <div className="flex flex-col">
                  <h3 className="text-[16px] font-medium">{c.title}</h3>
                  <p className="mt-1 flex-1 text-[14px] leading-[1.5] text-slate">{c.text}</p>
                  <Link href={c.link.href} className="link-more mt-3 self-start">
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
            <p className="lp-eyebrow lp-rise">Emprendimiento · Cowork textil</p>
            <h2 id="textil-title" className="lp-heading lp-rise mt-2" style={{ ["--i" as string]: 1 }}>
              Aprende el oficio textil, con máquinas del Hub
            </h2>
            <p className="lp-sub lp-rise mt-4 max-w-[44ch]" style={{ ["--i" as string]: 2 }}>
              Un taller gratuito para que vecinas y vecinos aprendan o perfeccionen la costura y saquen adelante su emprendimiento. Con apoyo de TexSur.
            </p>
            <ul className="lp-rise mt-6" style={{ ["--i" as string]: 3 }}>
              <li className="rule-row">Sala vitrina del Hub Providencia Fábrica</li>
              <li className="rule-row">Lunes de 8:30 a 17:30 y viernes de 8:30 a 16:30</li>
              <li className="rule-row">Gratis, con reserva previa del puesto</li>
            </ul>
            <Link href="/hub/cowork-textil" className="btn lp-rise mt-6 max-md:w-full" style={{ ["--i" as string]: 4 }}>
              Todo sobre el cowork textil <ArrowRight size={18} aria-hidden="true" />
            </Link>
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
        <section aria-labelledby="race-title" className="bg-[var(--mist)]" style={{ ["--surface" as string]: "var(--white)" }}>
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
                <Link href={m.href} className="link-more mt-2 inline-block" aria-label={`Más sobre ${m.title}`}>
                  Más información
                </Link>
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
              <div key={f.q} className="rule-row rule-row--lg grid gap-1 md:grid-cols-2 md:gap-8">
                <dt className="text-[18px]">{f.q}</dt>
                <dd className="text-[16px] leading-[1.5] text-slate">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <SiteFooter />
      <BottomBar href="/registro" label="Crear mi credencial" />
    </div>
  );
}

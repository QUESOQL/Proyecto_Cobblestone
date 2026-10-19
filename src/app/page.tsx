import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import "./landing.css";
import { DoorRace } from "@/components/landing/door-race";
import { Reveal } from "@/components/landing/reveal";
import { Showcase } from "@/components/landing/showcase";

/*
 * Landing de AforoON.
 * Idea: en el nombre AforoON, la segunda O es la puerta real del Edificio Cowork
 * (Los Jesuitas 881), recortada en el mismo anillo de la marca.
 * Lo que se puede hacer: comparar la puerta de hoy (formulario) con la de AforoON.
 */

const STAGES = [
  { time: "Dos minutos", seconds: 120, clause: "Primero, creas tu credencial con tu RUT y tu perfil. Una sola vez.", bg: "var(--accent-soft)", ink: "var(--accent-ink)" },
  { time: "Treinta segundos", seconds: 30, clause: "Después, eliges mesa, oficina o charla con el cupo real a la vista.", bg: "var(--accent-track)", ink: "var(--accent-ink)" },
  { time: "Siete segundos", seconds: 7, clause: "En la puerta, acercas el teléfono o muestras tu QR.", bg: "var(--accent)", ink: "#ffffff" },
  { time: "Las horas que necesites", seconds: 7200, clause: "Luego, el tiempo es tuyo: trabajas, aprendes o te reúnes.", bg: "var(--primary)", ink: "#ffffff" },
];
const TOTAL = STAGES.reduce((a, s) => a + s.seconds, 0);

const ROWS = [
  {
    title: "Oficinas 1 a 4",
    text: "Cuatro oficinas cerradas, para cuatro a seis personas, que se reservan completas por bloque de dos horas. Nadie llega a una oficina ocupada.",
    photo: { src: "/hub/oficina.jpg", alt: "La Oficina 1 del Edificio Cowork, con mesa redonda y sillas naranjas", w: 380, ratio: "4/5" },
  },
  {
    title: "Set audiovisual",
    text: "Luces, sillones y fondo para grabar un podcast o un video. Se reserva igual que una oficina y queda solo para tu equipo.",
    photo: { src: "/hub/set.jpg", alt: "El set audiovisual del Hub, con luces de estudio y dos sillones", w: 520, ratio: "3/2" },
  },
  {
    title: "Zona de charlas",
    text: "Sesenta sillas frente a las pantallas. Inscribirte en una charla te guarda el asiento, y si ya está llena lo sabes antes de ir.",
    photo: { src: "/hub/charlas.jpg", alt: "Charla en el Hub con el público sentado frente al escenario", w: 340, ratio: "1/1" },
  },
  {
    title: "Edificio Empleo",
    text: "Salas de capacitación por piso y una sala de entrevistas para reunirte a solas con un capacitador del Departamento de Empleo.",
    photo: { src: "/hub/empleo.jpg", alt: "Fachada del Edificio Empleo, con almenas y ventanas de rombos", w: 440, ratio: "4/5" },
  },
];

const FAQ = [
  {
    q: "¿Qué pasa con mi RUT?",
    a: "Se guarda cifrado y solo sirve para validar tu ingreso. En la puerta, recepción ve tu nombre y tu foto, nunca el RUT completo. Puedes borrar tu cuenta cuando quieras, como pide la Ley 21.719.",
  },
  { q: "¿Y si mi teléfono no tiene NFC?", a: "Muestras el QR dinámico de la app. Cambia cada 30 segundos, así que una captura de pantalla no sirve para entrar." },
  { q: "¿Qué pasa si se cae el internet?", a: "El terminal de la puerta sigue validando con la copia de las reservas del día y sincroniza cada entrada apenas vuelve la conexión." },
  { q: "¿Tiene algún costo?", a: "No. El Hub Providencia es un espacio municipal gratuito, y su credencial también." },
  { q: "¿Y si no tengo smartphone?", a: "En recepción te registran en un minuto y entras dando tu RUT. El registro queda igual que el de cualquier socio." },
  { q: "¿Qué pasa si reservo y no llego?", a: "El cupo se libera al terminar el bloque para que otra persona lo use. Si sabes que no vas, cancelas desde la app y queda libre al tiro." },
];

export default function Landing() {
  return (
    <div className="lp">
      <Reveal />

      {/* ------------------------------------------------------------ portada */}
      <header className="lp-wrap relative flex min-h-[100svh] flex-col">
        <nav aria-label="Principal" className="flex h-16 items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 text-[17px] font-semibold">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="var(--accent-track)" strokeWidth="3" />
              <path d="M12 3a9 9 0 0 1 8.2 12.7" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
              <circle cx="12" cy="12" r="3.2" fill="var(--accent)" />
            </svg>
            AforoON
          </Link>
          <ul className="hidden items-center gap-8 text-[14px] md:flex">
            <li>
              <a href="#como" className="lp-link">Cómo funciona</a>
            </li>
            <li>
              <a href="#espacios" className="lp-link">Espacios</a>
            </li>
            <li>
              <a href="#preguntas" className="lp-link">Preguntas</a>
            </li>
            <li>
              <Link href="/admin" className="lp-link">Administración</Link>
            </li>
            <li>
              <Link href="/avance" className="lp-link">Avance</Link>
            </li>
          </ul>
          <Link href="/registro" className="lp-link text-[17px] font-medium md:hidden">
            Entrar
          </Link>
        </nav>

        <div className="flex flex-1 items-center justify-center">
          <h1 className="lp-display whitespace-nowrap" aria-label="AforoON">
            <span aria-hidden="true">
              Aforo
              <span className="lp-o lp-shutter">
                <Image src="/hub/fachada.jpg" alt="" width={360} height={360} priority sizes="(min-width: 768px) 15vw, 30vw" className="object-[50%_44%]" />
              </span>
              N
            </span>
          </h1>
        </div>

        <div className="grid gap-5 pb-8 md:grid-cols-12 md:items-end md:pb-10">
          <p className="max-w-[34ch] text-[20px] leading-[1.45] md:col-span-5 md:col-start-6">
            La credencial para entrar al Hub Providencia: te registras una vez y en la puerta solo acercas el teléfono. Sin formulario en cada visita.
          </p>
          <div className="md:col-span-3 md:col-start-10 md:justify-self-end">
            <Link href="/registro" className="lp-btn w-full md:w-auto">
              Crear mi credencial <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ la frase con miniaturas + la prueba */}
      <section aria-labelledby="race-title" className="lp-wrap pb-[120px] pt-[120px] md:pt-[160px]" data-reveal>
        <p className="lp-statement lp-rise mx-auto max-w-[30ch] md:max-w-[44ch] md:text-center">
          Hoy, en Los Jesuitas 881
          <span className="lp-thumb">
            <Image src="/hub/fachada.jpg" alt="" width={120} height={80} className="object-[50%_45%]" />
          </span>
          , cada visita empieza con un formulario. Con AforoON reservas mesa
          <span className="lp-thumb">
            <Image src="/hub/cowork.jpg" alt="" width={120} height={80} className="object-[80%_58%]" />
          </span>
          o charla
          <span className="lp-thumb">
            <Image src="/hub/charlas.jpg" alt="" width={120} height={80} className="object-[50%_42%]" />
          </span>
          desde el teléfono.
        </p>

        <div className="mx-auto mt-[120px] max-w-[1100px] md:mt-[160px]">
          <h2 id="race-title" className="lp-heading lp-rise" style={{ ["--i" as string]: 1 }}>
            Prueba las dos puertas
          </h2>
          <p className="lp-body lp-rise mt-4 max-w-[52ch]" style={{ ["--i" as string]: 2 }}>
            Un toque arranca las dos al mismo tiempo. El formulario se escribe a ritmo de teléfono; la puerta de AforoON solo lee tu credencial.
          </p>
          <div className="lp-rise mt-10" style={{ ["--i" as string]: 3 }}>
            <DoorRace />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ cómo funciona */}
      <section id="como" aria-labelledby="como-title" className="lp-wrap py-[120px] md:py-[200px]" data-reveal>
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <h2 id="como-title" className="lp-heading lp-rise md:col-span-7">
            Una vez, y listo.
          </h2>
          <p className="lp-body lp-rise max-w-[36ch] md:col-span-4 md:col-start-9" style={{ ["--i" as string]: 1 }}>
            Registrarte toma dos minutos y se hace una sola vez. Entrar toma segundos. El resto del día es tuyo.
          </p>
        </div>
        <div className="lp-rise mt-16 flex flex-col gap-1.5 md:flex-row" data-ui style={{ ["--i" as string]: 1 }}>
          {STAGES.map((s) => (
            <div key={s.time} className="flex flex-col md:min-w-0" style={{ flexGrow: Math.max(0.17, s.seconds / TOTAL) * 100, flexBasis: 0 }}>
              <div className="flex min-h-[72px] items-start rounded-[6px] p-5 md:h-[22vh] md:min-h-[160px]" style={{ background: s.bg, color: s.ink }}>
                <h3 className="text-[20px] font-semibold leading-[1.2]">{s.time}</h3>
              </div>
              <p className="mt-3 max-w-[22ch] text-[17px] leading-[1.45]">{s.clause}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ vitrina fija */}
      <Showcase />

      {/* ------------------------------------------------------------ espacios */}
      <section id="espacios" aria-labelledby="esp-title" className="lp-wrap py-[120px] md:py-[200px]">
        <div className="grid md:grid-cols-12" data-reveal>
          <h2 id="esp-title" className="lp-heading lp-rise md:col-span-9 md:col-start-4">
            Todo el Hub, con su aforo
          </h2>
        </div>
        <div className="mt-16 flex flex-col gap-16 md:mt-24 md:gap-28">
          {ROWS.map((r, i) => (
            <article key={r.title} className="grid gap-6 md:grid-cols-12 md:items-start" data-reveal>
              <div className="md:col-span-4 md:col-start-4">
                <h3 className="lp-rise lp-statement font-semibold">{r.title}</h3>
                <p className="lp-body lp-rise mt-4 max-w-[34ch] text-text" style={{ ["--i" as string]: 1 }}>
                  {r.text}
                </p>
              </div>
              <div
                className={`lp-rise relative overflow-hidden md:col-span-4 md:col-start-9 md:justify-self-end ${i % 3 === 1 ? "ml-auto w-[70%]" : i % 3 === 2 ? "w-[55%]" : "w-full"} md:ml-0`}
                style={{ aspectRatio: r.photo.ratio, ["--i" as string]: 2, maxWidth: r.photo.w, width: undefined }}
              >
                <Image src={r.photo.src} alt={r.photo.alt} fill sizes={`${r.photo.w}px`} className="object-cover" />
              </div>
            </article>
          ))}

          {/* La administración: un fragmento real del dashboard, con datos de ejemplo. */}
          <article className="grid gap-6 md:grid-cols-12 md:items-start" data-reveal>
            <div className="md:col-span-4 md:col-start-4">
              <h3 className="lp-rise lp-statement font-semibold">Para la administración</h3>
              <p className="lp-body lp-rise mt-4 max-w-[34ch]" style={{ ["--i" as string]: 1 }}>
                Entradas, ocupación por zona, horas punta y quiénes vienen al Hub, medidos en la puerta en vez de estimados. Se exportan en un clic.
              </p>
              <Link href="/admin" className="lp-link lp-rise mt-5 inline-flex items-center gap-1.5 text-[17px] font-medium underline underline-offset-4" style={{ ["--i" as string]: 2 }}>
                Ver el dashboard <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <figure className="lp-rise md:col-span-5 md:col-start-8" style={{ ["--i" as string]: 2 }}>
              <div data-ui className="rounded-[8px] bg-surface p-4" style={{ boxShadow: "inset 0 0 0 1px var(--border)" }}>
                <p className="text-[14px] text-muted">Ocupación por bloque · Centro de mesas</p>
                <div className="mt-4 flex h-[200px] items-end gap-3" aria-hidden="true">
                  {[15, 40, 40, 32, 23, 10].map((v, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="w-full" style={{ height: `${(v / 40) * 170}px`, background: i < 2 ? "var(--accent)" : "var(--accent-track)" }} />
                      <span className="num text-[14px] text-muted">{8 + i * 2}</span>
                    </div>
                  ))}
                </div>
              </div>
              <figcaption className="mt-2 text-[14px] text-muted">Vista del dashboard, con datos de ejemplo.</figcaption>
            </figure>
          </article>
        </div>
      </section>

      {/* ------------------------------------------------------------ preguntas */}
      <section id="preguntas" aria-labelledby="faq-title" className="lp-wrap pb-[120px] md:pb-[200px]" data-reveal>
        <dl className="flex flex-col gap-14 md:gap-20">
          <div className="grid md:grid-cols-12">
            <h2 id="faq-title" className="lp-rise lp-statement text-muted md:col-span-6">
              Preguntas
            </h2>
          </div>
          {FAQ.map((f, i) => (
            <div key={f.q} className="grid gap-3 md:grid-cols-12 md:items-baseline">
              <dt className="lp-rise lp-statement md:col-span-6" style={{ ["--i" as string]: i % 3 }}>
                {f.q}
              </dt>
              <dd className="lp-body lp-rise max-w-[40ch] md:col-span-5 md:col-start-8" style={{ ["--i" as string]: (i % 3) + 1 }}>
                {f.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------------------------------------ cierre invertido + pie */}
      <section aria-labelledby="cta-title" className="bg-primary text-white">
        <div className="lp-wrap flex flex-col justify-between pb-10 pt-[120px] md:min-h-[80svh] md:pt-[18vh]" data-reveal>
          <h2 id="cta-title" className="lp-heading lp-rise max-w-[12ch]">
            Tu teléfono ya es la llave.
          </h2>
          <div className="mt-16 grid gap-6 md:grid-cols-12 md:items-end">
            <p className="lp-body lp-rise text-white/80 md:col-span-5" style={{ ["--i" as string]: 1 }}>
              Crea tu credencial en dos minutos y reserva tu primer espacio en el Hub Providencia.
            </p>
            <div className="lp-rise md:col-span-3 md:col-start-10 md:justify-self-end" style={{ ["--i" as string]: 2 }}>
              <Link href="/registro" className="lp-btn w-full !min-h-14 md:w-auto">
                Crear mi credencial <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative overflow-hidden bg-primary pt-[160px] text-white">
        <div className="lp-wrap grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <h2 className="lp-heading">Ven a trabajar al Hub.</h2>
            <Link href="/reservar" className="lp-btn lp-btn--invert mt-8">
              Reservar un espacio
            </Link>
          </div>
          <ul className="lp-body flex flex-col gap-2 md:col-span-3 md:col-start-10">
            <li>Los Jesuitas 881, Providencia</li>
            <li>Edificio Cowork y Edificio Empleo</li>
            <li>
              <Link href="/avance" className="underline underline-offset-4">
                Avance del prototipo
              </Link>
            </li>
            <li>
              <a href="https://github.com/QUESOQL/Proyecto_Cobblestone" className="underline underline-offset-4">
                Repositorio del equipo
              </a>
            </li>
          </ul>
        </div>
        <div className="lp-wrap mt-24 flex flex-wrap justify-between gap-3 text-[14px] text-white/70">
          <span>Equipo Cobblestone · Proyecto Capstone Intermedio 2026, Universidad Mayor</span>
          <span>Fotos: Equipo Cobblestone, salida a terreno al Hub Providencia</span>
        </div>
        <p
          aria-hidden="true"
          className="mt-2 whitespace-nowrap px-[var(--m)] text-[28vw] font-bold leading-[0.8] tracking-[-0.06em] text-white"
          style={{ transform: "translateY(30%)" }}
        >
          AforoON
        </p>
      </footer>
    </div>
  );
}

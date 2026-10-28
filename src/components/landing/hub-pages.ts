import { SLOTS, type Slot } from "./slots";

/*
 * Contenido de las páginas /hub/[slug]. Solo información del Hub publicada en providencia.cl
 * y en el documento del Hub Providencia. Lo que esas fuentes no dicen se escribe
 * "Por confirmar" (la página lo muestra tal cual) en vez de inventarlo.
 */

export const TBD = "Por confirmar";

export type HubPage = {
  slug: string;
  area: string;
  title: string;
  /** Una frase para la tarjeta y la descripción de la página. */
  summary: string;
  intro: string;
  hero: Slot;
  gallery?: Slot[];
  includes: string[];
  facts: { label: string; value: string }[];
  requirements: string[];
  /** Pasos para reservar o participar. */
  steps: string[];
  cta: { href: string; label: string };
  secondary?: { href: string; label: string };
  /** Reglas propias del espacio (Lab881). */
  rules?: { title: string; items: string[] };
  faq: { q: string; a: string }[];
  /** Página corta: sin pasos ni reglas. */
  short?: boolean;
};

export const HUB_PAGES: HubPage[] = [
  {
    slug: "lab881",
    area: "Innovación",
    title: "Lab881",
    summary: "El primer laboratorio municipal gratuito de fabricación digital e impresión 3D del país.",
    intro:
      "Acerca la tecnología a emprendedores, estudiantes y vecinos para que materialicen sus ideas con prototipado rápido. Las máquinas se usan gratis: solo se aporta el material del proyecto.",
    hero: SLOTS.cardLab,
    gallery: [SLOTS.labFilamento, SLOTS.labMulticolor, SLOTS.labResina, SLOTS.labLaser],
    includes: [
      "Impresoras 3D de filamento Ender 3 V3 SE",
      "Impresora 3D Creality K1C",
      "Impresora multifilamento Creality Sparkx i7",
      "Impresora de resina Halot Mage 8K, con curadora",
      "Cortadora láser de 100 W, cama de 90 × 60 cm",
      "Herramientas de post-procesado",
    ],
    facts: [
      { label: "Horario", value: "Lunes a jueves de 9:00 a 17:30, viernes hasta las 16:30. Las horas para agendar cierran media hora antes." },
      { label: "Lugar", value: "Hub Providencia, Los Jesuitas 881" },
      { label: "Costo", value: "Gratis. Se aporta el material del proyecto." },
      { label: "Contacto", value: "innova@providencia.cl" },
    ],
    requirements: [
      "Cualquier persona puede usarlo. Menores de edad, con un adulto responsable.",
      "Pasar por la capacitación obligatoria de la máquina que vas a usar.",
      "Traer el archivo de impresión o corte y el material.",
    ],
    steps: [
      "Inscríbete en la capacitación de la máquina (impresión 3D, resina o corte láser).",
      "Asiste: el equipo del Hub marca tu asistencia y aprueba la capacitación.",
      "Reserva la máquina en AforoON eligiendo día, hora y duración.",
    ],
    cta: { href: "/capacitaciones?tipo=impresion3d", label: "Inscribirme en una capacitación" },
    secondary: { href: "/maquinas", label: "Reservar una máquina" },
    rules: {
      title: "Reglas de uso",
      items: [
        "15 reservas al año por persona: 6 de 1 a 2 h, 4 de 3 a 5 h, 3 de 6 a 9 h y 2 de 10 a 18 h.",
        "Hasta 18 horas por trabajo. Las impresiones largas pueden seguir de noche.",
        "Si llegas 20 minutos tarde, la reserva se cancela y queda anotado en tu ficha.",
        "Atrasos repetidos: advertencia, amonestación, suspensión de un mes y suspensión definitiva.",
      ],
    },
    faq: [
      { q: "¿Realmente es gratis?", a: "Sí. Solo aportas el material de tu proyecto." },
      { q: "¿Puedo reservar más de una máquina a la vez?", a: "Sí, si están disponibles." },
      { q: "¿Con cuánta anticipación reservo?", a: "No hay plazo mínimo, pero se recomienda reservar con al menos dos días." },
      { q: "¿Qué proyectos puedo hacer?", a: "Fabricación digital, prototipado y hardware." },
    ],
  },
  {
    slug: "cowork-textil",
    area: "Emprendimiento",
    title: "Cowork textil",
    summary: "Un taller gratuito para aprender o perfeccionar el oficio textil.",
    intro:
      "Espacio de trabajo y creación para que vecinas y vecinos adquieran o perfeccionen sus conocimientos en el área textil y saquen adelante su emprendimiento. Cuenta con el apoyo de TexSur.",
    hero: SLOTS.textilMaquina,
    gallery: [SLOTS.textilMesa],
    includes: ["Máquinas de coser (cantidad y modelos: por confirmar)", "Capacitaciones en el área textil", "Mesa de trabajo para cortar y armar"],
    facts: [
      { label: "Horario", value: "Lunes de 8:30 a 17:30 y viernes de 8:30 a 16:30" },
      { label: "Lugar", value: "Sala vitrina del Hub Providencia Fábrica (piso: por confirmar)" },
      { label: "Costo", value: "Gratis" },
      { label: "Contacto", value: "hub@providencia.cl" },
    ],
    requirements: ["Reservar el puesto y esperar la confirmación.", "Para usar las máquinas de coser, la capacitación de costura aprobada."],
    steps: [
      "Inscríbete en la capacitación de costura.",
      "Cuando el equipo la apruebe, reserva una máquina en AforoON.",
      "Llega a la hora: el puesto queda listo para ti.",
    ],
    cta: { href: "/capacitaciones?tipo=costura", label: "Inscribirme en costura" },
    secondary: { href: "/maquinas?espacio=textil", label: "Reservar una máquina" },
    faq: [
      { q: "¿Necesito saber coser?", a: "No. La capacitación es justamente para aprender o perfeccionar el oficio." },
      { q: "¿Tengo que traer materiales?", a: TBD },
    ],
  },
  {
    slug: "cowork",
    area: "Comunidad",
    title: "Cowork general",
    summary: "Espacio libre y gratuito para unas 200 personas, sin reserva previa.",
    intro:
      "Espacio municipal de uso libre y gratuito para público general. Busca crear un ecosistema de emprendimiento, innovación, empleo, artes y oficios. Se puede llegar sin reservar; con AforoON ves antes cuántos puestos quedan en el centro de mesas.",
    hero: SLOTS.cardCowork,
    gallery: [SLOTS.coworkInfantil],
    includes: ["Wifi gratuito", "Talleres, workshops y actividades gratuitas", "Salas de reuniones privadas", "Bicicletero", "Zonas de descanso y zona infantil", "Pet friendly"],
    facts: [
      { label: "Horario", value: "Lunes a jueves de 8:30 a 18:00, viernes hasta las 17:00" },
      { label: "Capacidad", value: "Unas 200 personas" },
      { label: "Lugar", value: "Hub Providencia, Los Jesuitas 881" },
      { label: "Contacto", value: "hub@providencia.cl" },
    ],
    requirements: ["Ninguno para entrar.", "Para reservar una mesa con AforoON: tu credencial."],
    steps: ["Crea tu credencial una vez.", "Reserva una mesa viendo el cupo real.", "En la puerta, acerca el teléfono."],
    cta: { href: "/reservar?zona=mesas", label: "Reservar una mesa" },
    secondary: { href: "/registro", label: "Crear mi credencial" },
    faq: [
      { q: "¿Tengo que reservar?", a: "No. Reservar te asegura un puesto en el centro de mesas en las horas más llenas." },
      { q: "¿Puedo ir con mi perro?", a: "Sí, el espacio es pet friendly." },
    ],
  },
  {
    slug: "oficinas",
    area: "Comunidad",
    title: "Oficinas y set audiovisual",
    summary: "Cuatro oficinas cerradas y un set para grabar, por bloques de dos horas.",
    intro:
      "Cuatro oficinas cerradas para 4 a 6 personas y un set audiovisual con luces y sillones para grabar un podcast o un video. Se reservan completas: nadie llega a una oficina ocupada.",
    hero: SLOTS.cardOficinas,
    gallery: [SLOTS.oficinasSet],
    includes: ["Oficinas 1 y 2: hasta 4 personas, mesa redonda y pizarra", "Oficinas 3 y 4: hasta 6 personas, escritorio largo y pantalla", "Set audiovisual: luces, sillones y fondo"],
    facts: [
      { label: "Horario", value: "Lunes a jueves de 8:30 a 18:00, viernes hasta las 17:00" },
      { label: "Reserva", value: "Por bloques de dos horas, de uso exclusivo" },
      { label: "Lugar", value: "Hub Providencia, Los Jesuitas 881" },
      { label: "Contacto", value: "hub@providencia.cl" },
    ],
    requirements: ["Tu credencial de AforoON."],
    steps: ["Elige la oficina o el set.", "Elige el día y el bloque libre.", "Confirma: el espacio queda solo para tu equipo."],
    cta: { href: "/reservar?zona=oficinas", label: "Reservar una oficina" },
    faq: [{ q: "¿Cuántas reservas puedo tener?", a: "Hasta tres reservas activas a la vez." }],
  },
  {
    slug: "charlas",
    area: "Comunidad",
    title: "Zona de charlas",
    summary: "Sesenta sillas frente a las pantallas, para charlas y talleres gratuitos.",
    intro:
      "Aquí se dictan las charlas, talleres y capacitaciones gratuitas del Hub: marketing digital, ventas, formalización y empleo, entre otros temas. Inscribirte te guarda el asiento y, si está llena, lo sabes antes de ir.",
    hero: SLOTS.cardCharlas,
    gallery: [SLOTS.charlasTaller],
    includes: ["60 sillas y pantallas", "Charlas y talleres gratuitos", "Capacitaciones de la Comunidad EmprendePro"],
    facts: [
      { label: "Horario", value: "Según cada charla" },
      { label: "Lugar", value: "Hub Providencia, Los Jesuitas 881" },
      { label: "Costo", value: "Gratis" },
      { label: "Contacto", value: "hub@providencia.cl" },
    ],
    requirements: ["Tu credencial de AforoON para inscribirte."],
    steps: ["Revisa las charlas de la semana en la app.", "Inscríbete con un toque.", "El día de la charla, entra con tu teléfono."],
    cta: { href: "/inicio", label: "Ver las charlas de la semana" },
    faq: [{ q: "¿Y si la charla está llena?", a: "La app te lo muestra antes de ir, y puedes elegir otra." }],
  },
  {
    slug: "empleo",
    area: "Empleo",
    title: "Empleo",
    summary: "Orientación de CV, entrevistas e inclusión laboral en el Castillito Sermini.",
    intro:
      "El Departamento de Empleo apoya a vecinas y vecinos que buscan insertarse o reinsertarse en el mundo laboral, con atención especial a mujeres, jóvenes y personas mayores, y conecta a quienes buscan trabajo con empresas que valoran el talento local.",
    hero: SLOTS.cardEmpleo,
    gallery: [SLOTS.empleoAsesoria],
    includes: [
      "Consultoría profesional: CV, orientación, entrenamiento de entrevistas y capacitaciones",
      "Inclusión laboral para personas en situación de discapacidad y personas mayores",
      "Línea regular: rubros administrativos, de servicios y operativos",
      "Empleo doméstico",
      "Entrevistas masivas con empleadores",
    ],
    facts: [
      { label: "Atención", value: "Lunes a viernes de 8:30 a 13:00" },
      { label: "Lugar", value: "Castillito Sermini, Los Jesuitas 881" },
      { label: "Contacto", value: "empleo@providencia.cl" },
      { label: "Costo", value: "Gratis" },
    ],
    requirements: ["Pensado para vecinas y vecinos de Providencia. Requisitos de cada programa: por confirmar."],
    steps: ["Reserva una sala o una reunión con un capacitador en AforoON.", "Llega con tu CV si lo tienes.", "El equipo te orienta y te conecta con ofertas."],
    cta: { href: "/reservar?zona=salas", label: "Reservar en Empleo" },
    faq: [{ q: "¿Las empresas también pueden publicar ofertas?", a: "Sí, a través de la bolsa de trabajo del Departamento de Empleo." }],
  },
  {
    slug: "govtech",
    area: "Innovación",
    title: "GovTech Lab",
    summary: "Cowork municipal para startups que desarrollan soluciones para la ciudad.",
    intro:
      "Una comunidad de innovación en un cowork gratuito, rodeado de proyectos y empresas ligadas a la innovación. Tiene acceso limitado: aquí trabajan proyectos con residencia, en oficinas y espacio maker.",
    hero: SLOTS.govtech,
    includes: ["Mesas de trabajo y salas de reuniones", "Wifi, agua, luz, baños y comedor", "Residencias GovTech y Fábrica de startups"],
    facts: [
      { label: "Para quién", value: "Startups con una solución innovadora y tecnológica" },
      { label: "Acceso", value: "Por postulación, con bases anuales" },
      { label: "Horario", value: TBD },
      { label: "Contacto", value: "innova@providencia.cl" },
    ],
    requirements: ["Postular según las bases vigentes."],
    steps: [],
    cta: { href: "/registro", label: "Crear mi credencial" },
    faq: [],
    short: true,
  },
  {
    slug: "ingaming",
    area: "Innovación",
    title: "InGaming Providencia",
    summary: "Espacio comunitario de videojuegos y esports, junto a Esports Chile.",
    intro:
      "Un espacio comunitario desarrollado con Esports Chile, la Asociación Chilena de Esports, donde desarrolladores, jugadores profesionales, creadores de contenido y entusiastas de los videojuegos se encuentran y conectan.",
    hero: SLOTS.ingaming,
    includes: ["Espacio para trabajar, colaborar y compartir ideas", "Comunidad de la industria de videojuegos y tecnología"],
    facts: [
      { label: "Para quién", value: "Personas, empresas o startups de videojuegos" },
      { label: "Horario", value: TBD },
      { label: "Cómo se accede", value: TBD },
      { label: "Contacto", value: "innova@providencia.cl" },
    ],
    requirements: [],
    steps: [],
    cta: { href: "/registro", label: "Crear mi credencial" },
    faq: [],
    short: true,
  },
  {
    slug: "emprendepro",
    area: "Emprendimiento",
    title: "Comunidad EmprendePro",
    summary: "Capacitaciones, asesorías y ferias gratis para emprender en la comuna.",
    intro:
      "La comunidad del Departamento de Emprendimiento: capacitaciones, asistencia técnica y cupos en ferias para vender tus productos, además del programa Mujeres Jefas de Hogar.",
    hero: SLOTS.emprende,
    includes: ["Capacitaciones gratuitas en marketing digital, ventas, formalización y más", "Asesorías para crear tu empresa", "Ferias de emprendimiento en distintos puntos de la comuna"],
    facts: [
      { label: "Para quién", value: "Vecinos emprendedores y empresas con patente en Providencia" },
      { label: "Atención", value: "Lunes a viernes de 9:00 a 14:00" },
      { label: "Cómo se accede", value: "Inscripción en Providencia VForm" },
      { label: "Contacto", value: "emprendeprovidencia@providencia.cl" },
    ],
    requirements: [],
    steps: [],
    cta: { href: "/hub/charlas", label: "Ver la zona de charlas" },
    faq: [],
    short: true,
  },
];

export const hubPage = (slug: string) => HUB_PAGES.find((p) => p.slug === slug);

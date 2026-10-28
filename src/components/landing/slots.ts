import {
  Box,
  Gamepad2,
  Layers,
  type LucideIcon,
  Monitor,
  Palette,
  Presentation,
  Printer,
  Rocket,
  Scissors,
  Shirt,
  Smartphone,
  Store,
  Users,
  Zap,
} from "lucide-react";

/*
 * Todos los espacios de imagen de la landing, en un solo lugar.
 * Las imágenes definitivas serán ilustraciones planas al estilo de Uber (color solo dentro
 * de la ilustración). Mientras no existan, cada espacio muestra una foto de referencia
 * (`ref`) o un panel "Imagen pendiente" con la idea de lo que va ahí.
 *
 * Para poner la imagen final: guárdala en public/landing/<id>.png (o .jpg) y escribe esa
 * ruta en `src`. `src` gana sobre `ref`.
 */

export type Slot = {
  id: string;
  /** Qué debería mostrar la imagen definitiva. */
  idea: string;
  /** Texto alternativo cuando hay imagen. */
  alt: string;
  icon: LucideIcon;
  /** Imagen definitiva. */
  src?: string;
  /** Foto o captura provisoria que indica qué va ahí. */
  ref?: string;
};

const slot = (s: Slot) => s;

export const SLOTS = {
  hero: slot({
    id: "hero",
    idea: "Una vecina acerca el teléfono al lector de la puerta del Hub, en Los Jesuitas 881, y la luz se pone verde.",
    alt: "Fachada del Hub Providencia en Los Jesuitas 881",
    icon: Smartphone,
    ref: "/hub/fachada.jpg",
  }),

  // Lab881, en el orden en que aparecen al hacer scroll.
  labFilamento: slot({
    id: "lab-filamento",
    idea: "Primer plano de la boquilla de una impresora 3D de filamento (Ender 3 V3 SE o Creality K1C) dejando una capa, con la pieza a medio formar.",
    alt: "Impresora 3D de filamento imprimiendo una pieza",
    icon: Printer,
  }),
  labMulticolor: slot({
    id: "lab-multicolor",
    idea: "Una pieza de varios colores saliendo de la impresora multifilamento Creality Sparkx i7, con los carretes de colores detrás.",
    alt: "Pieza multicolor en la impresora multifilamento",
    icon: Palette,
  }),
  labResina: slot({
    id: "lab-resina",
    idea: "La plataforma de la impresora de resina Halot Mage 8K subiendo desde la tina, con una figura muy detallada colgando; al lado, la curadora con luz UV.",
    alt: "Impresora de resina con una pieza recién impresa",
    icon: Layers,
  }),
  labLaser: slot({
    id: "lab-laser",
    idea: "La cortadora láser de 100 W y 90 × 60 cm cortando una plancha de madera o acrílico, con el punto de luz y el humo del corte.",
    alt: "Cortadora láser cortando una plancha de madera",
    icon: Zap,
  }),
  labPiezas: slot({
    id: "lab-piezas",
    idea: "Una mesa con prototipos terminados: piezas 3D, cortes láser en madera y figuras de resina, listos para llevar.",
    alt: "Prototipos terminados en el Lab881",
    icon: Box,
  }),

  // Tarjetas "Qué hay en el Hub".
  cardCowork: slot({
    id: "card-cowork",
    idea: "El cowork general lleno: mesas largas, notebooks y un perro durmiendo bajo una mesa (el espacio es pet friendly).",
    alt: "Cowork general del Hub Providencia",
    icon: Users,
    ref: "/hub/cowork.jpg",
  }),
  cardOficinas: slot({
    id: "card-oficinas",
    idea: "Una oficina cerrada con un equipo reunido alrededor de la mesa redonda.",
    alt: "Oficina del Edificio Cowork",
    icon: Users,
    ref: "/hub/oficina.jpg",
  }),
  cardCharlas: slot({
    id: "card-charlas",
    idea: "La zona de charlas con el público sentado frente a las pantallas.",
    alt: "Charla en el Hub con el público frente al escenario",
    icon: Presentation,
    ref: "/hub/charlas.jpg",
  }),
  cardLab: slot({
    id: "card-lab",
    idea: "Una impresora 3D vista de frente, con una pieza naranja en la cama.",
    alt: "Impresora 3D del Lab881",
    icon: Printer,
  }),
  cardTextil: slot({
    id: "card-textil",
    idea: "Una máquina de coser con tela e hilo de color.",
    alt: "Máquina de coser del Cowork textil",
    icon: Scissors,
  }),
  cardEmpleo: slot({
    id: "card-empleo",
    idea: "El Castillito Sermini, sede del Departamento de Empleo, con sus almenas.",
    alt: "Edificio Empleo, el Castillito Sermini",
    icon: Users,
    ref: "/hub/empleo.jpg",
  }),

  // Cowork textil.
  textilMaquina: slot({
    id: "textil-maquina",
    idea: "Primer plano de una máquina de coser: la aguja bajando sobre una tela de color, el hilo tenso y las manos guiando la costura.",
    alt: "Máquina de coser cosiendo una tela",
    icon: Scissors,
  }),
  textilMesa: slot({
    id: "textil-mesa",
    idea: "La mesa de trabajo textil de la sala vitrina: moldes, tijeras, rollos de tela y vecinas aprendiendo el oficio.",
    alt: "Mesa de trabajo del Cowork textil",
    icon: Shirt,
  }),

  // AforoON según quién lo usa.
  rolVecino: slot({
    id: "rol-vecino",
    idea: "Un teléfono con la credencial de AforoON en pantalla: foto, nombre y el QR que cambia cada 30 segundos.",
    alt: "Credencial de AforoON en el teléfono",
    icon: Smartphone,
    ref: "/landing/ref-credencial.png",
  }),
  rolRecepcion: slot({
    id: "rol-recepcion",
    idea: "La tablet de recepción junto a la puerta mostrando una entrada aprobada en verde.",
    alt: "Terminal de recepción de AforoON",
    icon: Monitor,
    ref: "/landing/ref-terminal.png",
  }),
  rolAdmin: slot({
    id: "rol-admin",
    idea: "El dashboard de la administración con la ocupación por zona y las horas punta del día.",
    alt: "Dashboard de administración de AforoON",
    icon: Monitor,
    ref: "/landing/ref-dashboard.png",
  }),

  // "También en el Hub".
  govtech: slot({
    id: "govtech",
    idea: "El GovTech Lab: un equipo de startup trabajando frente a un prototipo, en el segundo piso.",
    alt: "GovTech Lab del Hub Providencia",
    icon: Rocket,
  }),
  ingaming: slot({
    id: "ingaming",
    idea: "InGaming Providencia: sillas gamer y pantallas con luz de colores, junto a Esports Chile.",
    alt: "Espacio InGaming Providencia",
    icon: Gamepad2,
  }),
  emprende: slot({
    id: "emprende",
    idea: "Una feria de emprendimiento EmprendePro al aire libre, con puestos de productos locales.",
    alt: "Feria de emprendimiento de la Comunidad EmprendePro",
    icon: Store,
  }),
};

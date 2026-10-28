import Image from "next/image";
import type { CSSProperties } from "react";
import type { Slot } from "./slots";

/*
 * Panel de imagen al estilo de Uber: rectángulo gris niebla, 8 px de radio, sin sombra.
 * - Con `src`: la imagen definitiva.
 * - Con `ref`: la foto provisoria, con una etiqueta que avisa que se reemplaza.
 * - Sin nada: el ícono y la idea de lo que va ahí.
 * `data-slot` deja encontrar cada espacio en el DOM por su id.
 */
export function ImageSlot({
  slot,
  ratio,
  sizes = "(min-width: 768px) 40vw, 100vw",
  compact = false,
  priority = false,
  className = "",
  style,
}: {
  slot: Slot;
  ratio?: string;
  sizes?: string;
  /** Para tarjetas: solo el ícono, sin texto de la idea. */
  compact?: boolean;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const image = slot.src ?? slot.ref;
  const Icon = slot.icon;

  return (
    <div
      data-slot={slot.id}
      title={image ? undefined : slot.idea}
      className={`lp-slot ${className}`}
      style={{ aspectRatio: ratio, ...style }}
    >
      {image ? (
        <>
          <Image src={image} alt={slot.alt} fill sizes={sizes} priority={priority} className="object-cover" />
          {!slot.src && !compact && <span className="lp-slot-tag">Imagen de referencia</span>}
        </>
      ) : (
        <div className={`flex h-full flex-col ${compact ? "items-center justify-center" : "justify-between p-5 md:p-6"}`}>
          {!compact && <span className="lp-caption text-slate">Imagen pendiente</span>}
          <span className={`lp-slot-icon ${compact ? "" : "self-start"}`} aria-hidden="true">
            <Icon size={compact ? 22 : 26} strokeWidth={1.75} />
          </span>
          {!compact && <p className="max-w-[40ch] text-[14px] leading-[1.5] text-slate">{slot.idea}</p>}
        </div>
      )}
    </div>
  );
}

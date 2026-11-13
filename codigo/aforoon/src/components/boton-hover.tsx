import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

/*
 * Botón píldora con la animación "Interactive Hover Button" de Magic UI (licencia MIT,
 * https://magicui.design/docs/components/interactive-hover-button), adaptado a un enlace y a
 * los colores de AforoON: blanco sobre la barra negra; al pasar el puntero, el punto negro
 * crece hasta llenar el botón y el texto vuelve a entrar en blanco con una flecha.
 * El hover de Tailwind 4 solo aplica con puntero fino, así que en el teléfono no queda pegado.
 */
export function BotonHover({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`group relative inline-flex h-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white bg-white px-5 text-[14px] font-medium text-black ${className ?? ""}`}
    >
      <span className="flex items-center justify-center gap-2">
        <span
          className="size-2 rounded-full bg-black transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-[100.8] motion-reduce:transition-none"
          aria-hidden="true"
        />
        <span className="inline-block transition-all duration-300 ease-[var(--ease-out)] group-hover:translate-x-12 group-hover:opacity-0 motion-reduce:transition-none">
          {children}
        </span>
      </span>
      <span
        className="absolute inset-0 z-10 flex translate-x-12 items-center justify-center gap-1.5 text-white opacity-0 transition-all duration-300 ease-[var(--ease-out)] group-hover:-translate-x-1 group-hover:opacity-100 motion-reduce:transition-none"
        aria-hidden="true"
      >
        {children}
        <ArrowRight size={16} />
      </span>
    </Link>
  );
}

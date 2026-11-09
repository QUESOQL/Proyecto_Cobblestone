import type { ReactNode } from "react";
import "@/app/landing.css";
import { SiteFooter, SiteNav } from "./site-chrome";

/*
 * Plantilla de las páginas legales (/privacidad y /terminos): mismo estilo que la landing,
 * texto en una columna legible y un aviso visible de que es un borrador del prototipo.
 */

export type Seccion = { titulo: string; contenido: ReactNode };

export const POR_CONFIRMAR = <span className="rounded-[8px] bg-[var(--hair)] px-2 py-0.5">Por confirmar</span>;

export function PaginaLegal({ titulo, actualizado, intro, secciones }: { titulo: string; actualizado: string; intro: ReactNode; secciones: Seccion[] }) {
  return (
    <div className="lp">
      <SiteNav />
      <main className="lp-wrap pb-20 pt-10 md:pt-16">
        <article className="max-w-[72ch]">
          <p className="lp-eyebrow">AforoON · Hub Providencia</p>
          <h1 className="lp-display mt-2">{titulo}</h1>
          <p className="mt-3 text-[14px] text-slate">Última actualización: {actualizado}</p>

          <p className="card mt-6 !p-4 text-[14px] leading-[1.5]">
            Borrador para el prototipo académico AforoON. Antes de usarse con vecinas y vecinos reales debe revisarlo el área jurídica
            de la Municipalidad de Providencia.
          </p>

          <div className="lp-sub mt-8 !text-[var(--black)]">{intro}</div>

          <nav aria-label="Contenido" className="mt-8">
            <ol className="flex flex-col gap-1 text-[14px]">
              {secciones.map((s, i) => (
                <li key={s.titulo}>
                  <a href={`#s${i + 1}`} className="link-more !font-normal">
                    {i + 1}. {s.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {secciones.map((s, i) => (
            <section key={s.titulo} id={`s${i + 1}`} aria-labelledby={`s${i + 1}-t`} className="mt-10 scroll-mt-20">
              <h2 id={`s${i + 1}-t`} className="lp-heading-sm">
                {i + 1}. {s.titulo}
              </h2>
              <div className="legal mt-3 flex flex-col gap-3 text-[16px] leading-[1.6]">{s.contenido}</div>
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

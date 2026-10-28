import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "../../landing.css";
import { HUB_PAGES, TBD, hubPage } from "@/components/landing/hub-pages";
import { ImageSlot } from "@/components/landing/image-slot";
import { BottomBar, SiteFooter, SiteNav } from "@/components/landing/site-chrome";

/*
 * Página de detalle de cada espacio del Hub, con el mismo estilo que la landing:
 * qué es, qué incluye, horario y lugar, requisitos, cómo se reserva y preguntas.
 * El contenido vive en components/landing/hub-pages.ts.
 */

export function generateStaticParams() {
  return HUB_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = hubPage((await params).slug);
  return page ? { title: `${page.title} · AforoON`, description: page.summary } : {};
}

/** Marca visible para lo que las fuentes no confirman. */
function Value({ text }: { text: string }) {
  return text === TBD ? <span className="rounded-[8px] bg-[var(--hair)] px-2 py-0.5 text-[14px]">{TBD}</span> : <>{text}</>;
}

export default async function HubDetail({ params }: { params: Promise<{ slug: string }> }) {
  const page = hubPage((await params).slug);
  if (!page) notFound();

  return (
    <div className="lp">
      <SiteNav />

      <main>
        {/* ------------------------------------------------------------ portada */}
        <section aria-labelledby="hub-title" className="lp-wrap grid gap-10 pb-12 pt-8 md:grid-cols-2 md:items-center md:gap-16 md:pb-20 md:pt-12">
          <div className="flex flex-col gap-5">
            <Link href="/#hub" className="link-more inline-flex items-center gap-1.5 self-start">
              <ArrowLeft size={16} aria-hidden="true" /> Todo el Hub
            </Link>
            <p className="lp-eyebrow">{page.area}</p>
            <h1 id="hub-title" className="lp-display">
              {page.title}
            </h1>
            <p className="lp-sub max-w-[46ch]">{page.intro}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={page.cta.href} className="btn">
                {page.cta.label} <ArrowRight size={18} aria-hidden="true" />
              </Link>
              {page.secondary && (
                <Link href={page.secondary.href} className="btn btn--quiet">
                  {page.secondary.label}
                </Link>
              )}
            </div>
          </div>
          <ImageSlot slot={page.hero} ratio="4/3" priority sizes="(min-width: 768px) 560px, 100vw" />
        </section>

        {/* ------------------------------------------------------------ datos clave */}
        <section aria-label="Datos clave" className="lp-wrap">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {page.facts.map((f) => (
              <div key={f.label} className="card">
                <dt className="text-[16px] font-medium">{f.label}</dt>
                <dd className="mt-1 text-[14px] leading-[1.5] text-slate">
                  <Value text={f.value} />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ------------------------------------------------------------ qué incluye */}
        <section aria-labelledby="inc-title" className="lp-wrap lp-section grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <h2 id="inc-title" className="lp-heading">
              Qué incluye
            </h2>
            <ul className="mt-6">
              {page.includes.map((it) => (
                <li key={it} className="rule-row">
                  {it}
                </li>
              ))}
            </ul>
            {page.requirements.length > 0 && (
              <>
                <h2 className="lp-heading-sm mt-10">Requisitos</h2>
                <ul className="mt-4">
                  {page.requirements.map((it) => (
                    <li key={it} className="rule-row">
                      {it}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {page.gallery && page.gallery.length > 0 && (
            <div className={`grid gap-4 ${page.gallery.length > 1 ? "grid-cols-2" : ""}`}>
              {page.gallery.map((g) => (
                <ImageSlot key={g.id} slot={g} ratio={page.gallery!.length > 1 ? "3/4" : "4/3"} sizes="(min-width: 768px) 280px, 50vw" />
              ))}
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------ cómo se reserva */}
        {page.steps.length > 0 && (
          <section aria-labelledby="steps-title" className="bg-[var(--mist)]">
            <div className="lp-wrap lp-section">
              <h2 id="steps-title" className="lp-heading">
                Cómo se reserva
              </h2>
              <ol className="mt-8 grid gap-4 md:grid-cols-3">
                {page.steps.map((st, i) => (
                  <li key={st} className="rounded-[8px] bg-[var(--white)] p-6">
                    <span className="num flex size-9 items-center justify-center rounded-full bg-[var(--black)] text-[14px] text-[var(--white)]">{i + 1}</span>
                    <p className="mt-4 text-[16px] leading-[1.5]">{st}</p>
                  </li>
                ))}
              </ol>
              <Link href={page.cta.href} className="btn mt-8 max-md:w-full">
                {page.cta.label} <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------ reglas */}
        {page.rules && (
          <section aria-labelledby="rules-title" className="lp-wrap lp-section grid gap-8 md:grid-cols-[1fr_2fr] md:gap-16">
            <h2 id="rules-title" className="lp-heading">
              {page.rules.title}
            </h2>
            <ul>
              {page.rules.items.map((r) => (
                <li key={r} className="rule-row rule-row--lg text-[16px] leading-[1.5]">
                  {r}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ------------------------------------------------------------ preguntas */}
        {page.faq.length > 0 && (
          <section aria-labelledby="faq-title" className="lp-wrap lp-section grid gap-8 md:grid-cols-[1fr_2fr] md:gap-16">
            <h2 id="faq-title" className="lp-heading">
              Preguntas
            </h2>
            <dl>
              {page.faq.map((f) => (
                <div key={f.q} className="rule-row rule-row--lg grid gap-1 md:grid-cols-2 md:gap-8">
                  <dt className="text-[18px]">{f.q}</dt>
                  <dd className="text-[16px] leading-[1.5] text-slate">
                    <Value text={f.a} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {page.short && <div className="pb-16" />}
      </main>

      <SiteFooter />
      <BottomBar href={page.cta.href} label={page.cta.label} />
    </div>
  );
}

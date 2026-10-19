"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { CalendarPlus, Home, IdCard } from "lucide-react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ marca */

/** La marca de AforoON: un anillo de aforo con el punto "ON" encendido. */
export function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--accent-track)" strokeWidth="3" />
      <path d="M12 3a9 9 0 0 1 8.2 12.7" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3.2" fill="var(--accent)" />
    </svg>
  );
}

export function Wordmark({ sub }: { sub?: string }) {
  return (
    <span className="flex items-center gap-2">
      <Mark />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-[-0.01em]">AforoON</span>
        {sub && <span className="mt-1 text-[12px] text-muted">{sub}</span>}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ personas */

export function initials(name: string) {
  const p = name.split(" ");
  return `${p[0][0]}${p[1]?.[0] ?? ""}`.toUpperCase();
}

/** Tinte pálido propio de cada persona: identidad, no dato. */
export function Avatar({ name, hue, size = 32 }: { name: string; hue: number; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-none items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: `hsl(${hue} 70% 93%)`,
        color: `hsl(${hue} 45% 26%)`,
      }}
    >
      {initials(name)}
    </span>
  );
}

/* ------------------------------------------------------------------ estados */

type Tone = "positive" | "negative" | "warning" | "neutral" | "accent";
const TONES: Record<Tone, string> = {
  positive: "bg-[var(--pill-positive-bg)] text-[var(--pill-positive-ink)]",
  negative: "bg-[var(--pill-negative-bg)] text-[var(--pill-negative-ink)]",
  warning: "bg-[var(--pill-warning-bg)] text-[var(--pill-warning-ink)]",
  neutral: "bg-[var(--pill-neutral-bg)] text-[var(--pill-neutral-ink)]",
  accent: "bg-accent-soft text-accent-ink",
};

export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-[22px] flex-none items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ controles */

type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "secondary" | "ghost" | "accent"; size?: "md" | "lg" };

export function Button({ variant = "secondary", size = "md", className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={cx(
        "press inline-flex items-center justify-center gap-2 rounded-control font-medium disabled:cursor-not-allowed",
        size === "lg" ? "h-12 px-5 text-[15px]" : "h-11 px-4 text-[14px] lg:h-9 lg:px-3.5",
        variant === "primary" && "bg-primary text-white disabled:bg-[#9aa0a6]",
        variant === "accent" && "bg-accent text-white disabled:bg-[#9aa0a6]",
        variant === "secondary" && "border border-control bg-surface text-text disabled:text-muted",
        variant === "ghost" && "text-text hover-raise",
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ aforo */

/**
 * La pista de aforo: el elemento propio de AforoON. La pista es el tinte, lo ocupado es
 * el azul pleno. Cuando se llena, todo pasa a gris: ya no es una opción.
 */
export function CapacityTrack({ used, capacity, className, label }: { used: number; capacity: number; className?: string; label?: string }) {
  const full = used >= capacity;
  const pct = capacity === 0 ? 0 : Math.min(100, (used / capacity) * 100);
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={capacity}
      aria-valuenow={used}
      aria-label={label ?? `${used} de ${capacity} ocupados`}
      className={cx("h-1.5 w-full overflow-hidden rounded-full", full ? "bg-raised" : "bg-accent-track", className)}
    >
      <div
        className={cx("h-full rounded-full", full ? "bg-[#9aa0a6]" : "bg-accent")}
        style={{ width: `${pct}%`, transition: "width 300ms var(--ease-out)" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ marco móvil */

const TABS = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/reservar", label: "Reservar", icon: CalendarPlus },
  { href: "/registro", label: "Credencial", icon: IdCard },
];

/**
 * La app del socio. En el teléfono ocupa toda la pantalla; en un computador se muestra
 * como columna de teléfono centrada, para presentar el avance tal como se verá.
 */
export function MobileShell({
  title,
  action,
  children,
  hideNav,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  hideNav?: boolean;
}) {
  const path = usePathname();
  return (
    <div className="min-h-dvh sm:py-8">
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-surface sm:min-h-[860px] sm:rounded-[20px] sm:border sm:border-border">
        <header className="sticky top-0 z-20 flex h-14 flex-none items-center justify-between gap-3 border-b border-rule bg-surface/95 px-4 sm:rounded-t-[20px]">
          <div className="min-w-0">{title}</div>
          {action}
        </header>
        <main className="flex-1 px-4 pb-6 pt-4">{children}</main>
        {!hideNav && (
          <nav
            aria-label="Secciones"
            className="sticky bottom-0 z-20 grid flex-none grid-cols-3 border-t border-rule bg-surface pb-[env(safe-area-inset-bottom)] sm:rounded-b-[20px]"
          >
            {TABS.map(({ href, label, icon: Icon }) => {
              const active = path === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cx("press flex h-14 flex-col items-center justify-center gap-1 text-[12px]", active ? "text-text" : "text-muted")}
                >
                  <Icon size={20} strokeWidth={1.6} className={active ? "text-accent" : undefined} aria-hidden="true" />
                  <span className={active ? "font-medium" : undefined}>{label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ hoja inferior */

/** Hoja que sube desde abajo (curva drawer de Ionic, como en Vaul). */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <div
      className={cx("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
      inert={!open}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/30"
        style={{ opacity: open ? 1 : 0, transition: "opacity 240ms ease" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[440px] rounded-t-[20px] bg-surface px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
        style={{
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: `transform ${open ? 380 : 240}ms var(--ease-drawer)`,
        }}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-control" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ aviso breve */

export function Toast({ message, tone = "neutral" }: { message: string | null; tone?: "neutral" | "negative" }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4">
      {message && (
        <div
          key={message}
          className={cx(
            "enter rounded-card px-4 py-3 text-[14px] shadow-[0_8px_24px_rgba(0,0,0,0.16)]",
            tone === "negative" ? "bg-[var(--pill-negative-bg)] text-[var(--pill-negative-ink)]" : "bg-primary text-white",
          )}
        >
          {message}
        </div>
      )}
    </div>
  );
}

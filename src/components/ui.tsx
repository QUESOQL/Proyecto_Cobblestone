"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { CalendarPlus, Home, IdCard, Printer } from "lucide-react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ marca */

/**
 * La marca de AforoON: un anillo de aforo con el punto "ON" encendido.
 * Toma el color del texto, así sirve igual sobre la barra negra y sobre blanco.
 */
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="3" />
      <path d="M12 3a9 9 0 0 1 8.2 12.7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ sub }: { sub?: string }) {
  return (
    <span className="flex items-center gap-2">
      <Mark />
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-[-0.01em]">AforoON</span>
        {sub && <span className="mt-1 text-[12px] opacity-70">{sub}</span>}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ barra superior */

/** La barra negra de todas las pantallas: marca a la izquierda, acciones a la derecha. */
export function TopBar({ title, action, className }: { title?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <header className={cx("topbar flex h-[var(--bar)] flex-none items-center justify-between gap-3 px-4", className)}>
      <Link href="/" className="min-w-0" aria-label="AforoON, ir a la portada">
        {title ?? <Wordmark />}
      </Link>
      {action && <div className="flex flex-none items-center gap-2">{action}</div>}
    </header>
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

/**
 * Botón de 8 px de radio. Primario: negro. Secundario: gris niebla. Sin color propio:
 * "accent" queda como alias de primario para las pantallas antiguas.
 */
export function Button({ variant = "secondary", size = "md", className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={cx(
        "press inline-flex items-center justify-center gap-2 rounded-control font-medium disabled:cursor-not-allowed",
        size === "lg" ? "h-12 px-5 text-[16px]" : "h-11 px-4 text-[14px]",
        (variant === "primary" || variant === "accent") && "bg-black text-white disabled:bg-[var(--hair)] disabled:text-muted",
        variant === "secondary" && "bg-raised text-text hover-raise disabled:text-muted",
        variant === "ghost" && "text-text hover-raise",
        className,
      )}
    />
  );
}

/** Tarjeta gris niebla, sin borde ni sombra. */
export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div {...rest} className={cx("card", className)} />;
}

/** Campo con etiqueta y ayuda; el control va dentro (input, select). */
export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      <span className="text-[14px] font-medium">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

/** Tira de pestañas: la activa en teal pálido, el único color de la interfaz. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cx("tabs", className)}>
      {items.map((it) => (
        <button key={it.id} role="tab" aria-selected={value === it.id} onClick={() => onChange(it.id)} className="tab press">
          {it.label}
        </button>
      ))}
    </div>
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
        className={cx("h-full rounded-full", full ? "bg-[var(--inactive)]" : "bg-accent")}
        style={{ width: `${pct}%`, transition: "width 300ms var(--ease-out)" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ marco móvil */

const TABS = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/reservar", label: "Reservar", icon: CalendarPlus },
  { href: "/maquinas", label: "Máquinas", icon: Printer },
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
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-surface sm:min-h-[860px] sm:overflow-clip sm:rounded-[16px] sm:border sm:border-border">
        <TopBar title={title} action={action} className="z-20" />
        <main className="flex-1 px-4 pb-6 pt-4">{children}</main>
        {!hideNav && (
          <nav
            aria-label="Secciones"
            className="sticky bottom-0 z-20 grid flex-none grid-cols-4 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
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
                  <Icon size={20} strokeWidth={active ? 2 : 1.6} aria-hidden="true" />
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
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[440px] rounded-t-[16px] bg-surface px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3"
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
            "enter rounded-card px-4 py-3 text-[14px]",
            tone === "negative" ? "bg-[var(--pill-negative-bg)] text-[var(--pill-negative-ink)]" : "bg-primary text-white",
          )}
        >
          {message}
        </div>
      )}
    </div>
  );
}

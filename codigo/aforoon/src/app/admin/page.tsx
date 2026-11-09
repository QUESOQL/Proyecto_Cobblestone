"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, ChevronsUpDown, DoorOpen, Download, GraduationCap, LayoutGrid, LogOut, Menu, Mic, Settings, Smartphone, Users, X } from "lucide-react";
import { HUB, formatDay, formatMin, zoneById, type ZoneId } from "@/lib/data";
import { useAforo, useHydrated } from "@/lib/store";
import { supabase, toSantiago } from "@/lib/supabase";
import { exportarDemo, panelDemo, panelReal, type PanelDatos, type PanelServidor } from "@/lib/panel";
import { BarChart, BarList } from "@/components/charts";
import { Avatar, Pill, Tabs, TopBar, Wordmark, cx } from "@/components/ui";
import { TrainingAdmin } from "@/components/training-admin";
import { IngresoAdmin } from "@/components/admin/ingreso-admin";

const ZONE_TABS: { id: ZoneId; label: string }[] = [
  { id: "mesas", label: "Centro de mesas" },
  { id: "oficinas", label: "Oficinas y set" },
  { id: "salas", label: "Edificio Empleo" },
];

const COLUMNAS_CSV = ["dia", "bloque", "espacio", "socio", "perfil", "estado", "entrada", "salida", "metodo"];

export default function AdminPage() {
  return <IngresoAdmin>{(demo) => (demo ? <PanelDemo /> : <PanelReal />)}</IngresoAdmin>;
}

/** ?demo=1: cifras de los datos de ejemplo locales, como en el prototipo. */
function PanelDemo() {
  const hydrated = useHydrated();
  const s = useAforo();
  const state = hydrated ? s : { ...s, myReservations: [], overrides: {}, events: [], enrolledTalkIds: [] };
  const datos = useMemo(() => panelDemo(state), [state.myReservations, state.overrides, state.events, state.enrolledTalkIds, state.profile]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Panel datos={datos} demo exportar={async () => exportarDemo(state)} />;
}

/** Cifras reales de Supabase (panel_admin), refrescadas cada minuto. */
function PanelReal() {
  const profile = useAforo((s) => s.profile);
  const signOut = useAforo((s) => s.signOut);
  const [datos, setDatos] = useState<PanelDatos | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.rpc("panel_admin");
    if (error) setError(error.message === "sin_permiso" ? "Esta cuenta ya no tiene permiso de administración." : "No pudimos cargar el panel. Revisa la conexión.");
    else {
      setError(null);
      setDatos(panelReal(data as PanelServidor, (iso) => toSantiago(iso).min));
    }
  }, []);

  useEffect(() => {
    void cargar();
    const id = setInterval(() => void cargar(), 60_000);
    return () => clearInterval(id);
  }, [cargar]);

  const exportar = async () => {
    const { data } = await supabase.rpc("exportar_dia");
    return ((data ?? []) as Record<string, string>[]).map((r) => COLUMNAS_CSV.map((c) => String(r[c] ?? "")));
  };

  const usuario = profile ? { nombre: profile.name, correo: profile.email, salir: () => void signOut() } : undefined;
  if (!datos)
    return (
      <div className="min-h-dvh bg-ground">
        <TopBar title={<Wordmark sub="Administración" />} />
        <p role={error ? "alert" : "status"} className="px-4 py-10 text-center text-[14px] text-muted">
          {error ?? "Cargando el panel…"}
        </p>
      </div>
    );
  return <Panel datos={datos} exportar={exportar} usuario={usuario} aviso={error} />;
}

interface Usuario {
  nombre: string;
  correo: string;
  salir: () => void;
}

function Panel({ datos, demo = false, exportar, usuario, aviso }: { datos: PanelDatos; demo?: boolean; exportar: () => Promise<string[][]>; usuario?: Usuario; aviso?: string | null }) {
  const [zone, setZone] = useState<ZoneId>("mesas");
  const [menu, setMenu] = useState(false);

  const { cap: zCap, bars: zoneBars } = datos.zonas[zone];
  const fullBlocks = zoneBars.filter((b) => b.value >= zCap);
  const zoneFinding =
    fullBlocks.length > 0
      ? `Lleno en ${fullBlocks.length} ${fullBlocks.length === 1 ? "bloque" : "bloques"}: ${fullBlocks.map((b) => b.label).join(", ")}.`
      : `El bloque más alto llega a ${Math.max(0, ...zoneBars.map((b) => b.value))} de ${zCap}.`;
  const mesasLlenas = datos.zonas.mesas.bars.filter((b) => b.value >= datos.zonas.mesas.cap).map((b) => b.label);
  const peak = datos.horas.reduce((a, b) => (b.value > a.value ? b : a), datos.horas[0]);
  const segTotal = datos.segmentos.reduce((a, r) => a + r.value, 0);

  const exportCsv = async () => {
    const rows = [COLUMNAS_CSV, ...(await exportar())];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `aforoon-accesos-${datos.dia}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-dvh bg-ground">
      {/* Barra negra de todas las pantallas; en teléfono y tablet abre el menú. */}
      <TopBar
        title={<Wordmark sub="Administración" />}
        action={
          <button onClick={() => setMenu(true)} aria-label="Abrir menú" className="topbar-link press inline-flex size-11 justify-center !p-0 lg:hidden">
            <Menu size={20} aria-hidden="true" />
          </button>
        }
      />
      {menu && (
        <div className="enter fixed inset-0 z-50 bg-ground lg:hidden">
          <div className="topbar flex h-[var(--bar)] items-center justify-end px-4">
            <button onClick={() => setMenu(false)} aria-label="Cerrar menú" className="topbar-link press inline-flex size-11 justify-center !p-0">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <Sidebar className="flex" onNavigate={() => setMenu(false)} demo={demo} usuario={usuario} />
        </div>
      )}
      <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)]">
        <Sidebar className="hidden lg:flex" demo={demo} usuario={usuario} />

        <main className="min-w-0 px-4 pb-12 pt-5 md:px-8 lg:pt-8">
          {aviso && (
            <p role="alert" className="mb-4 rounded-card bg-[var(--pill-warning-bg)] p-3 text-[14px] text-[var(--pill-warning-ink)]">
              {aviso}
            </p>
          )}
          {/* Título */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[28px] font-normal leading-[1.22]">Ocupación del Hub</h1>
                {demo ? <Pill tone="warning">Datos de ejemplo</Pill> : <Pill tone="positive">En vivo</Pill>}
              </div>
              <p className="mt-1 text-[14px] text-muted">
                {formatDay(datos.dia, "long")}, {formatMin(datos.minuto)}.{" "}
                {mesasLlenas.length > 0
                  ? `El centro de mesas está lleno en ${mesasLlenas.length === 1 ? "el bloque de las" : "los bloques de las"} ${mesasLlenas.join(", ")}`
                  : "El centro de mesas tiene cupos en todos los bloques"}{" "}
                y {datos.ultimoNombre} {datos.noShowsUltimo} {datos.noShowsUltimo === 1 ? "persona no llegó" : "personas no llegaron"} a su reserva.
              </p>
            </div>
            <button
              onClick={() => void exportCsv()}
              className="press inline-flex h-9 flex-none items-center gap-2 rounded-control bg-primary px-3.5 text-[14px] font-medium text-white"
            >
              <Download size={16} aria-hidden="true" /> Exportar accesos de hoy
            </button>
          </div>

          {/* KPI: un solo contenedor dividido por líneas finas. */}
          <section aria-label="Indicadores" className="mt-6 grid grid-cols-2 overflow-hidden rounded-card border border-border bg-surface xl:grid-cols-4">
            {datos.kpis.map((k, i) => (
              <div
                key={k.label}
                className={cx("p-5", i % 2 === 1 && "border-l border-border", i >= 2 && "border-t border-border xl:border-t-0", i === 2 && "xl:border-l")}
              >
                <p className="text-[14px] text-muted">{k.label}</p>
                <p className="num mt-1 text-[24px] font-medium leading-[30px]">{k.value}</p>
                <p className="num mt-1 text-[12px] leading-[16px] text-muted">{k.caption}</p>
              </div>
            ))}
          </section>

          <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_384px]">
            {/* Gráfico principal */}
            <section aria-labelledby="occ-title" className="min-w-0 rounded-card border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="occ-title" className="text-[20px] font-normal">
                    Ocupación por bloque · hoy
                  </h2>
                  <p className="mt-0.5 text-[13px] text-muted">{zoneFinding}</p>
                </div>
                <Tabs items={ZONE_TABS} value={zone} onChange={setZone} label="Zona" className="max-w-full" />
              </div>
              <div className="mt-3 flex gap-4 text-[12px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 bg-accent" aria-hidden="true" /> Bloque iniciado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 bg-accent-track" aria-hidden="true" /> Reservado a futuro
                </span>
              </div>
              <div className="mt-2">
                <BarChart
                  key={zone}
                  bars={zoneBars}
                  height={340}
                  reference={{ value: zCap, label: `Aforo ${zCap}` }}
                  ariaLabel={`Ocupación por bloque hoy en ${zoneById(zone).name}`}
                />
              </div>
            </section>

            {/* Riel: quiénes vienen + incidencias */}
            <div className="flex min-w-0 flex-col gap-6">
              <section aria-labelledby="seg-title" className="rounded-card border border-border bg-surface p-5">
                <div className="flex items-baseline justify-between">
                  <h2 id="seg-title" className="text-[18px] font-normal">
                    Quiénes vienen
                  </h2>
                  <span className="num text-[12px] text-muted">{segTotal} socios · 7 días</span>
                </div>
                <div className="mt-2">
                  <BarList rows={datos.segmentos} total={segTotal} />
                </div>
              </section>

              <section aria-labelledby="inc-title">
                <h2 id="inc-title" className="mb-2 text-[18px] font-normal">
                  Para revisar hoy
                </h2>
                <ul className="overflow-hidden rounded-card border border-border bg-surface">
                  {datos.incidencias.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0">
                      <Avatar name={e.nombre} hue={e.tono} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{e.nombre}</p>
                        <p className="num truncate text-[12px] text-muted">{e.detalle}</p>
                      </div>
                      <Pill tone={e.pill}>{e.etiqueta}</Pill>
                    </li>
                  ))}
                  {datos.incidencias.length === 0 && <li className="px-4 py-4 text-[13px] text-muted">Nada pendiente.</li>}
                </ul>
                <Link
                  href={demo ? "/recepcion?demo=1" : "/recepcion"}
                  className="press mt-2 flex h-[30px] items-center justify-center rounded-control border border-control bg-surface text-[13px]"
                >
                  Ver el terminal de acceso
                </Link>
              </section>
            </div>
          </div>

          {/* Semana y horas punta, a igual ancho */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section aria-labelledby="week-title" className="min-w-0 rounded-card border border-border bg-surface p-5">
              <h2 id="week-title" className="text-[18px] font-normal">
                Entradas por día
              </h2>
              <p className="num mt-0.5 text-[13px] text-muted">
                Hoy van {datos.entradasHoy}; el {formatDay(datos.semanaPasada.dia, "long").toLowerCase()} hubo {datos.semanaPasada.n}. Domingo cerrado.
              </p>
              <div className="mt-3">
                <BarChart bars={datos.semana} height={180} ariaLabel="Entradas por día, últimos 7 días" />
              </div>
            </section>
            <section aria-labelledby="peak-title" className="min-w-0 rounded-card border border-border bg-surface p-5">
              <h2 id="peak-title" className="text-[18px] font-normal">
                Horas punta
              </h2>
              <p className="num mt-0.5 text-[13px] text-muted">
                Promedio de entradas por hora, últimos {datos.diasPasados} días abiertos.
                {peak.value > 0 ? ` La punta es de ${peak.label}:00 a ${peak.label}:59.` : " Aún no hay entradas registradas."}
              </p>
              <div className="mt-3">
                <BarChart bars={datos.horas} height={180} ariaLabel="Entradas promedio por hora" />
              </div>
            </section>
          </div>

          {/* Charlas */}
          <section aria-labelledby="talks-title" className="mt-6 overflow-hidden rounded-card border border-border bg-surface">
            <div className="flex items-baseline justify-between px-5 pt-5">
              <h2 id="talks-title" className="text-[18px] font-normal">
                Charlas y capacitaciones
              </h2>
              <span className="num text-[12px] text-muted">{datos.charlas.length} charlas</span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-[14px]">
                <thead>
                  <tr className="text-[12px] text-muted">
                    <th className="h-10 px-5 text-left font-normal">Charla</th>
                    <th className="h-10 px-3 text-left font-normal">Fecha</th>
                    <th className="h-10 px-3 text-left font-normal">Lugar</th>
                    <th className="h-10 px-3 text-right font-normal">Inscritos</th>
                    <th className="h-10 px-3 text-right font-normal">Asistencia</th>
                    <th className="h-10 px-5 text-right font-normal">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.charlas.map((t) => (
                    <tr key={t.id} className="border-t border-rule">
                      <td className="px-5 py-2.5">
                        <p className="font-medium">{t.titulo}</p>
                        <p className="text-[12px] text-muted">{t.capacitador}</p>
                      </td>
                      <td className="num px-3 py-2.5 whitespace-nowrap">
                        {formatDay(t.dia, "short")} <span className="text-muted">{t.inicio}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{t.lugar}</td>
                      <td className="num px-3 py-2.5 text-right whitespace-nowrap">
                        {t.inscritos}
                        <span className="text-muted"> / {t.capacidad}</span>
                        {t.inscritos >= t.capacidad && <span className="block text-[12px] text-accent-ink">Llena</span>}
                      </td>
                      <td className="num px-3 py-2.5 text-right">{t.asistencia != null ? `${t.asistencia}%` : <span className="text-muted">—</span>}</td>
                      <td className="num px-5 py-2.5 text-right">
                        {t.nota != null ? Number(t.nota).toLocaleString("es-CL", { minimumFractionDigits: 1 }) : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <TrainingAdmin />

          <p className="mt-6 text-[12px] text-muted">
            {demo ? "Datos de ejemplo generados para la demo." : "Datos en vivo de AforoON; se actualizan cada minuto."} {HUB.name} · {HUB.address}.
          </p>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ className, onNavigate, demo, usuario }: { className?: string; onNavigate?: () => void; demo: boolean; usuario?: Usuario }) {
  const nav = [
    { href: demo ? "/admin?demo=1" : "/admin", label: "Ocupación", icon: BarChart3, active: true },
    { href: "#capacitaciones", label: "Capacitaciones", icon: GraduationCap },
    { href: demo ? "/recepcion?demo=1" : "/recepcion", label: "Terminal de acceso", icon: DoorOpen },
    { href: "/inicio", label: "App del socio", icon: Smartphone },
  ];
  const soon = [
    { label: "Socios", icon: Users },
    { label: "Espacios y aforo", icon: LayoutGrid },
    { label: "Charlas", icon: Mic },
  ];
  return (
    <aside className={cx("min-h-full flex-col px-3 py-5 lg:sticky lg:top-[var(--bar)] lg:h-[calc(100dvh-var(--bar))]", className)}>
      <div className="flex h-10 items-center justify-between rounded-control border border-border bg-surface px-3">
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium">{HUB.name}</span>
          <span className="block text-[12px] text-muted">2 edificios</span>
        </span>
        <ChevronsUpDown size={14} className="text-muted" aria-hidden="true" />
      </div>
      <nav aria-label="Administración" className="mt-5 flex flex-col">
        {nav.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={label}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cx("press mb-0.5 flex h-10 items-center gap-2.5 rounded-[8px] px-2.5 text-[14px]", active ? "bg-[var(--raised)] text-text" : "text-muted hover-raise")}
          >
            <Icon size={16} strokeWidth={active ? 2 : 1.6} aria-hidden="true" /> {label}
          </Link>
        ))}
        <p className="mt-6 px-2.5 text-[12px] text-muted">Próximas pantallas</p>
        {soon.map(({ label, icon: Icon }) => (
          <span key={label} className="flex h-8 items-center gap-2.5 px-2.5 text-[14px] text-muted" aria-disabled="true">
            <Icon size={16} strokeWidth={1.6} aria-hidden="true" /> {label}
          </span>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1 pt-6">
        <span className="flex h-8 items-center gap-2.5 px-2.5 text-[14px] text-muted">
          <Settings size={16} strokeWidth={1.6} aria-hidden="true" /> Configuración
        </span>
        <div className="mt-2 flex items-center gap-2.5 px-2">
          <Avatar name={usuario?.nombre ?? "Administración Hub"} hue={200} size={28} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{usuario?.nombre ?? "Administración"}</p>
            <p className="truncate text-[12px] text-muted">{usuario?.correo ?? "Municipalidad de Providencia"}</p>
          </div>
        </div>
        {usuario ? (
          <button onClick={usuario.salir} className="press mt-2 flex h-9 items-center gap-2.5 rounded-[8px] px-2.5 text-[14px] text-muted hover-raise">
            <LogOut size={16} strokeWidth={1.6} aria-hidden="true" /> Cerrar sesión
          </button>
        ) : (
          <Link href="/admin" className="press mt-2 flex h-9 items-center gap-2.5 rounded-[8px] px-2.5 text-[14px] text-muted hover-raise">
            Entrar con tu cuenta
          </Link>
        )}
      </div>
    </aside>
  );
}

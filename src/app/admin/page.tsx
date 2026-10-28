"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart3, ChevronsUpDown, DoorOpen, Download, GraduationCap, LayoutGrid, Menu, Mic, Settings, Smartphone, Users, X } from "lucide-react";
import {
  BLOCKS,
  CURRENT_BLOCK,
  HUB,
  MEMBERS,
  NOW_MIN,
  SEGMENTS,
  TALKS,
  TODAY,
  blockById,
  blockLabel,
  dayKey,
  dayOffset,
  formatDay,
  formatMin,
  isOpen,
  memberById,
  trainerById,
  unitById,
  unitsOfZone,
  zoneById,
  type ZoneId,
} from "@/lib/data";
import { allReservations, talkEnrolledCount, useAforo, useHydrated } from "@/lib/store";
import { BarChart, BarList } from "@/components/charts";
import { Avatar, Pill, Tabs, TopBar, Wordmark, cx } from "@/components/ui";
import { TrainingAdmin } from "@/components/training-admin";

const ZONE_TABS: { id: ZoneId; label: string }[] = [
  { id: "mesas", label: "Centro de mesas" },
  { id: "oficinas", label: "Oficinas y set" },
  { id: "salas", label: "Edificio Empleo" },
];

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

export default function AdminPage() {
  const hydrated = useHydrated();
  const s = useAforo();
  const [zone, setZone] = useState<ZoneId>("mesas");
  const [menu, setMenu] = useState(false);

  const state = hydrated ? s : { ...s, myReservations: [], overrides: {}, events: [], enrolledTalkIds: [] };
  const all = useMemo(() => allReservations(state), [state.myReservations, state.overrides]); // eslint-disable-line react-hooks/exhaustive-deps
  const live = all.filter((r) => r.status !== "cancelada");

  /* -------------------------------------------- cifras, todas desde las filas */
  const exceptionsToday = state.events.filter((e) => e.result === "excepcion" && e.kind === "entrada").length;
  const entriesOn = (day: string) => live.filter((r) => r.day === day && r.checkInMin !== undefined).length;
  const entriesToday = entriesOn(TODAY) + exceptionsToday;
  // Último día con el Hub abierto (el domingo cierra): la referencia honesta de "ayer".
  const lastOpen = [1, 2, 3, 4, 5, 6].map((o) => dayKey(-o)).find((d) => BLOCKS.some((b) => isOpen(d, b.id)))!;
  const lastOpenName = dayOffset(lastOpen) === -1 ? "ayer" : `el ${formatDay(lastOpen, "long").split(" ")[0].toLowerCase()}`;
  const entriesYesterday = entriesOn(lastOpen);
  const lastWeekSameDay = entriesOn(dayKey(-6)); // la demo guarda 6 días hacia atrás

  const bookable = ["mesas", "oficinas", "salas"] as ZoneId[];
  const startedBlocks = BLOCKS.filter((b) => b.startMin <= NOW_MIN && isOpen(TODAY, b.id));
  const capPerBlock = bookable.flatMap((z) => unitsOfZone(z)).reduce((a, u) => a + u.capacity, 0);
  const reservedStarted = live.filter((r) => r.day === TODAY && startedBlocks.some((b) => b.id === r.block) && r.unitId !== "charlas").length;
  const occupancyToday = pct(reservedStarted, capPerBlock * startedBlocks.length);

  const pastWindow = live.filter((r) => dayOffset(r.day) < 0 || (r.day === TODAY && blockById(r.block).endMin <= NOW_MIN));
  const noShows = pastWindow.filter((r) => r.status === "no_show").length;
  const attended = pastWindow.filter((r) => r.status === "completada").length;
  const noShowRate = pct(noShows, noShows + attended);
  const noShowsYesterday = live.filter((r) => r.day === lastOpen && r.status === "no_show").length;

  const enrolled = MEMBERS.filter((m) => m.verified).length + (state.profile ? 1 : 0);
  const totalMembers = MEMBERS.length + (state.profile ? 1 : 0);

  /* -------------------------------------------- gráfico principal */
  const zUnits = unitsOfZone(zone);
  const zCap = zUnits.reduce((a, u) => a + u.capacity, 0);
  const zIds = new Set(zUnits.map((u) => u.id));
  const zoneBars = BLOCKS.filter((b) => isOpen(TODAY, b.id)).map((b) => {
    const v = live.filter((r) => r.day === TODAY && r.block === b.id && zIds.has(r.unitId)).length;
    const future = b.startMin > NOW_MIN;
    return {
      label: b.start,
      value: v,
      kind: future ? ("future" as const) : ("now" as const),
      title: `${b.start}–${b.end}: ${v} de ${zCap} ${future ? "reservados" : "ocupados"}`,
    };
  });
  const fullBlocks = zoneBars.filter((b) => b.value >= zCap);
  const zoneFinding =
    fullBlocks.length > 0
      ? `Lleno en ${fullBlocks.length} ${fullBlocks.length === 1 ? "bloque" : "bloques"}: ${fullBlocks.map((b) => b.label).join(", ")}.`
      : `El bloque más alto llega a ${Math.max(...zoneBars.map((b) => b.value))} de ${zCap}.`;

  /* -------------------------------------------- semana y horas punta */
  const weekBars = Array.from({ length: 7 }, (_, i) => dayKey(i - 6)).map((d) => {
    const v = d === TODAY ? entriesToday : entriesOn(d);
    return { label: formatDay(d, "short"), value: v, kind: d === TODAY ? ("future" as const) : ("now" as const), title: `${formatDay(d, "long")}: ${v} entradas${d === TODAY ? ` (hasta las ${formatMin(NOW_MIN)})` : ""}` };
  });
  const pastDays = Array.from({ length: 6 }, (_, i) => dayKey(i - 6)).filter((d) => BLOCKS.some((b) => isOpen(d, b.id)));
  const hourBars = Array.from({ length: 12 }, (_, i) => 8 + i).map((h) => {
    const n = live.filter((r) => pastDays.includes(r.day) && r.checkInMin !== undefined && Math.floor(r.checkInMin / 60) === h).length;
    const avg = Math.round(n / Math.max(1, pastDays.length));
    return { label: `${h}`, value: avg, title: `${h}:00–${h}:59: ${avg} entradas en promedio`, kind: "now" as const };
  });
  const peak = hourBars.reduce((a, b) => (b.value > a.value ? b : a), hourBars[0]);

  /* -------------------------------------------- caracterización */
  const weekMembers = new Set(live.filter((r) => dayOffset(r.day) <= 0 && dayOffset(r.day) >= -6 && r.memberId !== "yo").map((r) => r.memberId));
  const segRows = SEGMENTS.map((sg) => ({ label: sg.id, value: [...weekMembers].filter((id) => memberById(id)?.segment === sg.id).length })).sort(
    (a, b) => b.value - a.value,
  );
  const segTotal = segRows.reduce((a, r) => a + r.value, 0);

  /* -------------------------------------------- incidencias de hoy */
  const incidents = state.events.filter((e) => e.result !== "aprobado").slice(0, 4);
  const noShowRowsToday = live
    .filter((r) => r.day === TODAY && r.status === "no_show")
    .slice(0, Math.max(0, 4 - incidents.length));

  const talks = [...TALKS].sort((a, b) => a.day.localeCompare(b.day) || blockById(a.block).startMin - blockById(b.block).startMin);

  const exportCsv = () => {
    const rows = [["dia", "bloque", "espacio", "socio", "perfil", "estado", "entrada", "salida", "metodo"]];
    for (const r of live.filter((x) => x.day === TODAY)) {
      const m = memberById(r.memberId);
      rows.push([
        r.day,
        blockLabel(r.block),
        unitById(r.unitId).name,
        m?.name ?? state.profile?.name ?? "",
        m?.segment ?? state.profile?.segment ?? "",
        r.status,
        r.checkInMin !== undefined ? formatMin(r.checkInMin) : "",
        r.checkOutMin !== undefined ? formatMin(r.checkOutMin) : "",
        r.method ?? "",
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `aforoon-accesos-${TODAY}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = [
    { label: "Entradas hoy", value: entriesToday.toLocaleString("es-CL"), caption: `hasta las ${formatMin(NOW_MIN)} · ${lastOpenName} ${entriesYesterday} en el día` },
    { label: "Ocupación reservada", value: `${occupancyToday}%`, caption: `bloques ${startedBlocks[0]?.start ?? "—"}–${blockById(CURRENT_BLOCK).end} · ${reservedStarted} de ${capPerBlock * startedBlocks.length} cupos` },
    { label: "No-show", value: `${noShowRate}%`, caption: `${noShows} de ${noShows + attended} reservas · últimos 7 días` },
    { label: "Socios enrolados", value: `${enrolled}`, caption: `de ${totalMembers} registrados · ${totalMembers - enrolled} sin credencial` },
  ];

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
          <Sidebar className="flex" onNavigate={() => setMenu(false)} />
        </div>
      )}
      <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)]">
      <Sidebar className="hidden lg:flex" />

      <main className="min-w-0 px-4 pb-12 pt-5 md:px-8 lg:pt-8">
        {/* Título */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[28px] font-normal leading-[1.22]">Ocupación del Hub</h1>
            <p className="mt-1 text-[14px] text-muted">
              {formatDay(TODAY, "long")}, {formatMin(NOW_MIN)}. El centro de mesas está lleno de 10:00 a 14:00 y {lastOpenName} {noShowsYesterday}{" "}
              {noShowsYesterday === 1 ? "persona no llegó" : "personas no llegaron"} a su reserva.
            </p>
          </div>
          <button onClick={exportCsv} className="press inline-flex h-9 flex-none items-center gap-2 rounded-control bg-primary px-3.5 text-[14px] font-medium text-white">
            <Download size={16} aria-hidden="true" /> Exportar accesos de hoy
          </button>
        </div>

        {/* KPI: un solo contenedor dividido por líneas finas. */}
        <section aria-label="Indicadores" className="mt-6 grid grid-cols-2 overflow-hidden rounded-card border border-border bg-surface xl:grid-cols-4">
          {kpis.map((k, i) => (
            <div
              key={k.label}
              className={cx(
                "p-5",
                i % 2 === 1 && "border-l border-border",
                i >= 2 && "border-t border-border xl:border-t-0",
                i === 2 && "xl:border-l",
              )}
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
                <BarList rows={segRows} total={segTotal} />
              </div>
            </section>

            <section aria-labelledby="inc-title">
              <h2 id="inc-title" className="mb-2 text-[18px] font-normal">
                Para revisar hoy
              </h2>
              <ul className="overflow-hidden rounded-card border border-border bg-surface">
                {incidents.map((e) => {
                  const m = memberById(e.memberId);
                  const name = m?.name ?? state.profile?.name ?? "—";
                  return (
                    <li key={e.id} className="flex items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0">
                      <Avatar name={name} hue={m?.hue ?? 210} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{name}</p>
                        <p className="num text-[12px] text-muted">
                          {formatMin(e.atMin)} · puerta principal · {e.method.toUpperCase()}
                        </p>
                      </div>
                      <Pill tone={e.result === "excepcion" ? "accent" : e.result === "no_enrolado" ? "warning" : "negative"}>
                        {e.result === "excepcion" ? "Excepción" : e.result === "no_enrolado" ? "Sin credencial" : "Sin reserva"}
                      </Pill>
                    </li>
                  );
                })}
                {noShowRowsToday.map((r) => {
                  const m = memberById(r.memberId)!;
                  return (
                    <li key={r.id} className="flex items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0">
                      <Avatar name={m.name} hue={m.hue} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{m.name}</p>
                        <p className="num truncate text-[12px] text-muted">
                          {blockLabel(r.block)} · {unitById(r.unitId).name}
                        </p>
                      </div>
                      <Pill>No llegó</Pill>
                    </li>
                  );
                })}
                {incidents.length + noShowRowsToday.length === 0 && <li className="px-4 py-4 text-[13px] text-muted">Nada pendiente.</li>}
              </ul>
              <Link href="/recepcion" className="press mt-2 flex h-[30px] items-center justify-center rounded-control border border-control bg-surface text-[13px]">
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
              Hoy van {entriesToday}; el {formatDay(dayKey(-6), "long").toLowerCase()} hubo {lastWeekSameDay}. Domingo cerrado.
            </p>
            <div className="mt-3">
              <BarChart bars={weekBars} height={180} ariaLabel="Entradas por día, últimos 7 días" />
            </div>
          </section>
          <section aria-labelledby="peak-title" className="min-w-0 rounded-card border border-border bg-surface p-5">
            <h2 id="peak-title" className="text-[18px] font-normal">
              Horas punta
            </h2>
            <p className="num mt-0.5 text-[13px] text-muted">
              Promedio de entradas por hora, últimos {pastDays.length} días abiertos. La punta es de {peak.label}:00 a {peak.label}:59.
            </p>
            <div className="mt-3">
              <BarChart bars={hourBars} height={180} ariaLabel="Entradas promedio por hora" />
            </div>
          </section>
        </div>

        {/* Charlas */}
        <section aria-labelledby="talks-title" className="mt-6 overflow-hidden rounded-card border border-border bg-surface">
          <div className="flex items-baseline justify-between px-5 pt-5">
            <h2 id="talks-title" className="text-[18px] font-normal">
              Charlas y capacitaciones
            </h2>
            <span className="num text-[12px] text-muted">{talks.length} charlas</span>
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
                {talks.map((t) => {
                  const n = talkEnrolledCount(t.id, state.enrolledTalkIds);
                  const tr = trainerById(t.trainerId);
                  const past = t.attended !== undefined;
                  return (
                    <tr key={t.id} className="border-t border-rule">
                      <td className="px-5 py-2.5">
                        <p className="font-medium">{t.title}</p>
                        <p className="text-[12px] text-muted">{tr.name}</p>
                      </td>
                      <td className="num px-3 py-2.5 whitespace-nowrap">
                        {formatDay(t.day, "short")} <span className="text-muted">{blockById(t.block).start}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{unitById(t.unitId).name}</td>
                      <td className="num px-3 py-2.5 text-right whitespace-nowrap">
                        {n}
                        <span className="text-muted"> / {t.capacity}</span>
                        {n >= t.capacity && <span className="block text-[12px] text-accent-ink">Llena</span>}
                      </td>
                      <td className="num px-3 py-2.5 text-right">{past ? `${pct(t.attended!, n)}%` : <span className="text-muted">—</span>}</td>
                      <td className="num px-5 py-2.5 text-right">{t.rating ? t.rating.toLocaleString("es-CL", { minimumFractionDigits: 1 }) : <span className="text-muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <TrainingAdmin />

        <p className="mt-6 text-[12px] text-muted">
          Datos de ejemplo generados para la demo. {HUB.name} · {HUB.address}.
        </p>
      </main>
      </div>
    </div>
  );
}

function Sidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const nav = [
    { href: "/admin", label: "Ocupación", icon: BarChart3, active: true },
    { href: "/admin#capacitaciones", label: "Capacitaciones", icon: GraduationCap },
    { href: "/recepcion", label: "Terminal de acceso", icon: DoorOpen },
    { href: "/inicio", label: "App del socio", icon: Smartphone },
  ];
  const soon = [
    { label: "Socios", icon: Users },
    { label: "Espacios y aforo", icon: LayoutGrid },
    { label: "Charlas", icon: Mic },
  ];
  return (
    <aside className={cx("min-h-full flex-col px-3 py-5 lg:sticky lg:top-[var(--bar)] lg:h-[calc(100dvh-var(--bar))]", className)}>
      <button className="press flex h-10 items-center justify-between rounded-control border border-border bg-surface px-3 text-left">
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium">{HUB.name}</span>
          <span className="block text-[12px] text-muted">2 edificios</span>
        </span>
        <ChevronsUpDown size={14} className="text-muted" aria-hidden="true" />
      </button>
      <nav aria-label="Administración" className="mt-5 flex flex-col">
        {nav.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
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
          <Avatar name="Administración Hub" hue={200} size={28} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">Administración</p>
            <p className="truncate text-[12px] text-muted">Municipalidad de Providencia</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

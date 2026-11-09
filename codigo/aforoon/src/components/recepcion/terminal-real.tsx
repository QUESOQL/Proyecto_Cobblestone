"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Search, UserCheck } from "lucide-react";
import { formatMin } from "@/lib/data";
import { leerAF2, verificarAF2 } from "@/lib/af2";
import { supabase, toSantiago } from "@/lib/supabase";
import { Avatar, Button, CapacityTrack, Field, Pill, TopBar, Wordmark, cx } from "@/components/ui";
import type { Turno } from "./inicio-turno";
import { LectorQR } from "./lector-qr";
import { PanelLector, useLector } from "./panel-lector";
import { ERRORES_LECTURA, type Color, type LecturaBLE } from "@/lib/lector/protocolo-ble";

/*
 * Terminal real de recepción: registra accesos en Supabase a nombre del turno abierto.
 * La persona se identifica con el QR firmado de su credencial (fase 3: la cámara lee el
 * QR, este celular verifica la firma con la clave pública y acceso_qr() revisa la hora y
 * que no se haya usado), por RUT, o desde la lista de quienes tienen reserva en el bloque.
 */

type Sentido = "entrada" | "salida";
type Metodo = "nfc" | "qr" | "rut";
type Resultado = "aprobado" | "sin_reserva" | "no_enrolado" | "excepcion" | "sin_capacitacion" | "atrasado";

interface PersonaVista {
  persona_id: string;
  nombre: string;
  rut_mascara: string;
  tono: number;
  segmento: string;
  verificada: boolean;
}

interface VistaAcceso {
  acceso_id: string;
  resultado: Resultado;
  sentido: Sentido;
  metodo: Metodo;
  latencia: number | null;
  persona: PersonaVista;
  destino: string | null;
  detalle_destino: string | null;
  proxima: { destino: string; horario: string } | null;
}

interface Puerta {
  bloque: { id: string; inicio: string; fin: string } | null;
  pendientes: { reserva_id: string; destino: string; persona: PersonaVista }[];
  dentro: { zona_id: string; zona: string; dentro: number; aforo: number }[];
  excepciones: number;
  ultimos: { id: string; ocurrido_at: string; sentido: Sentido; resultado: Resultado; metodo: string; nombre: string }[];
}

const COPIA: Record<Resultado, { titulo: string; pasa: boolean; tono: "positive" | "negative" | "warning" | "accent" }> = {
  aprobado: { titulo: "Verde · pasa", pasa: true, tono: "positive" },
  excepcion: { titulo: "Verde · ingreso por excepción", pasa: true, tono: "accent" },
  sin_reserva: { titulo: "Rojo · no pasa", pasa: false, tono: "negative" },
  no_enrolado: { titulo: "Rojo · no pasa", pasa: false, tono: "warning" },
  sin_capacitacion: { titulo: "Rojo · no pasa", pasa: false, tono: "negative" },
  atrasado: { titulo: "Rojo · no pasa", pasa: false, tono: "negative" },
};

/** Lo que el guardia necesita saber, en una frase. */
function motivo(v: VistaAcceso): string {
  switch (v.resultado) {
    case "aprobado":
      return v.sentido === "salida" ? "Salida registrada." : v.destino ? `Va a ${v.destino} · ${v.detalle_destino}` : "Entrada registrada.";
    case "excepcion":
      return "Ingreso registrado como excepción, a nombre de tu turno.";
    case "sin_reserva":
      return v.proxima ? `Sin reserva en este bloque. Su próxima reserva hoy: ${v.proxima.destino}, ${v.proxima.horario}.` : "Sin reserva en este bloque.";
    case "no_enrolado":
      return "Debe completar su enrolamiento en la app.";
    case "sin_capacitacion":
      return `Falta la capacitación de ${v.destino ?? "esta máquina"}.`;
    case "atrasado":
      return "Llegó más de 20 minutos tarde: su reserva de máquina se canceló.";
  }
}

const METODO: Record<Metodo, string> = { qr: "QR", rut: "RUT", nfc: "Tarjeta" };

/** Un QR que no sirve: el guardia ve rojo y qué pedirle a la persona. */
const RECHAZOS: Record<string, string> = {
  no_af2: "No es un QR de AforoON. Pídele que abra su credencial en la app.",
  firma_invalida: "El código no es válido. Pídele que abra de nuevo su credencial.",
  qr_desconocido: "El código no es válido. Pídele que abra de nuevo su credencial.",
  qr_vencido: "El código venció. Pídele que muestre el QR actualizado (cambia cada 30 segundos).",
  qr_reutilizado: "Ese código ya se usó. Pídele que muestre el QR actualizado.",
  qr_revocado: "Esa credencial se reemplazó en otro teléfono. Pídele que abra la app en su teléfono actual.",
};

/** El color que se enciende en el anillo del lector para un resultado. */
function colorDe(v: VistaAcceso): Color {
  if (!COPIA[v.resultado].pasa) return "rojo";
  return v.sentido === "salida" ? "salida" : "verde";
}

const ERRORES: Record<string, string> = {
  sin_turno: "El turno se cerró. Vuelve a ingresar tu PIN.",
  sin_permiso: "Esta cuenta no puede registrar accesos.",
  rut_invalido: "El RUT no es válido.",
};

export function TerminalReal({ turno, cerrarTurno }: { turno: Turno; cerrarTurno: () => Promise<void> }) {
  const [sentido, setSentido] = useState<Sentido>("entrada");
  const [puerta, setPuerta] = useState<Puerta | null>(null);
  const [vista, setVista] = useState<VistaAcceso | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rut, setRut] = useState("");
  const [encontrada, setEncontrada] = useState<PersonaVista | null | "no">(null);
  const [camara, setCamara] = useState(false);
  const [avisoCamara, setAvisoCamara] = useState<string | null>(null);
  const [rechazo, setRechazo] = useState<string | null>(null);
  // Una tarjeta leída por el lector: hasta la fase 5 todavía no identifica a nadie.
  const [tarjeta, setTarjeta] = useState<{ titulo: string; texto: string } | null>(null);
  const t0 = useRef(0);
  // Claves públicas ya consultadas en este turno (una lectura repetida no vuelve a pedirla).
  const claves = useRef(new Map<string, JsonWebKey>());

  const cargar = useCallback(async () => {
    const { data } = await supabase.rpc("puerta_ahora");
    if (data) setPuerta(data as Puerta);
  }, []);

  // El estado de la puerta se refresca solo cada 15 segundos (y después de cada registro).
  useEffect(() => {
    void cargar();
    const id = setInterval(() => void cargar(), 15_000);
    return () => clearInterval(id);
  }, [cargar]);

  const fallar = async (codigo: string) => {
    setError(ERRORES[codigo] ?? "No se pudo registrar. Revisa la conexión e inténtalo de nuevo.");
    if (codigo === "sin_turno") await cerrarTurno();
  };

  const limpiar = () => {
    setError(null);
    setVista(null);
    setRechazo(null);
    setTarjeta(null);
  };

  /** Lo que llega del lector ESP32 por Bluetooth. */
  const alLeerTarjeta = (l: LecturaBLE) => {
    setCamara(false);
    limpiar();
    if (l.tipo === "error") {
      setTarjeta({ titulo: "No se pudo leer la tarjeta", texto: ERRORES_LECTURA[l.codigo] ?? "Pídele que la acerque de nuevo y la deje quieta un segundo." });
      lector.enviar(l.seq, "rojo");
      return;
    }
    const detalle = l.tipo === "sun" ? `UID ${l.uid} · lectura n.º ${l.contador}` : `UID ${l.uid}`;
    setTarjeta({
      titulo: l.tipo === "sun" ? "Tarjeta AforoON leída" : "Tarjeta leída",
      texto: `${detalle}. Las tarjetas se asignan a cada persona en la próxima etapa; por ahora identifícala con su QR o su RUT.`,
    });
    lector.enviar(l.seq, "ambar");
  };
  const lector = useLector(alLeerTarjeta);

  /** Muestra el resultado en pantalla y en el anillo del lector (si está conectado). */
  const mostrar = (v: VistaAcceso) => {
    setVista(v);
    lector.enviar(0, colorDe(v));
  };

  const abrirCamara = () => {
    limpiar();
    setAvisoCamara(null);
    setCamara(true);
  };

  /** Lo que leyó la cámara: verificar la firma aquí y registrar en la base. */
  const leerQR = async (texto: string, desde: number) => {
    setCamara(false);
    limpiar();
    setOcupado("qr");
    const rechazar = (codigo: string) => {
      setOcupado(null);
      if (RECHAZOS[codigo]) {
        setRechazo(RECHAZOS[codigo]);
        lector.enviar(0, "rojo");
      } else void fallar(codigo);
    };

    const lectura = leerAF2(texto);
    if (!lectura) return rechazar("no_af2");
    let clave = claves.current.get(lectura.cid);
    if (!clave) {
      const { data, error } = await supabase.rpc("clave_qr", { p_cid: lectura.cid });
      if (error) return rechazar(error.message);
      clave = data as JsonWebKey;
      claves.current.set(lectura.cid, clave);
    }
    if (!(await verificarAF2(clave, lectura))) return rechazar("firma_invalida");

    const { data, error } = await supabase.rpc("acceso_qr", {
      p_cid: lectura.cid,
      p_t: lectura.t,
      p_sentido: sentido,
      p_latencia: Math.round((performance.now() - desde) / 100) / 10,
    });
    if (error) {
      if (error.message === "qr_revocado") claves.current.delete(lectura.cid);
      return rechazar(error.message);
    }
    const latencia = Math.round((performance.now() - desde) / 100) / 10;
    mostrar({ ...(data as VistaAcceso), latencia });
    setOcupado(null);
    void cargar();
  };

  const registrar = async (persona: PersonaVista) => {
    setOcupado(persona.persona_id);
    setCamara(false);
    limpiar();
    t0.current = performance.now();
    const { data, error } = await supabase.rpc("registrar_acceso", {
      p_persona: persona.persona_id,
      p_metodo: "rut",
      p_sentido: sentido,
      p_latencia: null,
    });
    if (error) {
      setOcupado(null);
      return fallar(error.message);
    }
    const latencia = Math.round((performance.now() - t0.current) / 100) / 10;
    const { data: v } = await supabase.rpc("vista_acceso", { p_acceso: (data as { acceso_id: string }).acceso_id });
    if (v) mostrar({ ...(v as VistaAcceso), latencia });
    setOcupado(null);
    setEncontrada(null);
    setRut("");
    void cargar();
  };

  const excepcion = async () => {
    if (!vista) return;
    setOcupado(vista.persona.persona_id);
    const { data, error } = await supabase.rpc("permitir_excepcion", { p_persona: vista.persona.persona_id, p_metodo: vista.metodo });
    if (error) {
      setOcupado(null);
      return fallar(error.message);
    }
    const { data: v } = await supabase.rpc("vista_acceso", { p_acceso: data as string });
    if (v) mostrar(v as VistaAcceso);
    setOcupado(null);
    void cargar();
  };

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEncontrada(null);
    const { data, error } = await supabase.rpc("buscar_por_rut", { p_rut: rut });
    if (error) return fallar(error.message);
    setEncontrada(data ? (data as PersonaVista) : "no");
  };

  const totalDentro = (puerta?.dentro.reduce((a, z) => a + z.dentro, 0) ?? 0) + (puerta?.excepciones ?? 0);
  const copia = vista ? COPIA[vista.resultado] : null;

  return (
    <div className="min-h-dvh bg-ground">
      <TopBar
        title={<Wordmark sub="Terminal de acceso" />}
        action={
          <>
            <span className="hidden text-right text-[13px] md:block">
              {turno.terminal}
              {puerta?.bloque && (
                <span className="num block opacity-70">
                  Bloque {puerta.bloque.inicio}–{puerta.bloque.fin}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2 border-l border-[#333] pl-3">
              <span className="hidden text-[13px] sm:inline">
                Turno: <span className="font-medium">{turno.nombre}</span>
              </span>
              <button onClick={() => void cerrarTurno()} className="topbar-link press inline-flex">
                Cerrar turno
              </button>
            </div>
          </>
        }
      />

      <div className="mx-auto max-w-[1180px] px-4 py-4 md:px-6 md:py-6">
        <h1 className="sr-only">Terminal de acceso</h1>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-6">
            {/* Resultado */}
            <section aria-labelledby="resultado-titulo" className="overflow-hidden rounded-card border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-rule px-4 py-3 md:px-5">
                <div role="tablist" aria-label="Sentido" className="toggle">
                  {(["entrada", "salida"] as Sentido[]).map((m) => (
                    <button
                      key={m}
                      role="tab"
                      aria-selected={sentido === m}
                      onClick={() => {
                        setSentido(m);
                        setVista(null);
                        setRechazo(null);
                      }}
                      className="toggle-option press h-11 px-5 capitalize"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 md:p-5" aria-live="polite">
                {error && (
                  <p role="alert" className="mb-4 rounded-card bg-[var(--pill-negative-bg)] p-3 text-[14px] text-[var(--pill-negative-ink)]">
                    {error}
                  </p>
                )}
                {!vista && !rechazo && !tarjeta && !camara && (
                  <div className="flex flex-col items-start gap-4">
                    <div>
                      <h2 id="resultado-titulo" className="text-[24px] leading-[1.3]">
                        {ocupado === "qr" ? "Validando el QR…" : ocupado ? "Registrando…" : "Escanea el QR de la credencial"}
                      </h2>
                      <p className="mt-1 text-[14px] text-muted">También puedes buscar por RUT o elegir de la lista.</p>
                    </div>
                    {avisoCamara && (
                      <p role="status" className="text-[14px] text-[var(--pill-warning-ink)]">
                        {avisoCamara}
                      </p>
                    )}
                    {!ocupado && (
                      <Button variant="primary" size="lg" onClick={abrirCamara}>
                        <Camera size={18} aria-hidden="true" /> Escanear QR
                      </Button>
                    )}
                  </div>
                )}
                {camara && (
                  <div>
                    <h2 id="resultado-titulo" className="sr-only">
                      Leyendo QR
                    </h2>
                    <LectorQR
                      onLectura={(texto, desde) => void leerQR(texto, desde)}
                      onCerrar={(aviso) => {
                        setCamara(false);
                        setAvisoCamara(aviso ?? null);
                      }}
                    />
                  </div>
                )}
                {tarjeta && (
                  <div className="enter flex flex-col gap-4">
                    <div className="rounded-card bg-[var(--pill-warning-bg)] px-4 py-5 text-center text-[var(--pill-warning-ink)]">
                      <p id="resultado-titulo" className="text-[26px] font-medium uppercase leading-[1.2]">
                        Ámbar · revisar
                      </p>
                      <p className="num mt-1 text-[13px] opacity-80">{tarjeta.titulo} · lector ESP32</p>
                    </div>
                    <p className="card !p-4 text-[15px]">{tarjeta.texto}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="primary" onClick={abrirCamara}>
                        <Camera size={16} aria-hidden="true" /> Escanear QR
                      </Button>
                      <Button onClick={() => setTarjeta(null)}>Listo</Button>
                    </div>
                  </div>
                )}
                {rechazo && (
                  <div className="enter flex flex-col gap-4">
                    <div className="rounded-card bg-[var(--pill-negative-bg)] px-4 py-5 text-center text-[var(--pill-negative-ink)]">
                      <p id="resultado-titulo" className="text-[26px] font-medium uppercase leading-[1.2]">
                        Rojo · no pasa
                      </p>
                      <p className="num mt-1 text-[13px] opacity-80">QR no válido</p>
                    </div>
                    <p className="card !p-4 text-[15px]">{rechazo}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="primary" onClick={abrirCamara}>
                        <Camera size={16} aria-hidden="true" /> Escanear de nuevo
                      </Button>
                      <Button onClick={() => setRechazo(null)}>Listo</Button>
                    </div>
                  </div>
                )}
                {vista && copia && (
                  <div className="enter flex flex-col gap-4">
                    <div
                      className={cx(
                        "rounded-card px-4 py-5 text-center",
                        copia.pasa ? "bg-[var(--pill-positive-bg)] text-[var(--pill-positive-ink)]" : "bg-[var(--pill-negative-bg)] text-[var(--pill-negative-ink)]",
                      )}
                    >
                      <p id="resultado-titulo" className="text-[26px] font-medium uppercase leading-[1.2]">
                        {copia.titulo}
                      </p>
                      <p className="num mt-1 text-[13px] opacity-80">
                        {vista.sentido === "salida" ? "Salida" : "Entrada"} · {METODO[vista.metodo]}{vista.latencia != null ? ` · ${vista.latencia.toLocaleString("es-CL")} s` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Avatar name={vista.persona.nombre} hue={vista.persona.tono} size={64} />
                      <div className="min-w-0">
                        <p className="truncate text-[22px] leading-[1.25]">{vista.persona.nombre}</p>
                        <p className="num text-[13px] text-muted">
                          RUT {vista.persona.rut_mascara} · {vista.persona.segmento}
                        </p>
                      </div>
                    </div>
                    <p className="card !p-4 text-[15px]">{motivo(vista)}</p>
                    <div className="flex flex-wrap gap-2">
                      {vista.resultado === "sin_reserva" && (
                        <Button variant="primary" onClick={() => void excepcion()} disabled={!!ocupado}>
                          Permitir como excepción
                        </Button>
                      )}
                      {vista.metodo === "qr" && (
                        <Button variant={vista.resultado === "sin_reserva" ? "secondary" : "primary"} onClick={abrirCamara}>
                          <Camera size={16} aria-hidden="true" /> Escanear otro
                        </Button>
                      )}
                      <Button onClick={() => setVista(null)}>Listo</Button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Buscar por RUT */}
            <section aria-labelledby="rut-titulo" className="rounded-card border border-border bg-surface p-4 md:p-5">
              <h2 id="rut-titulo" className="text-[18px]">
                Buscar por RUT
              </h2>
              <form onSubmit={buscar} className="mt-3 flex items-end gap-2">
                <Field label="RUT" className="flex-1">
                  <input className="input num" inputMode="text" placeholder="12.345.678-5" value={rut} onChange={(e) => setRut(e.target.value)} />
                </Field>
                <Button type="submit" variant="primary" disabled={rut.replace(/[^0-9kK]/g, "").length < 8} aria-label="Buscar RUT">
                  <Search size={18} aria-hidden="true" />
                </Button>
              </form>
              {encontrada === "no" && <p className="mt-3 text-[14px] text-muted">No hay nadie registrado con ese RUT.</p>}
              {encontrada && encontrada !== "no" && (
                <div className="mt-3 flex items-center gap-3 rounded-card bg-raised p-3">
                  <Avatar name={encontrada.nombre} hue={encontrada.tono} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{encontrada.nombre}</p>
                    <p className="num text-[12px] text-muted">RUT {encontrada.rut_mascara}</p>
                  </div>
                  <Button variant="primary" onClick={() => void registrar(encontrada)} disabled={!!ocupado}>
                    <UserCheck size={16} aria-hidden="true" /> Registrar {sentido}
                  </Button>
                </div>
              )}
            </section>

            {/* En la puerta */}
            <section aria-labelledby="puerta-titulo">
              <div className="flex items-baseline justify-between">
                <h2 id="puerta-titulo" className="text-[18px]">
                  Con reserva en este bloque
                </h2>
                <span className="num text-[12px] text-muted">{puerta ? `${puerta.pendientes.length} por llegar` : ""}</span>
              </div>
              <ul className="mt-2 overflow-hidden rounded-card border border-border bg-surface" aria-label="Personas por llegar">
                {!puerta && <li className="px-4 py-5 text-[14px] text-muted">Cargando…</li>}
                {puerta && !puerta.bloque && <li className="px-4 py-5 text-[14px] text-muted">El Hub está fuera del horario de bloques.</li>}
                {puerta?.bloque && puerta.pendientes.length === 0 && <li className="px-4 py-5 text-[14px] text-muted">Llegaron todas las personas con reserva.</li>}
                {puerta?.pendientes.slice(0, 12).map((p) => (
                  <li key={p.reserva_id} className="flex items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0">
                    <Avatar name={p.persona.nombre} hue={p.persona.tono} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{p.persona.nombre}</p>
                      <p className="text-[12px] text-muted">{p.destino}</p>
                    </div>
                    <Button onClick={() => void registrar(p.persona)} disabled={!!ocupado} aria-label={`Registrar entrada de ${p.persona.nombre}`}>
                      Entrada
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Columna lateral */}
          <aside className="flex min-w-0 flex-col gap-6">
            <PanelLector lector={lector} />
            <section aria-labelledby="dentro-titulo" className="rounded-card border border-border bg-surface p-5">
              <h2 id="dentro-titulo" className="text-[14px] text-muted">
                Dentro del Hub ahora
              </h2>
              <p className="num mt-1 text-[36px] leading-[1.22]">
                {totalDentro}
                <span className="ml-1.5 text-[14px] text-muted">personas</span>
              </p>
              <ul className="mt-3">
                {puerta?.dentro.map((z) => (
                  <li key={z.zona_id} className="py-2.5">
                    <div className="flex items-baseline justify-between text-[13px]">
                      <span>{z.zona}</span>
                      <span className="num">
                        {z.dentro}
                        <span className="text-muted"> / {z.aforo}</span>
                      </span>
                    </div>
                    <CapacityTrack used={z.dentro} capacity={z.aforo} className="mt-1.5" label={`${z.zona}: ${z.dentro} de ${z.aforo}`} />
                  </li>
                ))}
              </ul>
              {!!puerta?.excepciones && (
                <p className="num mt-1 text-[12px] text-muted">
                  Incluye {puerta.excepciones} {puerta.excepciones === 1 ? "ingreso" : "ingresos"} por excepción hoy.
                </p>
              )}
            </section>

            <section aria-labelledby="registro-titulo">
              <h2 id="registro-titulo" className="text-[18px]">
                Registro de accesos
              </h2>
              <ul className="mt-2 overflow-hidden rounded-card border border-border bg-surface">
                {puerta?.ultimos.length === 0 && <li className="px-4 py-5 text-[13px] text-muted">Aún no hay accesos hoy.</li>}
                {puerta?.ultimos.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 border-b border-rule px-4 py-2.5 last:border-b-0">
                    <span className="num w-11 flex-none text-[13px] text-muted">{formatMin(toSantiago(a.ocurrido_at).min)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{a.nombre}</p>
                      <p className="text-[12px] text-muted">
                        {a.sentido === "entrada" ? "Entrada" : "Salida"} · {a.metodo.toUpperCase()}
                      </p>
                    </div>
                    <Pill tone={COPIA[a.resultado].tono}>{a.resultado === "aprobado" ? "OK" : a.resultado === "excepcion" ? "Excepción" : "Denegado"}</Pill>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

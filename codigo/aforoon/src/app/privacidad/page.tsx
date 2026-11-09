import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal, POR_CONFIRMAR } from "@/components/landing/legal";

/*
 * Política de privacidad de AforoON. Describe lo que la app realmente guarda hoy
 * (supabase/migrations) y los derechos de la Ley 21.719. Lo que falta definir con la
 * Municipalidad (responsable, contacto, plazos) se muestra como "Por confirmar".
 */

export const metadata: Metadata = {
  title: "Política de privacidad · AforoON",
  description: "Qué datos guarda AforoON, para qué, quién los ve y cómo ejercer tus derechos.",
};

export default function Privacidad() {
  return (
    <PaginaLegal
      titulo="Política de privacidad"
      actualizado="7 de noviembre de 2026"
      intro={
        <p>
          AforoON es la credencial digital del Hub Providencia: te registras una vez, reservas espacios y máquinas, y en la puerta te
          identificas con tu teléfono. Para eso necesitamos algunos datos tuyos. Aquí explicamos cuáles, para qué y qué puedes hacer con
          ellos, conforme a la Ley 19.628 y su reforma por la Ley 21.719 sobre protección de datos personales.
        </p>
      }
      secciones={[
        {
          titulo: "Quién es responsable",
          contenido: (
            <>
              <p>
                AforoON es un prototipo desarrollado por el Equipo Cobblestone (Proyecto Capstone 2026, Universidad Mayor) para el Hub
                Providencia, espacio de la Municipalidad de Providencia en Los Jesuitas 881.
              </p>
              <p>
                Responsable del tratamiento de los datos: {POR_CONFIRMAR}. Correo de contacto para temas de privacidad: {POR_CONFIRMAR}.
              </p>
            </>
          ),
        },
        {
          titulo: "Qué datos guardamos",
          contenido: (
            <ul className="list-disc pl-5">
              <li>
                <strong>Cuenta:</strong> tu correo electrónico. Si entras con Google, también tu nombre tal como aparece en tu cuenta de
                Google. No recibimos tu contraseña de Google.
              </li>
              <li>
                <strong>Credencial:</strong> nombre, RUT, teléfono, cómo usas el Hub (emprendimiento, estudiante, empleo, etc.), ocupación
                y motivo principal de tus visitas, y la fecha en que aceptaste esta política.
              </li>
              <li>
                <strong>Uso del Hub:</strong> tus reservas de espacios y máquinas, tus inscripciones a charlas y capacitaciones, y si las
                aprobaste.
              </li>
              <li>
                <strong>Accesos:</strong> cada vez que entras o sales, la hora, el método (QR, NFC o RUT dictado), el resultado (por
                ejemplo, si tenías reserva) y qué terminal y qué persona de recepción lo registró.
              </li>
            </ul>
          ),
        },
        {
          titulo: "Para qué los usamos",
          contenido: (
            <ul className="list-disc pl-5">
              <li>Identificarte en la puerta sin llenar un formulario en cada visita.</li>
              <li>Administrar reservas, cupos y el aforo de cada espacio.</li>
              <li>Verificar que tengas la capacitación aprobada antes de usar una máquina.</li>
              <li>
                Generar estadísticas del uso del Hub (ocupación, horas punta, perfiles de quienes vienen) para mejorar el servicio.
              </li>
            </ul>
          ),
        },
        {
          titulo: "Cómo protegemos tu RUT",
          contenido: (
            <>
              <p>
                Tu RUT se guarda <strong>cifrado</strong>. Para buscarte sin descifrarlo se usa una huella que no permite reconstruirlo, y
                lo único que se muestra es una versión enmascarada, como 17.482.***-2.
              </p>
              <p>
                Recepción ve tu nombre, tu avatar y el RUT enmascarado; nunca el RUT completo. Cada persona ve solo sus propios datos, y el
                equipo del Hub ve únicamente lo que necesita para su trabajo.
              </p>
            </>
          ),
        },
        {
          titulo: "Con quién se comparten",
          contenido: (
            <>
              <p>No vendemos ni cedemos tus datos. Para funcionar, la app usa estos proveedores, que los procesan por encargo:</p>
              <ul className="list-disc pl-5">
                <li>
                  <strong>Supabase:</strong> base de datos e inicio de sesión.
                </li>
                <li>
                  <strong>Vercel:</strong> publica la aplicación web.
                </li>
                <li>
                  <strong>Google:</strong> solo si eliges entrar con tu cuenta de Google.
                </li>
              </ul>
              <p>Algunos de estos proveedores pueden almacenar datos fuera de Chile.</p>
            </>
          ),
        },
        {
          titulo: "Cuánto tiempo los guardamos",
          contenido: (
            <>
              <p>Tus datos de cuenta y credencial se guardan mientras tengas tu cuenta. Si la borras, se eliminan junto con tus reservas e inscripciones.</p>
              <p>Plazo de conservación del registro de accesos, después del cual se anonimiza: {POR_CONFIRMAR}.</p>
            </>
          ),
        },
        {
          titulo: "Tus derechos",
          contenido: (
            <>
              <p>
                Puedes pedir acceso a tus datos, corregirlos, eliminarlos, oponerte a su uso, solicitar su portabilidad o su bloqueo
                temporal.
              </p>
              <p>
                Puedes borrar tu credencial y tus datos cuando quieras desde la app: en <Link href="/registro" className="underline">Credencial</Link>,
                botón «Borrar mis datos». Para los demás derechos, escribe al correo de contacto indicado arriba.
              </p>
            </>
          ),
        },
        {
          titulo: "Cookies y almacenamiento en tu dispositivo",
          contenido: (
            <p>
              La app guarda en tu navegador lo necesario para mantener tu sesión abierta. No usamos cookies de publicidad ni de rastreo de
              terceros.
            </p>
          ),
        },
        {
          titulo: "Cambios a esta política",
          contenido: <p>Si esta política cambia, actualizaremos la fecha de arriba y te lo avisaremos en la app antes de que el cambio empiece a regir.</p>,
        },
      ]}
    />
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal, POR_CONFIRMAR } from "@/components/landing/legal";

/*
 * Condiciones del servicio de AforoON. Recogen las reglas que la app ya aplica
 * (supabase/migrations/0002_reglas.sql) y las del Lab881 publicadas por el Hub.
 */

export const metadata: Metadata = {
  title: "Condiciones del servicio · AforoON",
  description: "Reglas para usar AforoON: cuenta, reservas, máquinas y acceso al Hub Providencia.",
};

export default function Terminos() {
  return (
    <PaginaLegal
      titulo="Condiciones del servicio"
      actualizado="7 de noviembre de 2026"
      intro={
        <p>
          Al crear tu cuenta en AforoON aceptas estas condiciones. Son las reglas para reservar y entrar al Hub Providencia con tu
          credencial digital. El uso del Hub y de AforoON es gratuito.
        </p>
      }
      secciones={[
        {
          titulo: "Tu cuenta",
          contenido: (
            <ul className="list-disc pl-5">
              <li>Tu cuenta y tu credencial son personales e intransferibles: no prestes tu QR ni tu tarjeta.</li>
              <li>Los datos que ingresas deben ser verdaderos, en especial tu nombre y tu RUT.</li>
              <li>Cuida el acceso a tu teléfono y a tu cuenta. Si pierdes una tarjeta, avisa en recepción para darla de baja.</li>
            </ul>
          ),
        },
        {
          titulo: "Reservas de espacios",
          contenido: (
            <ul className="list-disc pl-5">
              <li>Puedes reservar con hasta 6 días de anticipación y tener hasta 3 reservas activas a la vez.</li>
              <li>No puedes tener dos reservas en el mismo bloque horario.</li>
              <li>Si no vas a usar tu reserva, cancélala desde la app para que otra persona pueda ocupar el cupo.</li>
              <li>Si no llegas, el cupo se libera al terminar el bloque.</li>
            </ul>
          ),
        },
        {
          titulo: "Máquinas del Lab881 y del cowork textil",
          contenido: (
            <ul className="list-disc pl-5">
              <li>Para reservar una máquina necesitas aprobar antes su capacitación obligatoria.</li>
              <li>
                En el Lab881 tienes 15 reservas al año: 6 de 1 a 2 horas, 4 de 3 a 5 horas, 3 de 6 a 9 horas y 2 de 10 a 18 horas. Cada
                trabajo dura como máximo 18 horas.
              </li>
              <li>El uso de las máquinas es gratuito; tú aportas el material de tu proyecto.</li>
              <li>
                Si llegas 20 minutos tarde, la reserva se cancela y el retraso queda registrado. Los retrasos repetidos llevan a una
                advertencia, una amonestación, una suspensión de un mes y, finalmente, la suspensión definitiva.
              </li>
            </ul>
          ),
        },
        {
          titulo: "Ingreso al Hub",
          contenido: (
            <ul className="list-disc pl-5">
              <li>En la puerta te identificas con tu QR, tu tarjeta o tu RUT.</li>
              <li>Recepción puede comparar tu nombre y avatar con quien se presenta, y negar el ingreso si no coinciden.</li>
              <li>Recepción puede autorizar un ingreso sin reserva como excepción; esa excepción queda registrada.</li>
            </ul>
          ),
        },
        {
          titulo: "Disponibilidad del servicio",
          contenido: (
            <p>
              AforoON es un prototipo en desarrollo. Puede tener interrupciones, cambios o errores, y por eso no garantizamos que esté
              disponible en todo momento. Si la app no funciona, recepción puede registrarte con tu RUT.
            </p>
          ),
        },
        {
          titulo: "Tus datos",
          contenido: (
            <p>
              Cómo usamos y protegemos tus datos está explicado en la <Link href="/privacidad" className="underline">Política de privacidad</Link>.
            </p>
          ),
        },
        {
          titulo: "Cambios y contacto",
          contenido: (
            <>
              <p>Si estas condiciones cambian, actualizaremos la fecha de arriba y te lo avisaremos en la app.</p>
              <p>Contacto: {POR_CONFIRMAR}. Estas condiciones se rigen por las leyes de Chile.</p>
            </>
          ),
        },
      ]}
    />
  );
}

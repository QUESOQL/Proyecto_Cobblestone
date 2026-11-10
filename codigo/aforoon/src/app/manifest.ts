import type { MetadataRoute } from "next";

/*
 * Manifiesto web: el nombre y el logo que usa Chrome en Android al agregar AforoON a la
 * pantalla de inicio. Los íconos se generan desde el logotipo (public/icons).
 * display "browser": el acceso directo abre la misma página en Chrome, así el celular del
 * guardia puede anclar /recepcion y un socio /credencial.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AforoON · Hub Providencia",
    short_name: "AforoON",
    description: "Credencial, reservas y control de aforo del Hub Providencia.",
    start_url: "/inicio",
    display: "browser",
    background_color: "#000000",
    theme_color: "#000000",
    lang: "es-CL",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

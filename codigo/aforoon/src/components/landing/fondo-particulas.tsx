"use client";

import { Floating3DParticles } from "./particulas";

/*
 * Fondo de la landing: partículas grises y negras fijas detrás de todo. La landing lleva la
 * clase .lp--particulas (fondo transparente y paneles translúcidos, ver landing.css), así que
 * el blanco lo pone el <body>.
 */
export function FondoParticulas() {
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }}>
      <Floating3DParticles quantity={140} color="#9a9a9a" size={5} opacity={0.35} drift={0.35} depth={0.6} />
      <Floating3DParticles quantity={90} color="#111111" size={3} opacity={0.3} drift={0.25} depth={0.6} />
    </div>
  );
}

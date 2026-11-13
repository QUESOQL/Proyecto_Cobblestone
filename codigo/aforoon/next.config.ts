import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // En desarrollo, las pruebas escriben capturas y resultados dentro del proyecto. Si el
  // servidor las vigila, se recompila a mitad de una petición y a veces responde 500
  // ("Unexpected end of JSON input"). Esas carpetas no son código: no se vigilan.
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.git/**", "**/.next/**", "**/tests/**", "**/test-results/**", "**/.playwright-mcp/**", "**/firmware/**", "**/assets/**"],
      };
    }
    return config;
  },
};

export default nextConfig;

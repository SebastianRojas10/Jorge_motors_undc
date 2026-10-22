import { readFileSync, existsSync } from "node:fs";

// Carga .env sin dependencias extra (Prisma ya lo lee por su cuenta).
if (existsSync(".env")) {
  for (const linea of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

export const config = {
  puerto: Number(process.env.PORT ?? 3000),
  jwtSecreto: process.env.JWT_SECRET ?? "cambia-esta-clave-en-produccion",
  jwtExpira: "8h",
  origenCors: (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(","),
};

import { PrismaClient } from "@prisma/client";

// Singleton: una sola instancia de PrismaClient para todos los módulos.
// En desarrollo, `tsx watch` recarga el código; guardarla en globalThis evita
// abrir una conexión nueva en cada recarga.
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalParaPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = prisma;
